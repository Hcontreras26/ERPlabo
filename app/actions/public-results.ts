'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const publicSearchSchema = z.object({
  cedula: z.string().min(4, 'Cédula requerida').trim(),
  codigoOrden: z.string().min(5, 'Código de orden requerido').trim(),
});

export interface PublicOrderSearchResult {
  orderId: string;
  codigoOrden: string;
  fechaCreacion: string;
  estado: string;
  pacienteNombre: string;
  pacienteCedula: string;
  medicoTratante?: string | null;
  examenes: Array<{
    codigo: string;
    nombre: string;
    categoria: string;
  }>;
  esValidoParaDescarga: boolean;
  mensajeEstado: string;
}

export async function searchPatientPublicOrder(input: z.infer<typeof publicSearchSchema>): Promise<{
  success: boolean;
  data?: PublicOrderSearchResult;
  error?: string;
}> {
  try {
    const validated = publicSearchSchema.parse(input);

    const cleanCedula = validated.cedula.trim().toUpperCase();
    const cleanCodigo = validated.codigoOrden.trim().toUpperCase();

    // Buscar orden coincidente con el paciente
    const order = await prisma.order.findFirst({
      where: {
        codigoOrden: cleanCodigo,
        patient: {
          cedula: cleanCedula,
        },
      },
      include: {
        patient: true,
        items: {
          include: {
            test: true,
          },
        },
      },
    });

    if (!order) {
      return {
        success: false,
        error:
          'No se encontró ningún registro con los datos suministrados. Por favor verifique el número de cédula y el código de orden indicado en su factura.',
      };
    }

    const isValidado = order.estado === 'VALIDADO' || order.estado === 'ENTREGADO';

    let mensajeEstado = '';
    if (isValidado) {
      mensajeEstado = '¡Sus resultados se encuentran listos, validados y firmados por el Bioanalista!';
    } else {
      mensajeEstado =
        'Sus muestras están siendo procesadas en nuestro laboratorio. Por favor intente consultar nuevamente más tarde.';
    }

    return {
      success: true,
      data: {
        orderId: order.id,
        codigoOrden: order.codigoOrden,
        fechaCreacion: order.fechaCreacion.toISOString(),
        estado: order.estado,
        pacienteNombre: order.patient.nombreCompleto,
        pacienteCedula: order.patient.cedula,
        medicoTratante: order.medicoTratante,
        examenes: order.items.map((i) => ({
          codigo: i.test.codigo,
          nombre: i.test.nombre,
          categoria: i.test.categoria,
        })),
        esValidoParaDescarga: isValidado,
        mensajeEstado,
      },
    };
  } catch (error: any) {
    console.error('Error en consulta pública de resultados:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return {
      success: false,
      error: 'Error al consultar resultados. Intente nuevamente en unos momentos.',
    };
  }
}
