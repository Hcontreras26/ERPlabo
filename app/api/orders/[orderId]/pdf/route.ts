import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { LabReportPdf } from '@/components/reports/LabReportPdf';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
        items: {
          include: {
            test: {
              include: {
                parameters: {
                  orderBy: { ordenVisualizacion: 'asc' },
                },
              },
            },
          },
        },
        results: {
          include: {
            testParameter: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Comprobar estado de validación
    if (order.estado !== 'VALIDADO' && order.estado !== 'ENTREGADO') {
      return NextResponse.json(
        {
          error:
            'Los resultados de esta orden aún no han sido validados por el bioanalista. Estado actual: ' +
            order.estado,
        },
        { status: 400 }
      );
    }

    // Renderizar PDF a Buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(LabReportPdf, { order }) as React.ReactElement<any>
    );

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Informe-Laboratorio-${order.codigoOrden}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Error generando PDF de resultados:', error);
    return NextResponse.json(
      { error: 'Error interno al generar el informe en PDF: ' + error.message },
      { status: 500 }
    );
  }
}
