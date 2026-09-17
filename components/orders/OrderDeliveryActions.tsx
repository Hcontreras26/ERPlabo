'use client';

import React from 'react';
import { MessageSquare, FileDown, ExternalLink, ShieldCheck } from 'lucide-react';

interface OrderDeliveryActionsProps {
  orderId: string;
  codigoOrden: string;
  estado: string;
  patient: {
    nombreCompleto: string;
    telefono: string;
  };
}

/**
 * Normaliza un número telefónico venezolano al formato internacional WhatsApp (58414XXXXXXX)
 */
export function formatVenezuelaPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('58')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `58${digits.substring(1)}`;
  }
  if (digits.length === 10) {
    return `58${digits}`;
  }
  return `58${digits}`;
}

export function OrderDeliveryActions({
  orderId,
  codigoOrden,
  estado,
  patient,
}: OrderDeliveryActionsProps) {
  const isValidado = estado === 'VALIDADO' || estado === 'ENTREGADO';
  const whatsappNumber = formatVenezuelaPhoneForWhatsApp(patient.telefono);

  const mensajeWhatsApp = encodeURIComponent(
    `Hola ${patient.nombreCompleto}, le informamos que sus resultados de laboratorio correspondientes a la orden ${codigoOrden} ya se encuentran listos y validados por el equipo de Bioanálisis.`
  );

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${mensajeWhatsApp}`;
  const pdfDownloadUrl = `/api/orders/${orderId}/pdf`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Botón Descargar PDF */}
      <a
        href={isValidado ? pdfDownloadUrl : '#'}
        target={isValidado ? '_blank' : undefined}
        rel="noopener noreferrer"
        aria-disabled={!isValidado}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
          isValidado
            ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/20 active:scale-95'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'
        }`}
        title={isValidado ? 'Descargar informe en PDF' : 'Debe validar los resultados primero'}
      >
        <FileDown className="w-4 h-4" />
        <span>Descargar PDF</span>
      </a>

      {/* Botón Enviar por WhatsApp */}
      <a
        href={isValidado ? whatsappUrl : '#'}
        target={isValidado ? '_blank' : undefined}
        rel="noopener noreferrer"
        aria-disabled={!isValidado}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
          isValidado
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'
        }`}
        title={isValidado ? 'Notificar al paciente vía WhatsApp' : 'Debe validar los resultados primero'}
      >
        <MessageSquare className="w-4 h-4" />
        <span>Enviar WhatsApp</span>
      </a>
    </div>
  );
}
