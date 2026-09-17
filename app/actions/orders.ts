'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { calculatePaymentSplitSummary, MetodoPagoTipo, MonedaTipo } from '@/lib/currency';
import { requireAuth } from '@/lib/auth';
import { Decimal } from 'decimal.js';

const paymentItemSchema = z.object({
  metodoPago: z.enum([
    'EFECTIVO_USD',
    'EFECTIVO_BS',
    'PAGO_MOVIL',
    'PUNTO_DE_VENTA',
    'ZELLE',
    'BINANCE_USDT',
    'TRANSFERENCIA_BS',
  ]),
  monedaOriginal: z.enum(['USD', 'VES']),
  montoOriginal: z.number().positive('El monto debe ser mayor a 0'),
  tasaCambio: z.number().positive('La tasa de cambio debe ser mayor a 0'),
  referencia: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

const orderItemSchema = z.object({
  testId: z.string().uuid('ID de examen inválido'),
  precioUnitarioUsd: z.number().min(0, 'El precio no puede ser negativo'),
});

export const createOrderSchema = z.object({
  patientId: z.string().uuid('ID de paciente requerido'),
  branchId: z.string().uuid('ID de sucursal inválido').optional().nullable(),
  medicoTratante: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  tasaBcv: z.number().positive('La tasa BCV debe ser mayor a 0'),
  items: z.array(orderItemSchema).min(1, 'Debe incluir al menos un examen'),
  payments: z.array(paymentItemSchema),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Server Action para registrar una orden con aislamiento completo por Tenant y Sucursal.
 */
export async function createOrder(input: CreateOrderInput) {
  try {
    // 1. Obtener sesión autenticada y tenantId
    const session = await requireAuth();
    const tenantId = session.tenantId;

    // 2. Validación estricta con Zod
    const validated = createOrderSchema.parse(input);

    // 3. Ejecutar todo en una sola transacción prisma.$transaction
    const result = await prisma.$transaction(async (tx) => {
      // 3.0 Resolver branchId (del input, de la sesión o primera sucursal activa del tenant)
      let branchId = validated.branchId || session.branchId;
      if (!branchId) {
        const primaryBranch = await tx.branch.findFirst({
          where: { tenantId },
          select: { id: true },
        });
        if (!primaryBranch) {
          throw new Error('No se encontró una sucursal configurada para este laboratorio.');
        }
        branchId = primaryBranch.id;
      }

      // 3.1 Generar correlativo único ORD-YYYY-XXXX aislado por tenantId
      const currentYear = new Date().getFullYear();
      const prefix = `ORD-${currentYear}-`;

      const lastOrder = await tx.order.findFirst({
        where: {
          tenantId,
          codigoOrden: {
            startsWith: prefix,
          },
        },
        orderBy: {
          codigoOrden: 'desc',
        },
        select: {
          codigoOrden: true,
        },
      });

      let nextCorrelative = 1;
      if (lastOrder && lastOrder.codigoOrden) {
        const parts = lastOrder.codigoOrden.split('-');
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
          nextCorrelative = lastNum + 1;
        }
      }

      const codigoOrden = `${prefix}${String(nextCorrelative).padStart(4, '0')}`;

      // 3.2 Calcular totales financieros
      const totalUsdDecimal = validated.items.reduce(
        (acc, item) => acc.plus(new Decimal(item.precioUnitarioUsd)),
        new Decimal(0)
      );
      const totalUsd = totalUsdDecimal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
      const tasaBcvDecimal = new Decimal(validated.tasaBcv);
      const totalBsDecimal = totalUsdDecimal.mul(tasaBcvDecimal).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      const totalBs = totalBsDecimal.toNumber();

      // 3.3 Conciliar pagos y calcular estado de pago
      const paymentSummary = calculatePaymentSplitSummary(
        totalUsd,
        validated.tasaBcv,
        validated.payments.map((p) => ({
          metodoPago: p.metodoPago as MetodoPagoTipo,
          monedaOriginal: p.monedaOriginal as MonedaTipo,
          montoOriginal: p.montoOriginal,
          tasaCambio: p.tasaCambio,
          referencia: p.referencia || undefined,
          notas: p.notas || undefined,
        }))
      );

      const estadoPagoFinal = paymentSummary.estadoPago;

      // 3.4 Crear la Orden con tenantId y branchId
      const order = await tx.order.create({
        data: {
          tenantId,
          branchId,
          codigoOrden,
          patientId: validated.patientId,
          medicoTratante: validated.medicoTratante || null,
          observaciones: validated.observaciones || null,
          totalUsd,
          tasaBcv: validated.tasaBcv,
          totalBs,
          estado: 'EN_PROCESO',
          estadoPago: estadoPagoFinal,
        },
      });

      // 3.5 Insertar OrderItems
      for (const item of validated.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            testId: item.testId,
            precioUnitarioUsd: item.precioUnitarioUsd,
          },
        });
      }

      // 3.6 Registrar pagos vinculados al tenantId y branchId
      if (paymentSummary.desglosePagos.length > 0) {
        for (const p of paymentSummary.desglosePagos) {
          await tx.payment.create({
            data: {
              tenantId,
              branchId,
              orderId: order.id,
              metodoPago: p.metodoPago,
              monedaOriginal: p.monedaOriginal,
              montoOriginal: new Decimal(p.montoOriginal).toDecimalPlaces(2).toNumber(),
              tasaCambio: new Decimal(p.tasaCambio).toDecimalPlaces(4).toNumber(),
              montoEquivalenteUsd: p.montoEquivalenteUsd.toNumber(),
              referencia: p.referencia || null,
              notas: p.notas || null,
            },
          });
        }
      }

      // 3.7 Pre-crear registros vacíos en OrderResult
      const testIds = validated.items.map((i) => i.testId);
      const testParameters = await tx.testParameter.findMany({
        where: {
          testId: { in: testIds },
        },
        orderBy: {
          ordenVisualizacion: 'asc',
        },
      });

      if (testParameters.length > 0) {
        for (const param of testParameters) {
          await tx.orderResult.create({
            data: {
              orderId: order.id,
              testParameterId: param.id,
              valor: param.valorPorDefecto || '',
              fueraDeRango: false,
              observaciones: null,
              validado: false,
            },
          });
        }
      }

      return {
        orderId: order.id,
        codigoOrden: order.codigoOrden,
        totalUsd: order.totalUsd,
        totalBs: order.totalBs,
        estadoPago: order.estadoPago,
      };
    });

    // 4. Revalidar rutas
    revalidatePath('/dashboard/recepcion');
    revalidatePath('/dashboard/recepcion/nueva');
    revalidatePath(`/dashboard/laboratorio/${result.orderId}`);

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error('Error al crear orden en transaction:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Error de validación: ' + error.errors.map((e) => e.message).join(', '),
      };
    }
    return {
      success: false,
      error: error.message || 'Error interno al registrar la orden.',
    };
  }
}
