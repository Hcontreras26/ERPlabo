'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function getOrderForLab(orderId: string) {
  try {
    const session = await requireAuth();
    const tenantId = session.tenantId;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        patient: true,
        items: {
          include: {
            test: {
              include: {
                parameters: {
                  orderBy: { ordenVisualizacion: 'asc' },
                },
              },
            },
          },
        },
        results: {
          include: {
            testParameter: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: 'Orden no encontrada o no pertenece a este laboratorio', order: null };
    }

    return {
      success: true,
      order: {
        ...order,
        totalUsd: Number(order.totalUsd),
        tasaBcv: Number(order.tasaBcv),
        totalBs: Number(order.totalBs),
      },
    };
  } catch (error: any) {
    console.error('Error cargando orden para laboratorio:', error);
    return { success: false, error: error.message || 'Error al obtener orden', order: null };
  }
}

const updateResultsSchema = z.object({
  orderId: z.string().uuid(),
  results: z.array(
    z.object({
      id: z.string().uuid(),
      valor: z.string(),
      fueraDeRango: z.boolean(),
      observaciones: z.string().optional().nullable(),
    })
  ),
});

export async function saveOrderResultsDraft(input: z.infer<typeof updateResultsSchema>) {
  try {
    const session = await requireAuth();
    const tenantId = session.tenantId;

    const validated = updateResultsSchema.parse(input);

    // Verificar que la orden pertenezca al tenant
    const order = await prisma.order.findFirst({
      where: { id: validated.orderId, tenantId },
      select: { id: true },
    });

    if (!order) {
      return { success: false, error: 'Orden no válida para este laboratorio' };
    }

    for (const r of validated.results) {
      await prisma.orderResult.update({
        where: { id: r.id },
        data: {
          valor: r.valor,
          fueraDeRango: r.fueraDeRango,
          observaciones: r.observaciones || null,
        },
      });
    }

    revalidatePath(`/dashboard/laboratorio/${validated.orderId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error guardando borrador de resultados:', error);
    return { success: false, error: error.message || 'Error al guardar resultados' };
  }
}

export async function validateAndSignOrder(orderId: string, bioanalistaNombre: string) {
  try {
    const session = await requireAuth();
    const tenantId = session.tenantId;

    if (!bioanalistaNombre || bioanalistaNombre.trim().length < 3) {
      return { success: false, error: 'Debe indicar el nombre y credencial del bioanalista' };
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true },
    });

    if (!order) {
      return { success: false, error: 'Orden no válida para este laboratorio' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Validar todos los resultados de la orden
      await tx.orderResult.updateMany({
        where: { orderId },
        data: {
          validado: true,
          validadoPor: bioanalistaNombre.trim(),
          fechaValidacion: new Date(),
        },
      });

      // 2. Cambiar estado de la orden a VALIDADO
      await tx.order.update({
        where: { id: orderId },
        data: {
          estado: 'VALIDADO',
        },
      });
    });

    revalidatePath(`/dashboard/laboratorio/${orderId}`);
    revalidatePath('/dashboard/recepcion');

    return { success: true };
  } catch (error: any) {
    console.error('Error al validar y firmar orden:', error);
    return { success: false, error: error.message || 'Error al validar la orden' };
  }
}
