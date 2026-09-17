'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  Settings, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { getLabSettings, updateLabSettings, LabSettingsInput } from '@/app/actions/settings';

export default function ConfiguracionPage() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState<LabSettingsInput>({
    nombreLaboratorio: '',
    rif: '',
    direccion: '',
    telefono: '',
    email: '',
    tasaBcvActual: 36.50,
    logoUrl: '',
    mensajePiePagina: '',
  });

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const res = await getLabSettings();
      if (res.success && res.data) {
        setForm({
          nombreLaboratorio: res.data.nombreLaboratorio,
          rif: res.data.rif,
          direccion: res.data.direccion,
          telefono: res.data.telefono,
          email: res.data.email || '',
          tasaBcvActual: res.data.tasaBcvActual,
          logoUrl: res.data.logoUrl || '',
          mensajePiePagina: res.data.mensajePiePagina || '',
        });
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    startTransition(async () => {
      const res = await updateLabSettings(form);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: '¡Configuración del laboratorio y tasa de cambio actualizadas correctamente!',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Ocurrió un error al guardar los ajustes.',
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-xs font-semibold">Cargando configuración del laboratorio...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-600 font-semibold text-xs tracking-wider uppercase">
            <Settings className="w-4 h-4" />
            Panel de Administración
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Ajustes Generales del Laboratorio
          </h1>
          <p className="text-xs text-slate-500">
            Personalice los datos fiscales, encabezados de informes médicos y la tasa de cambio base.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-800 shrink-0">
          <ShieldCheck className="w-4 h-4 text-purple-600" />
          <span>Acceso Administrador</span>
        </div>
      </div>

      {/* Alertas */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        {/* SECCIÓN 1: IDENTIFICACIÓN FISCAL */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Identificación y Razón Social
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nombre Comercial del Laboratorio *</label>
              <input
                type="text"
                required
                value={form.nombreLaboratorio}
                onChange={(e) => setForm({ ...form, nombreLaboratorio: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">R.I.F. / Registro Fiscal *</label>
              <input
                type="text"
                required
                placeholder="Ej: J-40123456-7"
                value={form.rif}
                onChange={(e) => setForm({ ...form, rif: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: TASA BCV DEL DÍA */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Tasa de Cambio Oficial del Día (VES / USD)
              </h3>
            </div>
            <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
              Base Automática en Caja
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Bs.</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.tasaBcvActual}
                onChange={(e) => setForm({ ...form, tasaBcvActual: parseFloat(e.target.value) || 1 })}
                className="w-full pl-10 pr-4 py-2 bg-white border border-emerald-300 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Esta tasa se aplicará de forma predeterminada a todas las nuevas recepciones y órdenes creadas por el personal de admisión.
            </p>
          </div>
        </div>

        {/* SECCIÓN 3: CONTACTO Y DIRECCIÓN */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Ubicación y Contacto
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Teléfonos de Contacto *</label>
              <input
                type="text"
                required
                placeholder="Ej: +58 (212) 555-0199 / +58 (414) 123-4567"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Correo Electrónico Oficial</label>
              <input
                type="email"
                placeholder="contacto@laboratorio.com"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Dirección Física de la Sede *</label>
              <input
                type="text"
                required
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: TEXTO LEGAL DE INFORMES MÉDICOS */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Pie de Página de Informes en PDF
            </h2>
          </div>

          <div className="text-xs">
            <label className="font-bold text-slate-700 block mb-1">
              Cláusula Legal y de Confidencialidad
            </label>
            <textarea
              rows={2}
              value={form.mensajePiePagina || ''}
              onChange={(e) => setForm({ ...form, mensajePiePagina: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-brand-600/20 transition-all active:scale-95"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando Cambios...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Configuración
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
