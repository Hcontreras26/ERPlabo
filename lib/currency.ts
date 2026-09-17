import { Decimal } from 'decimal.js';

// Configuración de precisión decimal para transacciones financieras
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type MonedaTipo = 'USD' | 'VES';

export type MetodoPagoTipo =
  | 'EFECTIVO_USD'
  | 'EFECTIVO_BS'
  | 'PAGO_MOVIL'
  | 'PUNTO_DE_VENTA'
  | 'ZELLE'
  | 'BINANCE_USDT'
  | 'TRANSFERENCIA_BS';

export interface PaymentInput {
  metodoPago: MetodoPagoTipo;
  monedaOriginal: MonedaTipo;
  montoOriginal: number | string | Decimal;
  tasaCambio: number | string | Decimal; // Tasa aplicada a esta transacción
  referencia?: string;
  notas?: string;
}

export interface PaymentCalculatedItem extends PaymentInput {
  montoEquivalenteUsd: Decimal;
  montoEquivalenteBs: Decimal;
}

export interface PaymentSplitSummary {
  totalOrdenUsd: Decimal;
  tasaBcvOrden: Decimal;
  totalOrdenBs: Decimal;
  
  totalPagadoUsd: Decimal;
  totalPagadoBs: Decimal;
  
  saldoPendienteUsd: Decimal;
  saldoPendienteBs: Decimal;
  
  vueltoUsd: Decimal;
  vueltoBs: Decimal;
  
  estadoPago: 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
  estaCompletamentePagado: boolean;
  
  desglosePagos: PaymentCalculatedItem[];
}

/**
 * Convierte un monto en USD a VES según una tasa BCV
 */
export function usdToVes(
  montoUsd: number | string | Decimal,
  tasaBcv: number | string | Decimal
): Decimal {
  const usd = new Decimal(montoUsd || 0);
  const tasa = new Decimal(tasaBcv || 1);
  return usd.mul(tasa).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Convierte un monto en VES a USD según una tasa de cambio
 */
export function vesToUsd(
  montoBs: number | string | Decimal,
  tasa: number | string | Decimal
): Decimal {
  const bs = new Decimal(montoBs || 0);
  const t = new Decimal(tasa || 1);
  if (t.isZero()) throw new Error('La tasa de cambio no puede ser 0');
  return bs.div(t).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Normaliza cualquier pago individual a su contravalor en USD y VES
 */
export function normalizePaymentItem(payment: PaymentInput): PaymentCalculatedItem {
  const monto = new Decimal(payment.montoOriginal || 0);
  const tasa = new Decimal(payment.tasaCambio || 1);

  let equivalenteUsd: Decimal;
  let equivalenteBs: Decimal;

  if (payment.monedaOriginal === 'USD') {
    equivalenteUsd = monto.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    equivalenteBs = monto.mul(tasa).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  } else {
    // Moneda es VES
    equivalenteBs = monto.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    equivalenteUsd = tasa.isZero() ? new Decimal(0) : monto.div(tasa).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  return {
    ...payment,
    montoEquivalenteUsd: equivalenteUsd,
    montoEquivalenteBs: equivalenteBs,
  };
}

/**
 * Calcula el saldo pendiente y resumen de una orden sumando un array de pagos
 */
export function calculatePendingBalance(
  totalOrdenUsdInput: number | string | Decimal,
  tasaBcvInput: number | string | Decimal,
  pagos: PaymentInput[]
): PaymentSplitSummary {
  return calculatePaymentSplitSummary(totalOrdenUsdInput, tasaBcvInput, pagos);
}

/**
 * Cuadre y conciliación de pagos divididos (Split Payments) para una orden.
 * Soporta combinación de USD en efectivo, Pago Móvil, Zelle, Punto de Venta, etc.
 */
export function calculatePaymentSplitSummary(
  totalOrdenUsdInput: number | string | Decimal,
  tasaBcvInput: number | string | Decimal,
  pagos: PaymentInput[]
): PaymentSplitSummary {
  const totalOrdenUsd = new Decimal(totalOrdenUsdInput || 0).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const tasaBcv = new Decimal(tasaBcvInput || 1);
  const totalOrdenBs = usdToVes(totalOrdenUsd, tasaBcv);

  const desglosePagos: PaymentCalculatedItem[] = [];
  let totalPagadoUsd = new Decimal(0);
  let totalPagadoBs = new Decimal(0);

  for (const pago of pagos) {
    const itemCalculado = normalizePaymentItem(pago);
    desglosePagos.push(itemCalculado);
    totalPagadoUsd = totalPagadoUsd.add(itemCalculado.montoEquivalenteUsd);
    totalPagadoBs = totalPagadoBs.add(itemCalculado.montoEquivalenteBs);
  }

  // Tolerancia de centavos: $0.009
  const diferenciaUsd = totalOrdenUsd.minus(totalPagadoUsd);
  const EPSILON = new Decimal('0.01');

  let saldoPendienteUsd = new Decimal(0);
  let saldoPendienteBs = new Decimal(0);
  let vueltoUsd = new Decimal(0);
  let vueltoBs = new Decimal(0);
  let estadoPago: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' = 'PENDIENTE';

  if (diferenciaUsd.abs().lessThan(EPSILON) || diferenciaUsd.isNegative()) {
    // Pagado totalmente o con vuelto
    estadoPago = 'PAGADO';
    saldoPendienteUsd = new Decimal(0);
    saldoPendienteBs = new Decimal(0);

    if (diferenciaUsd.isNegative()) {
      vueltoUsd = diferenciaUsd.abs().toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      vueltoBs = vueltoUsd.mul(tasaBcv).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }
  } else if (totalPagadoUsd.greaterThan(0)) {
    // Pago parcial
    estadoPago = 'PARCIAL';
    saldoPendienteUsd = diferenciaUsd.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    saldoPendienteBs = saldoPendienteUsd.mul(tasaBcv).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  } else {
    // Ningún abono
    estadoPago = 'PENDIENTE';
    saldoPendienteUsd = totalOrdenUsd;
    saldoPendienteBs = totalOrdenBs;
  }

  return {
    totalOrdenUsd,
    tasaBcvOrden: tasaBcv,
    totalOrdenBs,
    totalPagadoUsd: totalPagadoUsd.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalPagadoBs: totalPagadoBs.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    saldoPendienteUsd,
    saldoPendienteBs,
    vueltoUsd,
    vueltoBs,
    estadoPago,
    estaCompletamentePagado: estadoPago === 'PAGADO',
    desglosePagos,
  };
}

/**
 * Formateador de moneda para Bolívares (Formato: Bs. 1.234,56)
 */
export function formatVES(amount: number | string | Decimal): string {
  const dec = new Decimal(amount || 0).toNumber();
  const formatted = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dec);
  return `Bs. ${formatted}`;
}

/**
 * Formateador de moneda para Dólares (Formato: $ 1,234.56)
 */
export function formatUSD(amount: number | string | Decimal): string {
  const dec = new Decimal(amount || 0).toNumber();
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dec);
  return `$ ${formatted}`;
}
