'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Decimal } from 'decimal.js';

const labSettingsSchema = z.object({
  nombreLaboratorio: z.string().min(2, 'Nombre requerido'),
  rif: z.string().min(4, 'RIF requerido'),
  direccion: z.string().min(5, 'Dirección requerida'),
  telefono: z.string().min(6, 'Teléfono requerido'),
  email: z.string().email('Email inválido').optional().nullable(),
  tasaBcvActual: z.number().positive('La tasa de cambio debe ser mayor a 0'),
  logoUrl: z.string().optional().nullable(),
  mensajePiePagina: z.string().optional().nullable(),
});

export type LabSettingsInput = z.infer<typeof labSettingsSchema>;

export async function getLabSettings() {
  try {
    const session = await requireAuth();
    const tenantId = session.tenantId;

    let setting = await prisma.labSetting.findUnique({
      where: { tenantId },
    });

    if (!setting) {
      setting = await prisma.labSetting.create({
        data: {
          tenantId,
          nombreLaboratorio: 'LabClinic Diagnostics',
          rif: 'J-40123456-7',
          direccion: 'Av. Francisco de Miranda, Edif. Centro Médico, PB - Caracas',
          telefono: '+58 (212) 555-0199',
          email: 'contacto@labclinic.com.ve',
          tasaBcvActual: 36.50,
          mensajePiePagina:
            'Resultados confidenciales con fines diagnósticos. Protegidos por la ley del ejercicio del Bioanálisis.',
        },
      });
    }

    return {
      success: true,
      data: {
        ...setting,
        tasaBcvActual: Number(setting.tasaBcvActual),
      },
    };
  } catch (error: any) {
    console.error('Error obteniendo ajustes del laboratorio:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener ajustes del laboratorio',
    };
  }
}

export async function updateLabSettings(input: LabSettingsInput) {
  try {
    const session = await requireAuth();
    const tenantId = session.tenantId;

    const validated = labSettingsSchema.parse(input);

    const updated = await prisma.labSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        nombreLaboratorio: validated.nombreLaboratorio,
        rif: validated.rif,
        direccion: validated.direccion,
        telefono: validated.telefono,
        email: validated.email || null,
        tasaBcvActual: new Decimal(validated.tasaBcvActual).toDecimalPlaces(4).toNumber(),
        logoUrl: validated.logoUrl || null,
        mensajePiePagina: validated.mensajePiePagina || null,
      },
      update: {
        nombreLaboratorio: validated.nombreLaboratorio,
        rif: validated.rif,
        direccion: validated.direccion,
        telefono: validated.telefono,
        email: validated.email || null,
        tasaBcvActual: new Decimal(validated.tasaBcvActual).toDecimalPlaces(4).toNumber(),
        logoUrl: validated.logoUrl || null,
        mensajePiePagina: validated.mensajePiePagina || null,
      },
    });

    revalidatePath('/dashboard/configuracion');
    revalidatePath('/dashboard/recepcion/nueva');
    revalidatePath('/dashboard/caja');

    return {
      success: true,
      data: {
        ...updated,
        tasaBcvActual: Number(updated.tasaBcvActual),
      },
    };
  } catch (error: any) {
    console.error('Error actualizando ajustes:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: error.message || 'Error al guardar ajustes' };
  }
}
