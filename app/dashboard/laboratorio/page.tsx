import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { FlaskConical, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LaboratorioListPage() {
  const session = await getSession();
  const tenantId = session?.tenantId;

  const orders = await prisma.order.findMany({
    where: tenantId ? { tenantId } : undefined,
    orderBy: { fechaCreacion: 'desc' },
    include: {
      patient: true,
      items: {
        include: {
          test: true,
        },
      },
      results: true,
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-brand-600" />
          Módulo de Bioanálisis y Laboratorio Clínico
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Seleccione una orden para cargar analitos, verificar rangos biológicos y emitir validación médica.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order) => {
          const totalResultados = order.results.length;
          const validados = order.results.filter((r) => r.validado).length;
          const conFueraDeRango = order.results.some((r) => r.fueraDeRango);

          return (
            <div
              key={order.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4 hover:border-brand-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg">
                    {order.codigoOrden}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      order.estado === 'VALIDADO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {order.estado}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mt-3">{order.patient.nombreCompleto}</h3>
                <p className="text-xs text-slate-400 font-mono">C.I: {order.patient.cedula}</p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">Exámenes:</span>
                  <div className="flex flex-wrap gap-1">
                    {order.items.map((i) => (
                      <span
                        key={i.id}
                        className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-medium"
                      >
                        {i.test.nombre}
                      </span>
                    ))}
                  </div>
                </div>

                {conFueraDeRango && (
                  <div className="mt-2 text-[10px] text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200 font-medium">
                    ⚠️ Contiene valores fuera del rango biológico
                  </div>
                )}
              </div>

              <Link
                href={`/dashboard/laboratorio/${order.id}`}
                className="w-full py-2 bg-slate-900 hover:bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Cargar Resultados</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
