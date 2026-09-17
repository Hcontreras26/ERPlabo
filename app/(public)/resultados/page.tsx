'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Search, 
  FileDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FlaskConical, 
  User, 
  Calendar, 
  ShieldCheck, 
  PhoneCall,
  Sparkles
} from 'lucide-react';
import { searchPatientPublicOrder, PublicOrderSearchResult } from '@/app/actions/public-results';

export default function ConsultaResultadosPage() {
  const [isPending, startTransition] = useTransition();
  const [cedula, setCedula] = useState('');
  const [codigoOrden, setCodigoOrden] = useState('');
  const [resultData, setResultData] = useState<PublicOrderSearchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula.trim() || !codigoOrden.trim()) return;

    setErrorMessage(null);
    setResultData(null);

    startTransition(async () => {
      const res = await searchPatientPublicOrder({
        cedula: cedula.trim(),
        codigoOrden: codigoOrden.trim(),
      });

      if (res.success && res.data) {
        setResultData(res.data);
      } else {
        setErrorMessage(res.error || 'No se encontraron resultados');
      }
    });
  };

  const handleQuickDemo = (demoCedula: string, demoCodigo: string) => {
    setCedula(demoCedula);
    setCodigoOrden(demoCodigo);
    setErrorMessage(null);
    setResultData(null);

    startTransition(async () => {
      const res = await searchPatientPublicOrder({
        cedula: demoCedula,
        codigoOrden: demoCodigo,
      });
      if (res.success && res.data) {
        setResultData(res.data);
      } else {
        setErrorMessage(res.error || 'No se encontraron resultados');
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-xl text-white shadow-md shadow-brand-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base">
                LAB<span className="text-brand-600">CLINIC</span>
              </span>
              <span className="text-[10px] text-slate-400 block font-medium">
                Portal de Pacientes
              </span>
            </div>
          </div>

          <Link
            href="/login"
            className="text-xs font-bold text-slate-600 hover:text-brand-600 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 hover:border-brand-300"
          >
            Acceso Personal
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1 flex flex-col justify-center">
        {/* Intro Card */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-brand-50 text-brand-700 rounded-2xl mb-1">
            <FlaskConical className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Consulta de Resultados en Línea
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Consulte y descargue su informe de análisis clínico oficial con validez médica.
          </p>
        </div>

        {/* Formulario de Búsqueda */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/80 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Cédula de Identidad del Paciente *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ej: V-18456123 o 18456123"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Código de Orden (Indicado en su Factura) *
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ej: ORD-2026-0001"
                  value={codigoOrden}
                  onChange={(e) => setCodigoOrden(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 transition-all active:scale-[0.99]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verificando en laboratorio...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Consultar Resultados
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fills */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Prueba rápida:
            </span>
            <button
              type="button"
              onClick={() => handleQuickDemo('V-18456123', 'ORD-2026-0001')}
              className="font-bold text-brand-600 hover:underline"
            >
              Cargar Orden ORD-2026-0001
            </button>
          </div>
        </div>

        {/* Alerta de Error */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tarjeta de Resultado Encontrado */}
        {resultData && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-5 animate-in fade-in zoom-in-95">
            {/* Header del Resultado */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">
                  Informe Localizado
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {resultData.pacienteNombre}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  C.I: {resultData.pacienteCedula} • Orden: {resultData.codigoOrden}
                </p>
              </div>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  resultData.esValidoParaDescarga
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {resultData.estado}
              </span>
            </div>

            {/* Lista de Exámenes Solicitados */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-slate-600 block">Exámenes Solicitados:</span>
              <div className="flex flex-wrap gap-1.5">
                {resultData.examenes.map((ex, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium text-[11px]"
                  >
                    {ex.nombre}
                  </span>
                ))}
              </div>
            </div>

            {/* Estado de la Orden y Acción de Descarga */}
            {resultData.esValidoParaDescarga ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{resultData.mensajeEstado}</span>
                </div>

                <a
                  href={`/api/orders/${resultData.orderId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99]"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Descargar Informe Médico Oficial (PDF)</span>
                </a>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-amber-900">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Muestras en Proceso Técnico</span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {resultData.mensajeEstado}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-600">LABCLINIC DIAGNOSTICS • Caracas, Venezuela</p>
        <p className="text-[11px]">
          ¿Dudas o inconvenientes con sus resultados? Comuníquese con atención al paciente: +58 (212) 555-0199
        </p>
      </footer>
    </div>
  );
}
