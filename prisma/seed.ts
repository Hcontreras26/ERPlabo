import { PrismaClient } from '@prisma/client';
import { calculatePaymentSplitSummary } from '../lib/currency';
import { evaluarResultadoLIS } from '../lib/lis';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const Sexo = {
  MASCULINO: 'MASCULINO',
  FEMENINO: 'FEMENINO',
} as const;

export const TipoResultado = {
  NUMERICO: 'NUMERICO',
  TEXTO: 'TEXTO',
  POSITIVO_NEGATIVO: 'POSITIVO_NEGATIVO',
} as const;

export const MetodoPago = {
  EFECTIVO_USD: 'EFECTIVO_USD',
  EFECTIVO_BS: 'EFECTIVO_BS',
  PAGO_MOVIL: 'PAGO_MOVIL',
  PUNTO_DE_VENTA: 'PUNTO_DE_VENTA',
  ZELLE: 'ZELLE',
  BINANCE_USDT: 'BINANCE_USDT',
  TRANSFERENCIA_BS: 'TRANSFERENCIA_BS',
} as const;

export const Moneda = {
  USD: 'USD',
  VES: 'VES',
} as const;

export const EstadoOrden = {
  PENDIENTE: 'PENDIENTE',
  EN_PROCESO: 'EN_PROCESO',
  VALIDADO: 'VALIDADO',
  ENTREGADO: 'ENTREGADO',
} as const;

export const EstadoPago = {
  PENDIENTE: 'PENDIENTE',
  PARCIAL: 'PARCIAL',
  PAGADO: 'PAGADO',
} as const;

export const Rol = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  BIOANALISTA: 'BIOANALISTA',
  RECEPCIONISTA: 'RECEPCIONISTA',
} as const;

async function main() {
  console.log('🌱 Iniciando Seed Multi-tenant & Multi-branch para ERP/LIS Venezuela...');

  // 1. Limpieza en orden estricto de dependencias
  await prisma.payment.deleteMany();
  await prisma.orderResult.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.testParameter.deleteMany();
  await prisma.test.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.labSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('🧹 Base de datos limpiada.');

  // 2. Creación del Tenant Principal (Empresa / Laboratorio Matriz)
  const tenant = await prisma.tenant.create({
    data: {
      nombre: 'Laboratorio Central C.A.',
      slug: 'central',
      rif: 'J-40123456-7',
      activo: true,
      settings: {
        create: {
          nombreLaboratorio: 'Laboratorio Central C.A.',
          rif: 'J-40123456-7',
          direccion: 'Av. Francisco de Miranda, Edif. Centro Médico, PB - Caracas',
          telefono: '+58 (212) 555-0199',
          email: 'contacto@labclinic.com.ve',
          tasaBcvActual: 36.50,
          mensajePiePagina:
            'Resultados confidenciales con fines diagnósticos. Protegidos por la ley del ejercicio del Bioanálisis.',
        },
      },
    },
  });

  console.log(`🏢 Tenant creado: ${tenant.nombre} [Slug: ${tenant.slug}, ID: ${tenant.id}]`);

  // 3. Creación de la Sucursal (Branch)
  const branch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      nombre: 'Sede Principal',
      direccion: 'Av. Francisco de Miranda, Edif. Centro Médico, PB - Caracas',
      telefono: '+58 (212) 555-0199',
    },
  });

  console.log(`📍 Sucursal creada: ${branch.nombre} [ID: ${branch.id}]`);

  // 4. Creación de Usuarios con tenantId y branchId
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const bioPasswordHash = await bcrypt.hash('bio123', 10);
  const recepcionPasswordHash = await bcrypt.hash('recepcion123', 10);

  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      email: 'admin@labclinic.com',
      passwordHash: adminPasswordHash,
      nombreCompleto: 'Dr. Roberto Mendoza (Director/Admin)',
      rol: Rol.ADMINISTRADOR,
    },
  });

  const bioUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      email: 'bio@labclinic.com',
      passwordHash: bioPasswordHash,
      nombreCompleto: 'Lic. Elena Blanco (Bioanalista MPPS 12450)',
      rol: Rol.BIOANALISTA,
    },
  });

  const recepcionUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      email: 'recepcion@labclinic.com',
      passwordHash: recepcionPasswordHash,
      nombreCompleto: 'Andrea Gómez (Recepción & Caja)',
      rol: Rol.RECEPCIONISTA,
    },
  });

  console.log('✅ Usuarios creados y vinculados a Tenant y Sucursal:', [
    `${adminUser.email} (ADMINISTRADOR)`,
    `${bioUser.email} (BIOANALISTA)`,
    `${recepcionUser.email} (RECEPCIONISTA)`,
  ]);

  // 5. Pacientes asignados al Tenant
  const pacienteHombre = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      cedula: 'V-18456123',
      nombreCompleto: 'Carlos Eduardo Mendoza Gómez',
      fechaNacimiento: new Date('1988-05-14'),
      sexo: Sexo.MASCULINO,
      telefono: '0414-1234567',
      email: 'carlos.mendoza@ejemplo.com',
      direccion: 'Av. Francisco de Miranda, Chacao, Caracas',
    },
  });

  const pacienteMujer = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      cedula: 'V-22198745',
      nombreCompleto: 'Mariana Valentina Silva Rojas',
      fechaNacimiento: new Date('1995-11-23'),
      sexo: Sexo.FEMENINO,
      telefono: '0412-9876543',
      email: 'mariana.silva@ejemplo.com',
      direccion: 'Urb. Las Mercedes, Baruta, Miranda',
    },
  });

  console.log('✅ Pacientes creados:', [pacienteHombre.nombreCompleto, pacienteMujer.nombreCompleto]);

  // 6. Catálogo de Exámenes por Tenant
  const testHematologia = await prisma.test.create({
    data: {
      tenantId: tenant.id,
      codigo: 'HEM-01',
      nombre: 'Hematología Completa',
      precioUsd: 15.00,
      tiempoEntregaHoras: 4,
      categoria: 'Hematología',
      activo: true,
      parameters: {
        create: [
          {
            nombre: 'Hemoglobina',
            unidadMedida: 'g/dL',
            tipoResultado: TipoResultado.NUMERICO,
            rangoMinHombre: 13.5,
            rangoMaxHombre: 17.5,
            rangoMinMujer: 12.0,
            rangoMaxMujer: 15.5,
            rangoMinNino: 11.0,
            rangoMaxNino: 14.5,
            ordenVisualizacion: 1,
          },
          {
            nombre: 'Hematocrito',
            unidadMedida: '%',
            tipoResultado: TipoResultado.NUMERICO,
            rangoMinHombre: 41.0,
            rangoMaxHombre: 53.0,
            rangoMinMujer: 36.0,
            rangoMaxMujer: 46.0,
            rangoMinNino: 33.0,
            rangoMaxNino: 43.0,
            ordenVisualizacion: 2,
          },
          {
            nombre: 'Leucocitos',
            unidadMedida: 'x10^3/uL',
            tipoResultado: TipoResultado.NUMERICO,
            rangoMinHombre: 4.5,
            rangoMaxHombre: 11.0,
            rangoMinMujer: 4.5,
            rangoMaxMujer: 11.0,
            rangoMinNino: 5.0,
            rangoMaxNino: 14.0,
            ordenVisualizacion: 3,
          },
          {
            nombre: 'Plaquetas',
            unidadMedida: 'x10^3/uL',
            tipoResultado: TipoResultado.NUMERICO,
            rangoMinHombre: 150.0,
            rangoMaxHombre: 450.0,
            rangoMinMujer: 150.0,
            rangoMaxMujer: 450.0,
            rangoMinNino: 150.0,
            rangoMaxNino: 450.0,
            ordenVisualizacion: 4,
          },
        ],
      },
    },
    include: { parameters: true },
  });

  const testGlicemia = await prisma.test.create({
    data: {
      tenantId: tenant.id,
      codigo: 'GLI-01',
      nombre: 'Glicemia en Ayunas',
      precioUsd: 8.00,
      tiempoEntregaHoras: 6,
      categoria: 'Química Sanguínea',
      activo: true,
      parameters: {
        create: [
          {
            nombre: 'Glucosa',
            unidadMedida: 'mg/dL',
            tipoResultado: TipoResultado.NUMERICO,
            rangoMinHombre: 70.0,
            rangoMaxHombre: 100.0,
            rangoMinMujer: 70.0,
            rangoMaxMujer: 100.0,
            rangoMinNino: 60.0,
            rangoMaxNino: 100.0,
            ordenVisualizacion: 1,
          },
        ],
      },
    },
    include: { parameters: true },
  });

  const testOrina = await prisma.test.create({
    data: {
      tenantId: tenant.id,
      codigo: 'URI-01',
      nombre: 'Examen de Orina',
      precioUsd: 10.00,
      tiempoEntregaHoras: 4,
      categoria: 'Uroanálisis',
      activo: true,
      parameters: {
        create: [
          {
            nombre: 'Aspecto',
            unidadMedida: null,
            tipoResultado: TipoResultado.TEXTO,
            valorPorDefecto: 'Límpido',
            ordenVisualizacion: 1,
          },
          {
            nombre: 'pH',
            unidadMedida: null,
            tipoResultado: TipoResultado.NUMERICO,
            rangoMinHombre: 5.0,
            rangoMaxHombre: 8.0,
            rangoMinMujer: 5.0,
            rangoMaxMujer: 8.0,
            rangoMinNino: 5.0,
            rangoMaxNino: 8.0,
            ordenVisualizacion: 2,
          },
          {
            nombre: 'Proteínas',
            unidadMedida: null,
            tipoResultado: TipoResultado.POSITIVO_NEGATIVO,
            valorPorDefecto: 'Negativo',
            ordenVisualizacion: 3,
          },
          {
            nombre: 'Leucocitos',
            unidadMedida: 'x Campo',
            tipoResultado: TipoResultado.NUMERICO,
            rangoMinHombre: 0.0,
            rangoMaxHombre: 5.0,
            rangoMinMujer: 0.0,
            rangoMaxMujer: 8.0,
            rangoMinNino: 0.0,
            rangoMaxNino: 4.0,
            ordenVisualizacion: 4,
          },
        ],
      },
    },
    include: { parameters: true },
  });

  console.log('✅ Catálogo de exámenes creado.');

  // 7. Órdenes con Tenant y Branch
  const tasaBcv = 36.50;
  const totalUsd = 23.00;
  const totalBs = totalUsd * tasaBcv;

  const orden = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      codigoOrden: 'ORD-2026-0001',
      patientId: pacienteHombre.id,
      medicoTratante: 'Dr. Alejandro Morales',
      totalUsd,
      tasaBcv,
      totalBs,
      estado: EstadoOrden.VALIDADO,
      estadoPago: EstadoPago.PAGADO,
      items: {
        create: [
          { testId: testHematologia.id, precioUnitarioUsd: 15.00 },
          { testId: testGlicemia.id, precioUnitarioUsd: 8.00 },
        ],
      },
      payments: {
        create: [
          {
            tenantId: tenant.id,
            branchId: branch.id,
            metodoPago: MetodoPago.EFECTIVO_USD,
            monedaOriginal: Moneda.USD,
            montoOriginal: 10.00,
            tasaCambio: tasaBcv,
            montoEquivalenteUsd: 10.00,
            referencia: 'EFECTIVO-USD-10',
            notas: 'Billete de $10',
          },
          {
            tenantId: tenant.id,
            branchId: branch.id,
            metodoPago: MetodoPago.PAGO_MOVIL,
            monedaOriginal: Moneda.VES,
            montoOriginal: 474.50,
            tasaCambio: tasaBcv,
            montoEquivalenteUsd: 13.00,
            referencia: '789456',
            notas: 'Pago móvil Banesco',
          },
        ],
      },
    },
  });

  for (const param of testHematologia.parameters) {
    let valor = '';
    if (param.nombre === 'Hemoglobina') valor = '14.2';
    else if (param.nombre === 'Hematocrito') valor = '43.0';
    else if (param.nombre === 'Leucocitos') valor = '12.5';
    else if (param.nombre === 'Plaquetas') valor = '220.0';

    const evaluacion = evaluarResultadoLIS(
      valor,
      param.tipoResultado as any,
      param,
      pacienteHombre.sexo as any,
      pacienteHombre.fechaNacimiento
    );

    await prisma.orderResult.create({
      data: {
        orderId: orden.id,
        testParameterId: param.id,
        valor,
        fueraDeRango: evaluacion.fueraDeRango,
        observaciones: evaluacion.fueraDeRango ? 'Leucocitosis leve' : null,
        validado: true,
        validadoPor: bioUser.nombreCompleto,
        fechaValidacion: new Date(),
      },
    });
  }

  for (const param of testGlicemia.parameters) {
    const valor = '92.0';
    const evaluacion = evaluarResultadoLIS(
      valor,
      param.tipoResultado as any,
      param,
      pacienteHombre.sexo as any,
      pacienteHombre.fechaNacimiento
    );

    await prisma.orderResult.create({
      data: {
        orderId: orden.id,
        testParameterId: param.id,
        valor,
        fueraDeRango: evaluacion.fueraDeRango,
        validado: true,
        validadoPor: bioUser.nombreCompleto,
        fechaValidacion: new Date(),
      },
    });
  }

  const orden2 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      codigoOrden: 'ORD-2026-0002',
      patientId: pacienteMujer.id,
      medicoTratante: 'Dra. Carmen Rivas',
      totalUsd: 10.00,
      tasaBcv,
      totalBs: 365.00,
      estado: EstadoOrden.EN_PROCESO,
      estadoPago: EstadoPago.PAGADO,
      items: {
        create: [{ testId: testOrina.id, precioUnitarioUsd: 10.00 }],
      },
      payments: {
        create: [
          {
            tenantId: tenant.id,
            branchId: branch.id,
            metodoPago: MetodoPago.PUNTO_DE_VENTA,
            monedaOriginal: Moneda.VES,
            montoOriginal: 365.00,
            tasaCambio: tasaBcv,
            montoEquivalenteUsd: 10.00,
            referencia: 'POS-124578',
            notas: 'Tarjeta de Débito Mercantil',
          },
        ],
      },
    },
  });

  for (const param of testOrina.parameters) {
    await prisma.orderResult.create({
      data: {
        orderId: orden2.id,
        testParameterId: param.id,
        valor: param.valorPorDefecto || '',
        fueraDeRango: false,
        validado: false,
      },
    });
  }

  console.log(`✅ Órdenes registradas y validadas en el Tenant y Sucursal.`);
  console.log('🚀 Seed Multi-tenant & Multi-branch ejecutado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
