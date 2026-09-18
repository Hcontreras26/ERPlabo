'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { 
  FlaskConical, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  Activity,
  Droplets,
  Microscope,
  Dna,
  TestTube
} from 'lucide-react';
import { getOrderForLab, saveOrderResultsDraft, validateAndSignOrder } from '@/app/actions/lab';
import { evaluarResultadoLIS, esNino } from '@/lib/lis';
import { OrderDeliveryActions } from '@/components/orders/OrderDeliveryActions';
import { LAB_AREA_LABELS } from '@/types';

interface ParameterData {
  id: string;
  nombre: string;
  unidadMedida: string | null;
  tipoResultado: 'NUMERICO' | 'TEXTO' | 'POSITIVO_NEGATIVO';
  requiereControl: boolean;
  rangoMinHombre: number | null;
  rangoMaxHombre: number | null;
  rangoMinMujer: number | null;
  rangoMaxMujer: number | null;
  rangoMinNino: number | null;
  rangoMaxNino: number | null;
  valorPorDefecto: string | null;
  ordenVisualizacion: number;
}

interface ResultRow {
  id: string;
  testParameterId: string;
  valor: string;
  valorControl: string | null;
  fueraDeRango: boolean;
  observaciones: string | null;
  validado: boolean;
  validadoPor: string | null;
  fechaValidacion: string | null;
  testParameter: ParameterData;
}

interface TestGroup {
  testId: string;
  testNombre: string;
  testCodigo: string;
  categoria: string;
  area: string;
  tipoMuestra: string;
  results: ResultRow[];
}

interface AreaGroup {
  areaKey: string;
  areaNombre: string;
  tests: TestGroup[];
}

export default function LaboratorioOrdenPage({
  params,
}: {
  params: { orderId: string };
}) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<any>(null);
  const [resultsState, setResultsState] = useState<
    Record<string, { valor: string; valorControl: string; fueraDeRango: boolean; observaciones: string }>
  >({});
  const [bioanalistaNombre, setBioanalistaNombre] = useState<string>('Lic. Elena Blanco (MPPS 12450)');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cargar datos de la orden
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const res = await getOrderForLab(params.orderId);
      if (res.success && res.order) {
        setOrder(res.order);

        // Inicializar estado reactivo de inputs
        const initialMap: Record<string, { valor: string; valorControl: string; fueraDeRango: boolean; observaciones: string }> = {};
        res.order.results.forEach((r: any) => {
          initialMap[r.id] = {
            valor: r.valor || '',
            valorControl: r.valorControl || '',
            fueraDeRango: r.fueraDeRango || false,
            observaciones: r.observaciones || '',
          };
        });
        setResultsState(initialMap);
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'No se pudo cargar la orden' });
      }
      setIsLoading(false);
    }

    loadData();
  }, [params.orderId]);

  // Manejar cambio en input de resultado del paciente con evaluación en tiempo real
  const handleValueChange = (resultId: string, param: ParameterData, newValue: string) => {
    if (!order) return;

    const evaluacion = evaluarResultadoLIS(
      newValue,
      param.tipoResultado,
      param,
      order.patient.sexo,
      order.patient.fechaNacimiento
    );

    setResultsState((prev) => ({
      ...prev,
      [resultId]: {
        ...prev[resultId],
        valor: newValue,
        fueraDeRango: evaluacion.fueraDeRango,
        observaciones: evaluacion.fueraDeRango && !prev[resultId]?.observaciones
          ? `Valor ${evaluacion.interpretacion}`
          : prev[resultId]?.observaciones || '',
      },
    }));
  };

  // Manejar cambio en input del Control / Testigo (pruebas de coagulación / control)
  const handleControlChange = (resultId: string, newControlValue: string) => {
    setResultsState((prev) => ({
      ...prev,
      [resultId]: {
        ...prev[resultId],
        valorControl: newControlValue,
      },
    }));
  };

  // Manejar observaciones
  const handleObsChange = (resultId: string, obs: string) => {
    setResultsState((prev) => ({
      ...prev,
      [resultId]: {
        ...prev[resultId],
        observaciones: obs,
      },
    }));
  };

  // Guardar Borrador
  const handleSaveDraft = async () => {
    startTransition(async () => {
      const payload = Object.entries(resultsState).map(([id, item]) => ({
        id,
        valor: item.valor,
        valorControl: item.valorControl || null,
        fueraDeRango: item.fueraDeRango,
        observaciones: item.observaciones,
      }));

      const res = await saveOrderResultsDraft({
        orderId: params.orderId,
        results: payload,
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Borrador de resultados guardado correctamente.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Error al guardar borrador' });
      }
    });
  };

  // Validar y Firmar Resultados Clínicos
  const handleValidateAndSign = async () => {
    if (!bioanalistaNombre.trim()) {
      setStatusMessage({ type: 'error', text: 'Debe ingresar el nombre del bioanalista validador.' });
      return;
    }

    startTransition(async () => {
      // 1. Guardar valores actuales
      const payload = Object.entries(resultsState).map(([id, item]) => ({
        id,
        valor: item.valor,
        valorControl: item.valorControl || null,
        fueraDeRango: item.fueraDeRango,
        observaciones: item.observaciones,
      }));

      await saveOrderResultsDraft({
        orderId: params.orderId,
        results: payload,
      });

      // 2. Firmar orden
      const res = await validateAndSignOrder(params.orderId, bioanalistaNombre);

      if (res.success) {
        setOrder((prev: any) => ({ ...prev, estado: 'VALIDADO' }));
        setStatusMessage({
          type: 'success',
          text: '¡Orden validada y firmada exitosamente! Los resultados están listos para entrega.',
        });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Error al validar la orden' });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Cargando protocolo de análisis clínico...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Orden no encontrada</h2>
          <p className="text-sm text-slate-500">No se pudo localizar el registro de la orden solicitada.</p>
          <Link
            href="/dashboard/recepcion"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Recepción
          </Link>
        </div>
      </div>
    );
  }

  // Agrupar resultados por examen y luego por área analítica
  const testGroups: TestGroup[] = order.items.map((item: any) => {
    const testResults = order.results.filter((r: any) =>
      item.test.parameters.some((p: any) => p.id === r.testParameterId)
    );

    return {
      testId: item.test.id,
      testNombre: item.test.nombre,
      testCodigo: item.test.codigo,
      categoria: item.test.categoria,
      area: item.test.area || 'HEMATOLOGIA',
      tipoMuestra: item.test.tipoMuestra || 'Suero',
      results: testResults,
    };
  });

  // Agrupar por área analítica
  const areaGroupsMap = new Map<string, TestGroup[]>();
  testGroups.forEach((tg) => {
    const current = areaGroupsMap.get(tg.area) || [];
    current.push(tg);
    areaGroupsMap.set(tg.area, current);
  });

  const areaGroups: AreaGroup[] = Array.from(areaGroupsMap.entries()).map(([areaKey, tests]) => ({
    areaKey,
    areaNombre: LAB_AREA_LABELS[areaKey] || areaKey,
    tests,
  }));

  const isNinoPaciente = esNino(order.patient.fechaNacimiento);
  const isHombre = order.patient.sexo === 'MASCULINO';
  const isValidado = order.estado === 'VALIDADO';

  const getAreaColorBadge = (areaKey: string) => {
    switch (areaKey) {
      case 'HEMATOLOGIA':
        return {
          badgeBg: 'bg-rose-50 border-rose-200 text-rose-800',
          headerBg: 'bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900',
          accentText: 'text-rose-400',
          icon: <Droplets className="w-5 h-5 text-rose-400" />,
        };
      case 'QUIMICA_SANGUINEA':
        return {
          badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          headerBg: 'bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900',
          accentText: 'text-emerald-400',
          icon: <Activity className="w-5 h-5 text-emerald-400" />,
        };
      case 'COAGULACION':
        return {
          badgeBg: 'bg-sky-50 border-sky-200 text-sky-800',
          headerBg: 'bg-gradient-to-r from-sky-950 via-slate-900 to-slate-900',
          accentText: 'text-sky-400',
          icon: <TestTube className="w-5 h-5 text-sky-400" />,
        };
      case 'UROANALISIS':
        return {
          badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
          headerBg: 'bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900',
          accentText: 'text-amber-400',
          icon: <FlaskConical className="w-5 h-5 text-amber-400" />,
        };
      default:
        return {
          badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
          headerBg: 'bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900',
          accentText: 'text-indigo-400',
          icon: <Microscope className="w-5 h-5 text-indigo-400" />,
        };
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Barra de Navegación y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard/recepcion"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Órdenes
        </Link>

        <div className="flex items-center gap-3">
          {order && (
            <OrderDeliveryActions
              orderId={order.id}
              codigoOrden={order.codigoOrden}
              estado={order.estado}
              patient={order.patient}
            />
          )}

          <button
            type="button"
            disabled={isPending || isValidado}
            onClick={handleSaveDraft}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" /> Guardar Borrador
          </button>

          <button
            type="button"
            disabled={isPending || isValidado}
            onClick={handleValidateAndSign}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ${
              isValidado
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/30 active:scale-95'
            }`}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            {isValidado ? 'Resultados Validados y Firmados' : 'Validar y Firmar Resultados'}
          </button>
        </div>
      </div>

      {/* Alertas */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
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

      {/* 1. ENCABEZADO DE LA ORDEN Y PACIENTE */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider block">
            Código de Orden
          </span>
          <h2 className="text-xl font-mono font-extrabold text-slate-900 mt-0.5">
            {order.codigoOrden}
          </h2>
          <span
            className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 ${
              order.estado === 'VALIDADO'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}
          >
            Estado: {order.estado}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Paciente
          </span>
          <p className="font-bold text-slate-900 text-base mt-0.5">{order.patient.nombreCompleto}</p>
          <p className="text-xs text-slate-500 font-mono">C.I: {order.patient.cedula}</p>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Datos Demográficos
          </span>
          <p className="font-semibold text-slate-800 text-sm mt-0.5">
            Sexo: {order.patient.sexo === 'MASCULINO' ? 'Masculino' : 'Femenino'}
          </p>
          <p className="text-xs text-slate-500">
            {isNinoPaciente ? '🧒 Clasificación: Niño / Pediátrico' : '👤 Clasificación: Adulto'}
          </p>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Médico / Fecha
          </span>
          <p className="font-medium text-slate-800 text-xs mt-0.5 truncate">
            {order.medicoTratante || 'No indicado'}
          </p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            {new Date(order.fechaCreacion).toLocaleString('es-VE')}
          </p>
        </div>
      </div>

      {/* 2. RESULTADOS AGRUPADOS VISUALMENTE POR ÁREA ANALÍTICA */}
      <div className="space-y-8">
        {areaGroups.map((areaGroup) => {
          const areaTheme = getAreaColorBadge(areaGroup.areaKey);

          return (
            <div key={areaGroup.areaKey} className="space-y-4">
              {/* Encabezado del Área Analítica */}
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${areaTheme.badgeBg} flex items-center justify-center`}>
                    {areaTheme.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Área: {areaGroup.areaNombre}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Protocolo de validación y control de calidad por analito
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${areaTheme.badgeBg}`}>
                  {areaGroup.tests.length} {areaGroup.tests.length === 1 ? 'examen' : 'exámenes'}
                </span>
              </div>

              {/* Exámenes del Área */}
              <div className="space-y-6">
                {areaGroup.tests.map((group) => (
                  <div
                    key={group.testId}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                  >
                    {/* Header del Examen */}
                    <div className={`${areaTheme.headerBg} text-white px-6 py-3.5 flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <FlaskConical className={`w-5 h-5 ${areaTheme.accentText}`} />
                        <div>
                          <h3 className="font-bold text-sm tracking-wide">{group.testNombre}</h3>
                          <span className="text-[11px] text-slate-300 font-mono">
                            {group.testCodigo} • {group.categoria} • Muestra:{' '}
                            <span className="font-semibold text-white">{group.tipoMuestra}</span>
                          </span>
                        </div>
                      </div>
                      <span className="text-xs bg-slate-800/80 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-medium">
                        {group.results.length} analitos
                      </span>
                    </div>

                    {/* Tabla de Parámetros */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-4 w-1/4">Parámetro / Analito</th>
                            <th className="py-3 px-4 w-1/3">Resultado Obtenido</th>
                            <th className="py-3 px-4 w-1/8">Unidad</th>
                            <th className="py-3 px-4 w-1/5">Rango Biológico / Control</th>
                            <th className="py-3 px-4 w-1/5">Observación / Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.results.map((r) => {
                            const currentState = resultsState[r.id] || {
                              valor: r.valor,
                              valorControl: r.valorControl || '',
                              fueraDeRango: r.fueraDeRango,
                              observaciones: r.observaciones || '',
                            };
                            const param = r.testParameter;
                            const hasControl = param.requiereControl;

                            // Calcular rango referencial textual para mostrar
                            let min: number | null | undefined;
                            let max: number | null | undefined;
                            let categoriaLabel = '';

                            if (isNinoPaciente && (param.rangoMinNino != null || param.rangoMaxNino != null)) {
                              min = param.rangoMinNino;
                              max = param.rangoMaxNino;
                              categoriaLabel = 'Pediátrico';
                            } else if (isHombre) {
                              min = param.rangoMinHombre;
                              max = param.rangoMaxHombre;
                              categoriaLabel = 'Hombre';
                            } else {
                              min = param.rangoMinMujer;
                              max = param.rangoMaxMujer;
                              categoriaLabel = 'Mujer';
                            }

                            const rangoTexto =
                              param.tipoResultado === 'NUMERICO'
                                ? min != null && max != null
                                  ? `${min} - ${max} (${categoriaLabel})`
                                  : 'Referencial'
                                : param.tipoResultado === 'POSITIVO_NEGATIVO'
                                ? 'Negativo'
                                : 'Texto Libre / Cualitativo';

                            return (
                              <tr
                                key={r.id}
                                className={`transition-colors ${
                                  currentState.fueraDeRango
                                    ? 'bg-rose-50/50 hover:bg-rose-50'
                                    : 'hover:bg-slate-50/80'
                                }`}
                              >
                                {/* 1. Nombre Parámetro */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 block">{param.nombre}</span>
                                    {hasControl && (
                                      <span className="bg-sky-100 text-sky-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-sky-300 uppercase">
                                        Control TP/TPT
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Tipo: {param.tipoResultado}
                                  </span>
                                </td>

                                {/* 2. Input de Resultado en Tiempo Real (Paciente vs Control) */}
                                <td className="py-3 px-4">
                                  {hasControl ? (
                                    /* Disposición especial para pruebas de Coagulación que requieren Paciente vs Control */
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                          Paciente (seg)
                                        </label>
                                        <div className="relative flex items-center">
                                          <input
                                            type="text"
                                            disabled={isValidado}
                                            placeholder="Ej: 12.8"
                                            value={currentState.valor}
                                            onChange={(e) => handleValueChange(r.id, param, e.target.value)}
                                            className={`w-full px-2.5 py-1.5 pr-7 rounded-lg border font-mono font-bold text-xs focus:outline-none focus:ring-2 ${
                                              currentState.fueraDeRango
                                                ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500 ring-1 ring-rose-300'
                                                : 'border-slate-300 bg-white text-slate-900 focus:ring-brand-500'
                                            }`}
                                          />
                                          {currentState.fueraDeRango && (
                                            <div
                                              title="¡Tiempo del paciente fuera de rango!"
                                              className="absolute right-1.5 top-2 text-rose-600"
                                            >
                                              <AlertTriangle className="w-3.5 h-3.5" />
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                          Testigo / Control (seg)
                                        </label>
                                        <input
                                          type="text"
                                          disabled={isValidado}
                                          placeholder="Ej: 12.0"
                                          value={currentState.valorControl}
                                          onChange={(e) => handleControlChange(r.id, e.target.value)}
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 font-mono font-bold text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                        />
                                      </div>
                                    </div>
                                  ) : param.tipoResultado === 'POSITIVO_NEGATIVO' ? (
                                    <select
                                      disabled={isValidado}
                                      value={currentState.valor}
                                      onChange={(e) => handleValueChange(r.id, param, e.target.value)}
                                      className={`w-full px-3 py-1.5 rounded-lg border font-semibold text-xs focus:outline-none focus:ring-2 ${
                                        currentState.fueraDeRango
                                          ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                                          : 'border-slate-300 bg-white text-slate-800 focus:ring-brand-500'
                                      }`}
                                    >
                                      <option value="Negativo">Negativo</option>
                                      <option value="Positivo">Positivo (+)</option>
                                      <option value="No reactivo">No reactivo</option>
                                      <option value="Reactivo">Reactivo</option>
                                    </select>
                                  ) : param.tipoResultado === 'TEXTO' ? (
                                    <textarea
                                      rows={2}
                                      disabled={isValidado}
                                      placeholder={param.valorPorDefecto || 'Escriba la observación morfológica...'}
                                      value={currentState.valor}
                                      onChange={(e) => handleValueChange(r.id, param, e.target.value)}
                                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-sans text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                  ) : (
                                    <div className="relative flex items-center">
                                      <input
                                        type="text"
                                        disabled={isValidado}
                                        placeholder={param.valorPorDefecto || '0.00'}
                                        value={currentState.valor}
                                        onChange={(e) => handleValueChange(r.id, param, e.target.value)}
                                        className={`w-full px-3 py-1.5 pr-8 rounded-lg border font-mono font-bold text-xs focus:outline-none focus:ring-2 ${
                                          currentState.fueraDeRango
                                            ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500 ring-1 ring-rose-300'
                                            : 'border-slate-300 bg-white text-slate-900 focus:ring-brand-500'
                                        }`}
                                      />
                                      {currentState.fueraDeRango && (
                                        <div
                                          title="¡Valor fuera del rango biológico de referencia!"
                                          className="absolute right-2.5 top-2 text-rose-600"
                                        >
                                          <AlertTriangle className="w-4 h-4 animate-bounce" />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* 3. Unidad de Medida */}
                                <td className="py-3 px-4 font-mono font-medium text-slate-600">
                                  {param.unidadMedida || '-'}
                                </td>

                                {/* 4. Rango Biológico */}
                                <td className="py-3 px-4 text-slate-600 font-mono">
                                  <span className="font-semibold text-slate-800">{rangoTexto}</span>
                                </td>

                                {/* 5. Observaciones Clínicas */}
                                <td className="py-3 px-4">
                                  <input
                                    type="text"
                                    disabled={isValidado}
                                    placeholder="Obs. (ej: Anisocitosis)"
                                    value={currentState.observaciones}
                                    onChange={(e) => handleObsChange(r.id, e.target.value)}
                                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. FIRMA DEL BIOANALISTA */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-1/2">
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Bioanalista Responsable / Firma de Validación
          </label>
          <input
            type="text"
            disabled={isValidado}
            value={bioanalistaNombre}
            onChange={(e) => setBioanalistaNombre(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 block font-medium">Protocolo de Calidad</span>
          <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5 justify-end">
            <ShieldCheck className="w-4 h-4" /> Validación Automática LIS Activa
          </p>
        </div>
      </div>
    </div>
  );
}
