'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function getActiveTests() {
  try {
    const session = await requireAuth();
    const tenantId = session.tenantId;

    const tests = await prisma.test.findMany({
      where: {
        tenantId,
        activo: true,
      },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
      include: {
        parameters: {
          orderBy: { ordenVisualizacion: 'asc' },
        },
      },
    });

    return {
      success: true,
      tests: tests.map((t) => ({
        ...t,
        precioUsd: Number(t.precioUsd),
      })),
    };
  } catch (error: any) {
    console.error('Error obteniendo catálogo de exámenes:', error);
    return { success: false, error: error.message || 'Error al cargar catálogo', tests: [] };
  }
}
