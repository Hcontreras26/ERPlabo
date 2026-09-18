'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  UserPlus, 
  Plus, 
  Trash2, 
  CreditCard, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  Phone, 
  Calendar, 
  FileText,
  Activity,
  Layers,
  ArrowRight,
  Loader2,
  X
} from 'lucide-react';
import { searchPatientByCedula, createPatient } from '@/app/actions/patients';
import { getActiveTests } from '@/app/actions/tests';
import { createOrder } from '@/app/actions/orders';
import { getLabSettings } from '@/app/actions/settings';
import { formatUSD, formatVES, calculatePaymentSplitSummary, MetodoPagoTipo, MonedaTipo } from '@/lib/currency';

interface PatientData {
  id: string;
  cedula: string;
  nombreCompleto: string;
  fechaNacimiento: string | Date;
  sexo: 'MASCULINO' | 'FEMENINO';
  telefono: string;
  email?: string | null;
}

interface TestItem {
  id: string;
  codigo: string;
  nombre: string;
  precioUsd: number;
  categoria: string;
  area?: string;
  tipoMuestra?: string;
  tiempoEntregaHoras: number;
}

interface PaymentRow {
  id: string;
  metodoPago: MetodoPagoTipo;
  monedaOriginal: MonedaTipo;
  montoOriginal: number;
  tasaCambio: number;
  referencia: string;
  notas: string;
}

export default function NuevaRecepcionPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estados Generales
  const [tasaBcv, setTasaBcv] = useState<number>(36.50);
  const [medicoTratante, setMedicoTratante] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

  // 1. Paciente
  const [cedulaQuery, setCedulaQuery] = useState<string>('');
  const [isSearchingPatient, setIsSearchingPatient] = useState<boolean>(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [showNewPatientModal, setShowNewPatientModal] = useState<boolean>(false);
  const [patientForm, setPatientForm] = useState({
    cedula: '',
    nombreCompleto: '',
    fechaNacimiento: '1990-01-01',
    sexo: 'MASCULINO' as 'MASCULINO' | 'FEMENINO',
    telefono: '',
    email: '',
  });

  // 2. Catálogo de Exámenes
  const [testsCatalog, setTestsCatalog] = useState<TestItem[]>([]);
  const [selectedTests, setSelectedTests] = useState<TestItem[]>([]);
  const [testSearch, setTestSearch] = useState<string>('');
  const [isLoadingTests, setIsLoadingTests] = useState<boolean>(true);

  // 3. Pagos Divididos
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState<MetodoPagoTipo>('PAGO_MOVIL');
  const [newPaymentMonto, setNewPaymentMonto] = useState<string>('');
  const [newPaymentRef, setNewPaymentRef] = useState<string>('');

  // 4. Mensajes y Alertas
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cargar Catálogo de Exámenes y Tasa BCV configurada al montar
  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingTests(true);
      const [testsRes, settingsRes] = await Promise.all([
        getActiveTests(),
        getLabSettings(),
      ]);

      if (testsRes.success && testsRes.tests) {
        setTestsCatalog(testsRes.tests as TestItem[]);
      }
      if (settingsRes.success && settingsRes.data?.tasaBcvActual) {
        setTasaBcv(settingsRes.data.tasaBcvActual);
      }
      setIsLoadingTests(false);
    }
    loadInitialData();
  }, []);

  // Debounce para búsqueda de paciente por cédula
  useEffect(() => {
    if (!cedulaQuery.trim() || cedulaQuery.trim().length < 4) {
      setSelectedPatient(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPatient(true);
      const res = await searchPatientByCedula(cedulaQuery.trim());
      setIsSearchingPatient(false);

      if (res.success && res.patient) {
        setSelectedPatient(res.patient as any);
        setStatusMessage(null);
      } else {
        setSelectedPatient(null);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [cedulaQuery]);

  // Cálculos Financieros en Tiempo Real
  const totalUsd = useMemo(() => {
    return selectedTests.reduce((acc, test) => acc + test.precioUsd, 0);
  }, [selectedTests]);

  const paymentSummary = useMemo(() => {
    return calculatePaymentSplitSummary(
      totalUsd,
      tasaBcv,
      payments.map((p) => ({
        metodoPago: p.metodoPago,
        monedaOriginal: p.monedaOriginal,
        montoOriginal: p.montoOriginal,
        tasaCambio: p.tasaCambio,
        referencia: p.referencia,
        notas: p.notas,
      }))
    );
  }, [totalUsd, tasaBcv, payments]);

  // Manejador de Agregar Examen
  const handleAddTest = (test: TestItem) => {
    if (selectedTests.some((t) => t.id === test.id)) return;
    setSelectedTests([...selectedTests, test]);
  };

  const handleRemoveTest = (testId: string) => {
    setSelectedTests(selectedTests.filter((t) => t.id !== testId));
  };

  // Manejador de Registro de Paciente en Caliente
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createPatient(patientForm);
      if (res.success && res.patient) {
        setSelectedPatient(res.patient as any);
        setCedulaQuery(res.patient.cedula);
        setShowNewPatientModal(false);
        setStatusMessage({ type: 'success', text: `Paciente ${res.patient.nombreCompleto} registrado.` });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'No se pudo registrar el paciente' });
      }
    });
  };

  // Manejador de Agregar Pago Dividido
  const handleAddPayment = () => {
    const val = parseFloat(newPaymentMonto);
    if (isNaN(val) || val <= 0) {
      alert('Por favor introduce un monto válido mayor a 0');
      return;
    }

    const isUsdMethod = newPaymentMethod === 'EFECTIVO_USD' || newPaymentMethod === 'ZELLE' || newPaymentMethod === 'BINANCE_USDT';
    const moneda: MonedaTipo = isUsdMethod ? 'USD' : 'VES';

    const newPayment: PaymentRow = {
      id: Math.random().toString(36).substring(2, 9),
      metodoPago: newPaymentMethod,
      monedaOriginal: moneda,
      montoOriginal: val,
      tasaCambio: tasaBcv,
      referencia: newPaymentRef.trim(),
      notas: '',
    };

    setPayments([...payments, newPayment]);
    setNewPaymentMonto('');
    setNewPaymentRef('');
  };

  const handleRemovePayment = (id: string) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  // Autocompletar monto sugerido en el método de pago
  const handleSuggestAmount = (metodo: MetodoPagoTipo) => {
    setNewPaymentMethod(metodo);
    const isUsd = metodo === 'EFECTIVO_USD' || metodo === 'ZELLE' || metodo === 'BINANCE_USDT';
    if (isUsd) {
      setNewPaymentMonto(paymentSummary.saldoPendienteUsd.toString());
    } else {
      setNewPaymentMonto(paymentSummary.saldoPendienteBs.toString());
    }
  };

  // Manejador de Procesar Orden
  const handleProcessOrder = async () => {
    if (!selectedPatient) {
      setStatusMessage({ type: 'error', text: 'Debe seleccionar o registrar un paciente para la orden.' });
      return;
    }
    if (selectedTests.length === 0) {
      setStatusMessage({ type: 'error', text: 'Debe agregar al menos un examen a la orden.' });
      return;
    }

    startTransition(async () => {
      const res = await createOrder({
        patientId: selectedPatient.id,
        medicoTratante: medicoTratante.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        tasaBcv,
        items: selectedTests.map((t) => ({
          testId: t.id,
          precioUnitarioUsd: t.precioUsd,
        })),
        payments: payments.map((p) => ({
          metodoPago: p.metodoPago as any,
          monedaOriginal: p.monedaOriginal as any,
          montoOriginal: p.montoOriginal,
          tasaCambio: p.tasaCambio,
          referencia: p.referencia || undefined,
          notas: p.notas || undefined,
        })),
      });

      if (res.success && res.data) {
        setStatusMessage({
          type: 'success',
          text: `¡Orden ${res.data.codigoOrden} registrada exitosamente! Redirigiendo a laboratorio...`,
        });
        setTimeout(() => {
          router.push(`/dashboard/laboratorio/${res.data.orderId}`);
        }, 1200);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Ocurrió un error al procesar la orden',
        });
      }
    });
  };

  // Calcular edad del paciente seleccionado
  const calculateAge = (birthDate: string | Date) => {
    const diff = Date.now() - new Date(birthDate).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  // Filtrado de catálogo
  const filteredTests = testsCatalog.filter(
    (t) =>
      t.nombre.toLowerCase().includes(testSearch.toLowerCase()) ||
      t.codigo.toLowerCase().includes(testSearch.toLowerCase()) ||
      t.categoria.toLowerCase().includes(testSearch.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-semibold text-xs tracking-wider uppercase">
            <Activity className="w-4 h-4" />
            Módulo de Admisión y Cobranzas
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
            Nueva Recepción de Paciente
          </h1>
          <p className="text-sm text-slate-500">
            Ingreso de órdenes clínicas, cotización y pagos multimoneda.
          </p>
        </div>

        {/* Input Tasa BCV Editable */}
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xs">
            BCV
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-500 block">
              Tasa Oficial (VES / USD)
            </label>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-semibold text-slate-400">Bs.</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={tasaBcv}
                onChange={(e) => setTasaBcv(parseFloat(e.target.value) || 1)}
                className="w-24 px-2 py-0.5 font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
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

      {/* Layout Grid: Izquierda (Paciente + Exámenes) | Derecha (Facturación + Pagos) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. SECCIÓN: DATOS DEL PACIENTE */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-brand-600" />
                Identificación del Paciente
              </h2>
              {selectedPatient && (
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold">
                  Paciente Seleccionado
                </span>
              )}
            </div>

            {/* Buscador de Cédula */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Escriba Cédula (Ej: V-18456123 o 18456123)..."
                  value={cedulaQuery}
                  onChange={(e) => setCedulaQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
                {isSearchingPatient && (
                  <Loader2 className="w-4 h-4 absolute right-3.5 top-3.5 animate-spin text-brand-600" />
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPatientForm((prev) => ({ ...prev, cedula: cedulaQuery }));
                  setShowNewPatientModal(true);
                }}
                className="px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors border border-brand-200"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo</span>
              </button>
            </div>

            {/* Ficha Resumen del Paciente Encontrado */}
            {selectedPatient ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Nombre</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {selectedPatient.nombreCompleto}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Cédula</span>
                  <span className="font-bold text-slate-800">{selectedPatient.cedula}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Edad / Sexo</span>
                  <span className="font-bold text-slate-800">
                    {calculateAge(selectedPatient.fechaNacimiento)} años ({selectedPatient.sexo === 'MASCULINO' ? 'M' : 'F'})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Teléfono</span>
                  <span className="font-medium text-slate-700">{selectedPatient.telefono}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                Ingrese una cédula registrada o presione "Nuevo" para registrar un paciente.
              </div>
            )}

            {/* Datos Médicos Opcionales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Médico Tratante (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Dr. Morales"
                  value={medicoTratante}
                  onChange={(e) => setMedicoTratante(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Observaciones Clínicas
                </label>
                <input
                  type="text"
                  placeholder="Ej: Paciente en ayunas 10h"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* 2. SECCIÓN: CATÁLOGO DE EXÁMENES DISPONIBLES */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-600" />
                Catálogo de Exámenes Disponibles
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {filteredTests.length} pruebas disponibles
              </span>
            </div>

            {/* Filtro de Exámenes */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar examen por nombre, código o categoría..."
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Lista de Exámenes */}
            {isLoadingTests ? (
              <div className="py-8 flex justify-center items-center text-slate-400 text-sm gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando catálogo...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {filteredTests.map((test) => {
                  const isSelected = selectedTests.some((t) => t.id === test.id);
                  return (
                    <div
                      key={test.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-brand-50/60 border-brand-300 ring-1 ring-brand-400'
                          : 'bg-white border-slate-200 hover:border-brand-200 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-mono">
                            {test.codigo}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {test.tiempoEntregaHoras}h
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 text-sm mt-1 line-clamp-1">
                          {test.nombre}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {test.categoria} {test.tipoMuestra ? `• ${test.tipoMuestra}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">
                            {formatUSD(test.precioUsd)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            ≈ {formatVES(test.precioUsd * tasaBcv)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => (isSelected ? handleRemoveTest(test.id) : handleAddTest(test))}
                          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                            isSelected
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                          }`}
                        >
                          {isSelected ? (
                            <Trash2 className="w-3.5 h-3.5" />
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" /> Agregar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA (5 cols): RESUMEN, PAGOS DIVIDIDOS Y ACCIONES */}
        <div className="lg:col-span-5 space-y-6">
          {/* 3. CARRITO / RESUMEN DE ORDEN */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600" />
                Exámenes en la Orden ({selectedTests.length})
              </h2>
              {selectedTests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTests([])}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Limpiar
                </button>
              )}
            </div>

            {selectedTests.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                No has seleccionado exámenes aún.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedTests.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <div className="pr-2 truncate">
                      <p className="font-semibold text-slate-800 truncate">{t.nombre}</p>
                      <span className="text-[10px] text-slate-400">{t.codigo}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{formatUSD(t.precioUsd)}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {formatVES(t.precioUsd * tasaBcv)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTest(t.id)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totales de la Orden */}
            <div className="p-4 bg-brand-50/70 rounded-xl border border-brand-100 space-y-1.5">
              <div className="flex justify-between items-center text-xs text-brand-900">
                <span>Total Factura (USD):</span>
                <span className="font-bold text-base text-brand-950 font-mono">
                  {formatUSD(totalUsd)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-brand-800 border-t border-brand-200/60 pt-1.5">
                <span>Total Equivalente en Bolívares (VES):</span>
                <span className="font-bold text-sm text-brand-950 font-mono">
                  {formatVES(totalUsd * tasaBcv)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. MÓDULO DE PAGOS DIVIDIDOS (SPLIT PAYMENT) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand-600" />
                Cobranza y Pagos Divididos
              </h2>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  paymentSummary.estadoPago === 'PAGADO'
                    ? 'bg-emerald-100 text-emerald-800'
                    : paymentSummary.estadoPago === 'PARCIAL'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {paymentSummary.estadoPago}
              </span>
            </div>

            {/* Indicador Dinámico de Saldo Restante */}
            <div
              className={`p-3.5 rounded-xl border text-xs flex justify-between items-center ${
                paymentSummary.estaCompletamentePagado
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div>
                <span className="font-bold block">
                  {paymentSummary.estaCompletamentePagado
                    ? 'Orden Totalmente Cubierta'
                    : 'Saldo Restante por Pagar:'}
                </span>
                {paymentSummary.vueltoUsd.greaterThan(0) && (
                  <span className="text-[10px] text-emerald-700">
                    Excedente / Vuelto: {formatUSD(paymentSummary.vueltoUsd.toNumber())}
                  </span>
                )}
              </div>
              <div className="text-right font-mono font-bold">
                <span className="text-sm block">
                  {formatUSD(paymentSummary.saldoPendienteUsd.toNumber())}
                </span>
                <span className="text-[11px] opacity-80 block">
                  {formatVES(paymentSummary.saldoPendienteBs.toNumber())}
                </span>
              </div>
            </div>

            {/* Formulario de Agregar Abono / Pago */}
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => handleSuggestAmount(e.target.value as MetodoPagoTipo)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="PAGO_MOVIL">Pago Móvil (VES)</option>
                    <option value="EFECTIVO_USD">Efectivo (USD)</option>
                    <option value="EFECTIVO_BS">Efectivo (VES)</option>
                    <option value="PUNTO_DE_VENTA">Punto de Venta (VES)</option>
                    <option value="ZELLE">Zelle (USD)</option>
                    <option value="BINANCE_USDT">Binance USDT (USD)</option>
                    <option value="TRANSFERENCIA_BS">Transferencia (VES)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Monto (
                    {newPaymentMethod === 'EFECTIVO_USD' || newPaymentMethod === 'ZELLE' || newPaymentMethod === 'BINANCE_USDT'
                      ? 'USD $'
                      : 'Bs.'}
                    )
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newPaymentMonto}
                    onChange={(e) => setNewPaymentMonto(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Referencia / Últimos 6 Dígitos (Opcional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: 789456"
                    value={newPaymentRef}
                    onChange={(e) => setNewPaymentRef(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPayment}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Pago
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de Pagos Agregados */}
            {payments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Abonos Registrados
                </span>
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{p.metodoPago.replace(/_/g, ' ')}</span>
                      {p.referencia && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Ref: {p.referencia}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        {p.monedaOriginal === 'USD'
                          ? formatUSD(p.montoOriginal)
                          : formatVES(p.montoOriginal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePayment(p.id)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BOTÓN PRINCIPAL PROCESAR ORDEN */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isPending || !selectedPatient || selectedTests.length === 0}
                onClick={handleProcessOrder}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all active:scale-[0.99]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Procesando Orden en Transacción...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Registrar y Procesar Orden
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PARA REGISTRAR PACIENTE EN CALIENTE */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-600" />
                Registrar Nuevo Paciente
              </h3>
              <button
                type="button"
                onClick={() => setShowNewPatientModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Cédula de Identidad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: V-18456123"
                  value={patientForm.cedula}
                  onChange={(e) => setPatientForm({ ...patientForm, cedula: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Mendoza"
                  value={patientForm.nombreCompleto}
                  onChange={(e) => setPatientForm({ ...patientForm, nombreCompleto: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fecha Nacimiento *</label>
                  <input
                    type="date"
                    required
                    value={patientForm.fechaNacimiento}
                    onChange={(e) => setPatientForm({ ...patientForm, fechaNacimiento: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sexo *</label>
                  <select
                    value={patientForm.sexo}
                    onChange={(e) => setPatientForm({ ...patientForm, sexo: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Teléfono *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 0414-1234567"
                  value={patientForm.telefono}
                  onChange={(e) => setPatientForm({ ...patientForm, telefono: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={patientForm.email}
                  onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-md shadow-brand-600/20"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
