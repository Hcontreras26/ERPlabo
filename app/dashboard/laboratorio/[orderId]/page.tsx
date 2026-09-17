'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { 
  FlaskConical, 
  User, 
  Calendar, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Loader2, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { getOrderForLab, saveOrderResultsDraft, validateAndSignOrder } from '@/app/actions/lab';
import { evaluarResultadoLIS, esNino } from '@/lib/lis';
import { OrderDeliveryActions } from '@/components/orders/OrderDeliveryActions';

interface ParameterData {
  id: string;
  nombre: string;
  unidadMedida: string | null;
  tipoResultado: 'NUMERICO' | 'TEXTO' | 'POSITIVO_NEGATIVO';
  rangoMinHombre: number | null;
  rangoMaxHombre: number | null;
  rangoMinMujer: number | null;
  rangoMaxMujer: number | null;
  rangoMinNino: number | null;
  rangoMaxNino: number | null;
  valorPorDefecto: string | null;
}

interface ResultRow {
  id: string;
  testParameterId: string;
  valor: string;
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
  results: ResultRow[];
}

export default function LaboratorioOrdenPage({
  params,
}: {
  params: { orderId: string };
}) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<any>(null);
  const [resultsState, setResultsState] = useState<Record<string, { valor: string; fueraDeRango: boolean; observaciones: string }>>({});
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
        const initialMap: Record<string, { valor: string; fueraDeRango: boolean; observaciones: string }> = {};
        res.order.results.forEach((r: any) => {
          initialMap[r.id] = {
            valor: r.valor || '',
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

  // Manejar cambio en input de resultado con evaluación en tiempo real
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

  // Agrupar resultados por examen
  const testGroups: TestGroup[] = order.items.map((item: any) => {
    const testResults = order.results.filter((r: any) =>
      item.test.parameters.some((p: any) => p.id === r.testParameterId)
    );

    return {
      testId: item.test.id,
      testNombre: item.test.nombre,
      testCodigo: item.test.codigo,
      categoria: item.test.categoria,
      results: testResults,
    };
  });

  const isNinoPaciente = esNino(order.patient.fechaNacimiento);
  const isHombre = order.patient.sexo === 'MASCULINO';
  const isValidado = order.estado === 'VALIDADO';

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

      {/* 2. TABLA AGRUPADA DE ANALITOS Y CARGA DE RESULTADOS */}
      <div className="space-y-6">
        {testGroups.map((group) => (
          <div
            key={group.testId}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            {/* Header del Examen */}
            <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FlaskConical className="w-5 h-5 text-brand-400" />
                <div>
                  <h3 className="font-bold text-sm tracking-wide">{group.testNombre}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {group.testCodigo} • {group.categoria}
                  </span>
                </div>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                {group.results.length} analitos
              </span>
            </div>

            {/* Tabla de Parámetros */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-1/4">Parámetro / Analito</th>
                    <th className="py-3 px-4 w-1/4">Resultado Obtenido</th>
                    <th className="py-3 px-4 w-1/6">Unidad</th>
                    <th className="py-3 px-4 w-1/4">Rango Biológico de Referencia</th>
                    <th className="py-3 px-4 w-1/4">Observación / Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {group.results.map((r) => {
                    const currentState = resultsState[r.id] || {
                      valor: r.valor,
                      fueraDeRango: r.fueraDeRango,
                      observaciones: r.observaciones || '',
                    };
                    const param = r.testParameter;

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
                        : 'Referencial / Normal';

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
                          <span className="font-bold text-slate-900 block">{param.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Tipo: {param.tipoResultado}
                          </span>
                        </td>

                        {/* 2. Input de Resultado en Tiempo Real */}
                        <td className="py-3 px-4">
                          <div className="relative flex items-center">
                            {param.tipoResultado === 'POSITIVO_NEGATIVO' ? (
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
                            ) : (
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
                            )}

                            {/* Alerta de Fuera de Rango */}
                            {currentState.fueraDeRango && (
                              <div
                                title="¡Valor fuera del rango biológico de referencia!"
                                className="absolute right-2.5 top-2 text-rose-600"
                              >
                                <AlertTriangle className="w-4 h-4 animate-bounce" />
                              </div>
                            )}
                          </div>
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
