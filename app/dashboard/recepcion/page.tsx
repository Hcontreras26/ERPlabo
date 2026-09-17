import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { 
  UserPlus, 
  FlaskConical, 
  AlertCircle
} from 'lucide-react';
import { formatUSD, formatVES } from '@/lib/currency';
import { OrderDeliveryActions } from '@/components/orders/OrderDeliveryActions';

import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function RecepcionPage() {
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
      payments: true,
    },
    take: 30,
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Control de Recepción y Órdenes</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de pacientes, estado de facturación multimoneda y entrega de resultados.
          </p>
        </div>
        <Link
          href="/dashboard/recepcion/nueva"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-600/30 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Nueva Orden / Facturación
        </Link>
      </div>

      {/* Tabla de Órdenes */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Órdenes Registradas ({orders.length})
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
            <p>No se encontraron órdenes registradas en el sistema.</p>
            <Link
              href="/dashboard/recepcion/nueva"
              className="inline-block text-xs text-brand-600 font-bold hover:underline"
            >
              Crear la primera orden ahora
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="py-3 px-4">Código Orden</th>
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Exámenes</th>
                  <th className="py-3 px-4">Total Facturado</th>
                  <th className="py-3 px-4">Estado Pago</th>
                  <th className="py-3 px-4">Estado Clínico</th>
                  <th className="py-3 px-4 text-right">Acciones & Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    {/* Código */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {o.codigoOrden}
                    </td>

                    {/* Paciente */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{o.patient.nombreCompleto}</span>
                      <span className="text-[10px] text-slate-400 font-mono">C.I: {o.patient.cedula}</span>
                    </td>

                    {/* Exámenes */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {o.items.map((i) => (
                          <span
                            key={i.id}
                            className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-700"
                          >
                            {i.test.codigo}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Montos */}
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-slate-900 block">
                        {formatUSD(o.totalUsd.toString())}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {formatVES(o.totalBs.toString())}
                      </span>
                    </td>

                    {/* Estado Pago */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          o.estadoPago === 'PAGADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.estadoPago === 'PARCIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {o.estadoPago}
                      </span>
                    </td>

                    {/* Estado Clínico */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          o.estado === 'VALIDADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {o.estado}
                      </span>
                    </td>

                    {/* Acciones y Entrega */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <OrderDeliveryActions
                          orderId={o.id}
                          codigoOrden={o.codigoOrden}
                          estado={o.estado}
                          patient={o.patient}
                        />

                        <Link
                          href={`/dashboard/laboratorio/${o.id}`}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                          title="Abrir en laboratorio"
                        >
                          <FlaskConical className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
