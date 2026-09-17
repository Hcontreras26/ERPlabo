'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';

const createPatientSchema = z.object({
  cedula: z.string().min(4, 'Cédula requerida').trim(),
  nombreCompleto: z.string().min(3, 'Nombre completo requerido').trim(),
  fechaNacimiento: z.string().or(z.date()),
  sexo: z.enum(['MASCULINO', 'FEMENINO']),
  telefono: z.string().min(7, 'Teléfono requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().optional().or(z.literal('')),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

/**
 * Busca un paciente por su cédula filtrando estrictamente por el tenantId del usuario
 */
export async function searchPatientByCedula(cedula: string) {
  try {
    const session = await requireAuth();
    const tenantId = session.tenantId;

    const cleaned = cedula.trim();
    if (!cleaned) return { success: true, patient: null };

    const patient = await prisma.patient.findFirst({
      where: {
        tenantId,
        cedula: cleaned,
      },
      include: {
        orders: {
          where: { tenantId },
          take: 3,
          orderBy: { fechaCreacion: 'desc' },
          select: {
            id: true,
            codigoOrden: true,
            fechaCreacion: true,
            estado: true,
            estadoPago: true,
            totalUsd: true,
          },
        },
      },
    });

    return {
      success: true,
      patient: patient
        ? {
            ...patient,
            totalUsd: undefined,
          }
        : null,
    };
  } catch (error: any) {
    console.error('Error buscando paciente:', error);
    return { success: false, error: error.message || 'Error al buscar paciente' };
  }
}

/**
 * Registra un nuevo paciente asignado al tenantId del usuario en sesión
 */
export async function createPatient(input: CreatePatientInput) {
  try {
    const session = await requireAuth();
    const tenantId = session.tenantId;

    const validated = createPatientSchema.parse(input);

    const existing = await prisma.patient.findUnique({
      where: {
        tenantId_cedula: {
          tenantId,
          cedula: validated.cedula,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Ya existe un paciente registrado con la cédula ${validated.cedula} en este laboratorio.`,
      };
    }

    const patient = await prisma.patient.create({
      data: {
        tenantId,
        cedula: validated.cedula,
        nombreCompleto: validated.nombreCompleto,
        fechaNacimiento: new Date(validated.fechaNacimiento),
        sexo: validated.sexo,
        telefono: validated.telefono,
        email: validated.email || null,
        direccion: validated.direccion || null,
      },
    });

    revalidatePath('/dashboard/recepcion/nueva');

    return {
      success: true,
      patient,
    };
  } catch (error: any) {
    console.error('Error creando paciente:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: error.message || 'Error al registrar paciente' };
  }
}
