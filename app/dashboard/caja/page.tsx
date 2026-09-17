'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  DollarSign, 
  Coins, 
  Calendar, 
  Printer, 
  CreditCard, 
  Smartphone, 
  Wallet, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  ArrowDownRight, 
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { getCashReport, CashReportResult } from '@/app/actions/cash-register';
import { formatUSD, formatVES } from '@/lib/currency';

export default function CajaPage() {
  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [report, setReport] = useState<CashReportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchReport = (dateStr: string) => {
    startTransition(async () => {
      setErrorMessage(null);
      const res = await getCashReport({ from: dateStr, to: dateStr });
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setErrorMessage(res.error || 'Error al obtener el reporte');
      }
    });
  };

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header y Selector de Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
            <Receipt className="w-4 h-4" />
            Módulo de Tesorería & Arqueo
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Arqueo y Cierre Diario de Caja
          </h1>
          <p className="text-xs text-slate-500">
            Consolidación multimoneda, desglose por canal de cobro y conciliación de transacciones.
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cierre</span>
          </button>
        </div>
      </div>

      {isPending && (
        <div className="py-12 flex justify-center items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          <span>Calculando balance de caja...</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {report && !isPending && (
        <div className="space-y-6">
          {/* 1. TARJETAS KPI RESUMEN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Consolidado en USD */}
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white p-5 rounded-2xl shadow-md space-y-2">
              <div className="flex items-center justify-between opacity-80 text-xs font-medium uppercase">
                <span>Total Recaudado (USD)</span>
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-3xl font-mono font-extrabold tracking-tight">
                {formatUSD(report.totalUsd)}
              </h3>
              <p className="text-[11px] opacity-75">Contravalor consolidado de todos los pagos</p>
            </div>

            {/* KPI 2: Total en Bolívares Recibidos */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                <span>Total Cobrado en Bolívares</span>
                <Coins className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-mono font-bold text-slate-900">
                {formatVES(report.totalesMonedaOriginal.totalOriginalVes)}
              </h3>
              <p className="text-[11px] text-slate-500">Efectivo Bs + Pago Móvil + Punto</p>
            </div>

            {/* KPI 3: Total en Divisas Físicas / Digitales */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                <span>Total Divisas Originales</span>
                <Wallet className="w-5 h-5 text-brand-600" />
              </div>
              <h3 className="text-2xl font-mono font-bold text-slate-900">
                {formatUSD(report.totalesMonedaOriginal.totalOriginalUsd)}
              </h3>
              <p className="text-[11px] text-slate-500">Efectivo USD + Zelle + Binance</p>
            </div>

            {/* KPI 4: Órdenes y Métricas */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                <span>Órdenes Cobradas</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-mono font-bold text-slate-900">
                  {report.metricasOrdenes.totalOrdenesCobradas}
                </h3>
                <span className="text-xs text-slate-400">
                  / {report.metricasOrdenes.ordenesTotalesPeriodo} totales
                </span>
              </div>
              <div className="flex gap-2 text-[10px] font-semibold">
                {report.metricasOrdenes.ordenesParciales > 0 && (
                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    {report.metricasOrdenes.ordenesParciales} parciales
                  </span>
                )}
                {report.metricasOrdenes.ordenesPendientes > 0 && (
                  <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                    {report.metricasOrdenes.ordenesPendientes} pendientes
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. DESGLOSE DETALLADO POR MÉTODO DE PAGO */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Desglose Exacto por Canal de Cobro
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Efectivo USD */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">
                  💵 Efectivo USD
                </span>
                <span className="text-xl font-mono font-bold text-slate-900 block">
                  {formatUSD(report.desglose.efectivoUsd)}
                </span>
                <span className="text-[10px] text-slate-500">En bóveda / caja física</span>
              </div>

              {/* Pago Móvil */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">
                  📱 Pago Móvil (VES)
                </span>
                <span className="text-xl font-mono font-bold text-slate-900 block">
                  {formatVES(report.desglose.pagoMovil.totalBs)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  ≈ {formatUSD(report.desglose.pagoMovil.equivalenteUsd)} ({report.desglose.pagoMovil.referencias.length} transacciones)
                </span>
              </div>

              {/* Punto de Venta */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">
                  💳 Punto de Venta (POS)
                </span>
                <span className="text-xl font-mono font-bold text-slate-900 block">
                  {formatVES(report.desglose.puntoDeVenta.totalBs)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  ≈ {formatUSD(report.desglose.puntoDeVenta.equivalenteUsd)}
                </span>
              </div>

              {/* Zelle */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">
                  ⚡ Zelle
                </span>
                <span className="text-xl font-mono font-bold text-slate-900 block">
                  {formatUSD(report.desglose.zelle.totalUsd)}
                </span>
                <span className="text-[10px] text-slate-500">Cuentas internacionales</span>
              </div>

              {/* Binance USDT */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">
                  🟡 Binance USDT
                </span>
                <span className="text-xl font-mono font-bold text-slate-900 block">
                  {formatUSD(report.desglose.binanceUsdt.totalUsd)}
                </span>
                <span className="text-[10px] text-slate-500">Criptoactivos</span>
              </div>

              {/* Efectivo Bolívares */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">
                  🪙 Efectivo Bolívares
                </span>
                <span className="text-xl font-mono font-bold text-slate-900 block">
                  {formatVES(report.desglose.efectivoBs)}
                </span>
                <span className="text-[10px] text-slate-500">Billetes en caja</span>
              </div>
            </div>
          </div>

          {/* 3. TABLA DE TRANSACCIONES DEL DÍA */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Auditoría de Transacciones ({report.transacciones.length})
              </h2>
            </div>

            {report.transacciones.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No hay transacciones registradas para la fecha seleccionada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <tr>
                      <th className="py-3 px-4">Hora</th>
                      <th className="py-3 px-4">N° Orden</th>
                      <th className="py-3 px-4">Paciente</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4">Monto Original</th>
                      <th className="py-3 px-4">Referencia</th>
                      <th className="py-3 px-4 text-right">Equivalente USD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.transacciones.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {new Date(t.createdAt).toLocaleTimeString('es-VE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {t.codigoOrden}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {t.pacienteNombre}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {t.pacienteCedula}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                            {t.metodoPago.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {t.monedaOriginal === 'USD'
                            ? formatUSD(t.montoOriginal)
                            : formatVES(t.montoOriginal)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {t.referencia || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-brand-700 text-right">
                          {formatUSD(t.montoEquivalenteUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
