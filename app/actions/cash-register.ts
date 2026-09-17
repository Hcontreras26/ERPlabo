'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { Decimal } from 'decimal.js';

export interface CashReportDateRange {
  from: string | Date;
  to: string | Date;
  branchId?: string | null;
}

export interface PaymentTransactionItem {
  id: string;
  orderId: string;
  codigoOrden: string;
  pacienteNombre: string;
  pacienteCedula: string;
  metodoPago: string;
  monedaOriginal: string;
  montoOriginal: number;
  tasaCambio: number;
  montoEquivalenteUsd: number;
  referencia?: string | null;
  notas?: string | null;
  createdAt: string;
}

export interface CashReportResult {
  totalUsd: number;
  totalVesConsolidado: number;
  
  desglose: {
    efectivoUsd: number;
    efectivoBs: number;
    pagoMovil: {
      totalBs: number;
      equivalenteUsd: number;
      referencias: string[];
    };
    puntoDeVenta: {
      totalBs: number;
      equivalenteUsd: number;
    };
    zelle: {
      totalUsd: number;
    };
    binanceUsdt: {
      totalUsd: number;
    };
    transferenciaBs: {
      totalBs: number;
      equivalenteUsd: number;
    };
  };

  totalesMonedaOriginal: {
    totalOriginalUsd: number; // Efectivo USD + Zelle + Binance
    totalOriginalVes: number; // Efectivo Bs + Pago Móvil + Punto + Transferencia
  };

  metricasOrdenes: {
    totalOrdenesCobradas: number;
    ordenesPendientes: number;
    ordenesParciales: number;
    ordenesTotalesPeriodo: number;
  };

  transacciones: PaymentTransactionItem[];
}

export async function getCashReport(dateRange: CashReportDateRange): Promise<{
  success: boolean;
  data?: CashReportResult;
  error?: string;
}> {
  try {
    const session = await requireAuth();
    const tenantId = session.tenantId;

    const startDate = new Date(dateRange.from);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);

    // 1. Obtener pagos en el rango de fechas filtrados por tenantId (y opcionalmente branchId)
    const payments = await prisma.payment.findMany({
      where: {
        tenantId,
        ...(dateRange.branchId ? { branchId: dateRange.branchId } : {}),
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        order: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 2. Obtener estadísticas de órdenes del período filtradas por tenantId (y opcionalmente branchId)
    const ordersInPeriod = await prisma.order.findMany({
      where: {
        tenantId,
        ...(dateRange.branchId ? { branchId: dateRange.branchId } : {}),
        fechaCreacion: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        estadoPago: true,
      },
    });

    // 3. Cálculos y agregaciones de alta precisión
    let totalUsdDec = new Decimal(0);
    let efectivoUsdDec = new Decimal(0);
    let efectivoBsDec = new Decimal(0);
    
    let pagoMovilBsDec = new Decimal(0);
    let pagoMovilUsdDec = new Decimal(0);
    const pagoMovilRefs: string[] = [];

    let puntoVentaBsDec = new Decimal(0);
    let puntoVentaUsdDec = new Decimal(0);

    let zelleUsdDec = new Decimal(0);
    let binanceUsdDec = new Decimal(0);

    let transfBsDec = new Decimal(0);
    let transfUsdDec = new Decimal(0);

    const transacciones: PaymentTransactionItem[] = [];
    const uniqueOrderIds = new Set<string>();

    for (const p of payments) {
      const montoOriginal = new Decimal(p.montoOriginal.toString());
      const montoUsd = new Decimal(p.montoEquivalenteUsd.toString());
      
      totalUsdDec = totalUsdDec.add(montoUsd);
      uniqueOrderIds.add(p.orderId);

      transacciones.push({
        id: p.id,
        orderId: p.orderId,
        codigoOrden: p.order.codigoOrden,
        pacienteNombre: p.order.patient.nombreCompleto,
        pacienteCedula: p.order.patient.cedula,
        metodoPago: p.metodoPago,
        monedaOriginal: p.monedaOriginal,
        montoOriginal: montoOriginal.toNumber(),
        tasaCambio: Number(p.tasaCambio),
        montoEquivalenteUsd: montoUsd.toNumber(),
        referencia: p.referencia,
        notas: p.notas,
        createdAt: p.createdAt.toISOString(),
      });

      switch (p.metodoPago) {
        case 'EFECTIVO_USD':
          efectivoUsdDec = efectivoUsdDec.add(montoOriginal);
          break;
        case 'EFECTIVO_BS':
          efectivoBsDec = efectivoBsDec.add(montoOriginal);
          break;
        case 'PAGO_MOVIL':
          pagoMovilBsDec = pagoMovilBsDec.add(montoOriginal);
          pagoMovilUsdDec = pagoMovilUsdDec.add(montoUsd);
          if (p.referencia) pagoMovilRefs.push(p.referencia);
          break;
        case 'PUNTO_DE_VENTA':
          puntoVentaBsDec = puntoVentaBsDec.add(montoOriginal);
          puntoVentaUsdDec = puntoVentaUsdDec.add(montoUsd);
          break;
        case 'ZELLE':
          zelleUsdDec = zelleUsdDec.add(montoOriginal);
          break;
        case 'BINANCE_USDT':
          binanceUsdDec = binanceUsdDec.add(montoOriginal);
          break;
        case 'TRANSFERENCIA_BS':
          transfBsDec = transfBsDec.add(montoOriginal);
          transfUsdDec = transfUsdDec.add(montoUsd);
          break;
      }
    }

    const totalOriginalUsd = efectivoUsdDec.add(zelleUsdDec).add(binanceUsdDec).toNumber();
    const totalOriginalVes = efectivoBsDec.add(pagoMovilBsDec).add(puntoVentaBsDec).add(transfBsDec).toNumber();

    const ordenesPendientes = ordersInPeriod.filter((o) => o.estadoPago === 'PENDIENTE').length;
    const ordenesParciales = ordersInPeriod.filter((o) => o.estadoPago === 'PARCIAL').length;

    return {
      success: true,
      data: {
        totalUsd: totalUsdDec.toDecimalPlaces(2).toNumber(),
        totalVesConsolidado: totalOriginalVes,
        desglose: {
          efectivoUsd: efectivoUsdDec.toDecimalPlaces(2).toNumber(),
          efectivoBs: efectivoBsDec.toDecimalPlaces(2).toNumber(),
          pagoMovil: {
            totalBs: pagoMovilBsDec.toDecimalPlaces(2).toNumber(),
            equivalenteUsd: pagoMovilUsdDec.toDecimalPlaces(2).toNumber(),
            referencias: pagoMovilRefs,
          },
          puntoDeVenta: {
            totalBs: puntoVentaBsDec.toDecimalPlaces(2).toNumber(),
            equivalenteUsd: puntoVentaUsdDec.toDecimalPlaces(2).toNumber(),
          },
          zelle: {
            totalUsd: zelleUsdDec.toDecimalPlaces(2).toNumber(),
          },
          binanceUsdt: {
            totalUsd: binanceUsdDec.toDecimalPlaces(2).toNumber(),
          },
          transferenciaBs: {
            totalBs: transfBsDec.toDecimalPlaces(2).toNumber(),
            equivalenteUsd: transfUsdDec.toDecimalPlaces(2).toNumber(),
          },
        },
        totalesMonedaOriginal: {
          totalOriginalUsd,
          totalOriginalVes,
        },
        metricasOrdenes: {
          totalOrdenesCobradas: uniqueOrderIds.size,
          ordenesPendientes,
          ordenesParciales,
          ordenesTotalesPeriodo: ordersInPeriod.length,
        },
        transacciones,
      },
    };
  } catch (error: any) {
    console.error('Error generando arqueo de caja:', error);
    return {
      success: false,
      error: error.message || 'Error al consultar transacciones de caja',
    };
  }
}
