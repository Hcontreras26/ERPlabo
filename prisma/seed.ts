import { PrismaClient } from '@prisma/client';
import { calculatePaymentSplitSummary } from '../lib/currency';
import { evaluarResultadoLIS } from '../lib/lis';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const Sexo = {
  MASCULINO: 'MASCULINO',
  FEMENINO: 'FEMENINO',
} as const;

export const LAB_AREA = {
  HEMATOLOGIA: 'HEMATOLOGIA',
  QUIMICA_SANGUINEA: 'QUIMICA_SANGUINEA',
  COAGULACION: 'COAGULACION',
  UROANALISIS: 'UROANALISIS',
  COPROANALISIS: 'COPROANALISIS',
  INMUNOLOGIA_SEROLOGIA: 'INMUNOLOGIA_SEROLOGIA',
  HORMONAS: 'HORMONAS',
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
  console.log('🌱 Iniciando Seed LIS/ERP Médico con Áreas Analíticas Especializadas...');

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
      nombreCompleto: 'Lic. Elena Blanco (MPPS 12450)',
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

  console.log('✅ Usuarios creados y vinculados:', [
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

  // 6. Catálogo de Exámenes Clínicos por Área Analítica
  // ----------------------------------------------------
  // A. ÁREA: HEMATOLOGÍA
  // ----------------------------------------------------
  const testHematologia = await prisma.test.create({
    data: {
      tenantId: tenant.id,
      codigo: 'HEM-01',
      nombre: 'Hematología Completa',
      precioUsd: 15.00,
      tiempoEntregaHoras: 4,
      categoria: 'Hematología',
      area: LAB_AREA.HEMATOLOGIA,
      tipoMuestra: 'Sangre Total EDTA',
      activo: true,
      parameters: {
        create: [
          {
            nombre: 'Leucocitos',
            unidadMedida: 'x10^3/uL',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: false,
            rangoMinHombre: 4.5,
            rangoMaxHombre: 11.0,
            rangoMinMujer: 4.5,
            rangoMaxMujer: 11.0,
            rangoMinNino: 5.0,
            rangoMaxNino: 14.0,
            ordenVisualizacion: 1,
          },
          {
            nombre: 'Hematocrito',
            unidadMedida: '%',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: false,
            rangoMinHombre: 41.0,
            rangoMaxHombre: 53.0,
            rangoMinMujer: 36.0,
            rangoMaxMujer: 46.0,
            rangoMinNino: 33.0,
            rangoMaxNino: 43.0,
            ordenVisualizacion: 2,
          },
          {
            nombre: 'Hemoglobina',
            unidadMedida: 'g/dL',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: false,
            rangoMinHombre: 13.5,
            rangoMaxHombre: 17.5,
            rangoMinMujer: 12.0,
            rangoMaxMujer: 15.5,
            rangoMinNino: 11.0,
            rangoMaxNino: 14.5,
            ordenVisualizacion: 3,
          },
          {
            nombre: 'Plaquetas',
            unidadMedida: 'x10^3/uL',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: false,
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

  const testFrotis = await prisma.test.create({
    data: {
      tenantId: tenant.id,
      codigo: 'FSP-01',
      nombre: 'Frotis de Sangre Periférica',
      precioUsd: 10.00,
      tiempoEntregaHoras: 6,
      categoria: 'Hematología',
      area: LAB_AREA.HEMATOLOGIA,
      tipoMuestra: 'Sangre Total EDTA',
      activo: true,
      parameters: {
        create: [
          {
            nombre: 'Observación Microscópica Morfológica',
            unidadMedida: null,
            tipoResultado: TipoResultado.TEXTO,
            requiereControl: false,
            valorPorDefecto:
              'Serie Roja: Normocítica, normocrómica. Serie Blanca: Morfología y recuento leucocitario conservado. Serie Plaquetaria: Adecuadas en número y morfología, sin agregados plaquetarios.',
            ordenVisualizacion: 1,
          },
        ],
      },
    },
    include: { parameters: true },
  });

  // ----------------------------------------------------
  // B. ÁREA: QUÍMICA SANGUÍNEA
  // ----------------------------------------------------
  const testGlicemia = await prisma.test.create({
    data: {
      tenantId: tenant.id,
      codigo: 'GLI-01',
      nombre: 'Glicemia Basal',
      precioUsd: 8.00,
      tiempoEntregaHoras: 4,
      categoria: 'Química Sanguínea',
      area: LAB_AREA.QUIMICA_SANGUINEA,
      tipoMuestra: 'Suero',
      activo: true,
      parameters: {
        create: [
          {
            nombre: 'Glucosa Basal',
            unidadMedida: 'mg/dL',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: false,
            rangoMinHombre: 70.0,
            rangoMaxHombre: 110.0,
            rangoMinMujer: 70.0,
            rangoMaxMujer: 110.0,
            rangoMinNino: 60.0,
            rangoMaxNino: 100.0,
            ordenVisualizacion: 1,
          },
        ],
      },
    },
    include: { parameters: true },
  });

  const testUrea = await prisma.test.create({
    data: {
      tenantId: tenant.id,
      codigo: 'URE-01',
      nombre: 'Urea',
      precioUsd: 8.00,
      tiempoEntregaHoras: 4,
      categoria: 'Química Sanguínea',
      area: LAB_AREA.QUIMICA_SANGUINEA,
      tipoMuestra: 'Suero',
      activo: true,
      parameters: {
        create: [
          {
            nombre: 'Urea',
            unidadMedida: 'mg/dL',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: false,
            rangoMinHombre: 15.0,
            rangoMaxHombre: 45.0,
            rangoMinMujer: 15.0,
            rangoMaxMujer: 45.0,
            rangoMinNino: 10.0,
            rangoMaxNino: 40.0,
            ordenVisualizacion: 1,
          },
        ],
      },
    },
    include: { parameters: true },
  });

  // ----------------------------------------------------
  // C. ÁREA: COAGULACIÓN
  // ----------------------------------------------------
  const testTP = await prisma.test.create({
    data: {
      tenantId: tenant.id,
      codigo: 'TP-01',
      nombre: 'Tiempo de Protrombina (TP)',
      precioUsd: 10.00,
      tiempoEntregaHoras: 4,
      categoria: 'Coagulación',
      area: LAB_AREA.COAGULACION,
      tipoMuestra: 'Plasma Citratado',
      activo: true,
      parameters: {
        create: [
          {
            nombre: 'Paciente (seg)',
            unidadMedida: 'seg',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: true,
            rangoMinHombre: 11.0,
            rangoMaxHombre: 14.5,
            rangoMinMujer: 11.0,
            rangoMaxMujer: 14.5,
            ordenVisualizacion: 1,
          },
          {
            nombre: 'Testigo / Control (seg)',
            unidadMedida: 'seg',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: false,
            rangoMinHombre: 11.5,
            rangoMaxHombre: 13.5,
            rangoMinMujer: 11.5,
            rangoMaxMujer: 13.5,
            valorPorDefecto: '12.2',
            ordenVisualizacion: 2,
          },
          {
            nombre: '% de Actividad',
            unidadMedida: '%',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: false,
            rangoMinHombre: 70.0,
            rangoMaxHombre: 100.0,
            rangoMinMujer: 70.0,
            rangoMaxMujer: 100.0,
            ordenVisualizacion: 3,
          },
          {
            nombre: 'INR',
            unidadMedida: 'INR',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: false,
            rangoMinHombre: 0.8,
            rangoMaxHombre: 1.2,
            rangoMinMujer: 0.8,
            rangoMaxMujer: 1.2,
            ordenVisualizacion: 4,
          },
        ],
      },
    },
    include: { parameters: true },
  });

  const testTPT = await prisma.test.create({
    data: {
      tenantId: tenant.id,
      codigo: 'TPT-01',
      nombre: 'Tiempo de Tromboplastina (TPT)',
      precioUsd: 10.00,
      tiempoEntregaHoras: 4,
      categoria: 'Coagulación',
      area: LAB_AREA.COAGULACION,
      tipoMuestra: 'Plasma Citratado',
      activo: true,
      parameters: {
        create: [
          {
            nombre: 'Paciente (seg)',
            unidadMedida: 'seg',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: true,
            rangoMinHombre: 25.0,
            rangoMaxHombre: 38.0,
            rangoMinMujer: 25.0,
            rangoMaxMujer: 38.0,
            ordenVisualizacion: 1,
          },
          {
            nombre: 'Testigo / Control (seg)',
            unidadMedida: 'seg',
            tipoResultado: TipoResultado.NUMERICO,
            requiereControl: false,
            rangoMinHombre: 28.0,
            rangoMaxHombre: 32.0,
            rangoMinMujer: 28.0,
            rangoMaxMujer: 32.0,
            valorPorDefecto: '30.0',
            ordenVisualizacion: 2,
          },
        ],
      },
    },
    include: { parameters: true },
  });

  console.log('✅ Catálogo de exámenes médicos configurado con Áreas y Controles.');

  // 7. Registro de Órdenes de Prueba
  // ----------------------------------------------------
  // ORDEN 1: Perfil Preoperatorio (Hematología + Glicemia + Urea + TP) -> Carlos Mendoza (VALIDADO)
  const tasaBcv = 36.50;
  const totalUsd1 = 15.00 + 8.00 + 8.00 + 10.00; // 41.00 USD
  const totalBs1 = totalUsd1 * tasaBcv;

  const orden1 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      codigoOrden: 'ORD-2026-0001',
      patientId: pacienteHombre.id,
      medicoTratante: 'Dr. Alejandro Morales (Cirugía)',
      totalUsd: totalUsd1,
      tasaBcv,
      totalBs: totalBs1,
      estado: EstadoOrden.VALIDADO,
      estadoPago: EstadoPago.PAGADO,
      items: {
        create: [
          { testId: testHematologia.id, precioUnitarioUsd: 15.00 },
          { testId: testGlicemia.id, precioUnitarioUsd: 8.00 },
          { testId: testUrea.id, precioUnitarioUsd: 8.00 },
          { testId: testTP.id, precioUnitarioUsd: 10.00 },
        ],
      },
      payments: {
        create: [
          {
            tenantId: tenant.id,
            branchId: branch.id,
            metodoPago: MetodoPago.EFECTIVO_USD,
            monedaOriginal: Moneda.USD,
            montoOriginal: 20.00,
            tasaCambio: tasaBcv,
            montoEquivalenteUsd: 20.00,
            referencia: 'BILLETE-20-USD',
            notas: 'Pago parcial efectivo USD',
          },
          {
            tenantId: tenant.id,
            branchId: branch.id,
            metodoPago: MetodoPago.PAGO_MOVIL,
            monedaOriginal: Moneda.VES,
            montoOriginal: 21.00 * tasaBcv,
            tasaCambio: tasaBcv,
            montoEquivalenteUsd: 21.00,
            referencia: 'PM-884920',
            notas: 'Pago móvil Banesco',
          },
        ],
      },
    },
  });

  // Resultados Orden 1
  // Hematología
  for (const param of testHematologia.parameters) {
    let valor = '';
    if (param.nombre === 'Hemoglobina') valor = '14.5';
    else if (param.nombre === 'Hematocrito') valor = '44.0';
    else if (param.nombre === 'Leucocitos') valor = '7.2';
    else if (param.nombre === 'Plaquetas') valor = '245.0';

    const evalRes = evaluarResultadoLIS(
      valor,
      param.tipoResultado as any,
      param,
      pacienteHombre.sexo as any,
      pacienteHombre.fechaNacimiento
    );

    await prisma.orderResult.create({
      data: {
        orderId: orden1.id,
        testParameterId: param.id,
        valor,
        fueraDeRango: evalRes.fueraDeRango,
        validado: true,
        validadoPor: bioUser.nombreCompleto,
        fechaValidacion: new Date(),
      },
    });
  }

  // Glicemia Basal
  for (const param of testGlicemia.parameters) {
    const valor = '94.0';
    const evalRes = evaluarResultadoLIS(
      valor,
      param.tipoResultado as any,
      param,
      pacienteHombre.sexo as any,
      pacienteHombre.fechaNacimiento
    );
    await prisma.orderResult.create({
      data: {
        orderId: orden1.id,
        testParameterId: param.id,
        valor,
        fueraDeRango: evalRes.fueraDeRango,
        validado: true,
        validadoPor: bioUser.nombreCompleto,
        fechaValidacion: new Date(),
      },
    });
  }

  // Urea
  for (const param of testUrea.parameters) {
    const valor = '28.0';
    const evalRes = evaluarResultadoLIS(
      valor,
      param.tipoResultado as any,
      param,
      pacienteHombre.sexo as any,
      pacienteHombre.fechaNacimiento
    );
    await prisma.orderResult.create({
      data: {
        orderId: orden1.id,
        testParameterId: param.id,
        valor,
        fueraDeRango: evalRes.fueraDeRango,
        validado: true,
        validadoPor: bioUser.nombreCompleto,
        fechaValidacion: new Date(),
      },
    });
  }

  // TP (Tiempo de Protrombina con Paciente vs Testigo)
  for (const param of testTP.parameters) {
    let valor = '';
    let valorControl: string | null = null;
    if (param.nombre === 'Paciente (seg)') {
      valor = '12.8';
      valorControl = '12.2';
    } else if (param.nombre === 'Testigo / Control (seg)') {
      valor = '12.2';
    } else if (param.nombre === '% de Actividad') {
      valor = '92.0';
    } else if (param.nombre === 'INR') {
      valor = '1.05';
    }

    const evalRes = evaluarResultadoLIS(
      valor,
      param.tipoResultado as any,
      param,
      pacienteHombre.sexo as any,
      pacienteHombre.fechaNacimiento
    );

    await prisma.orderResult.create({
      data: {
        orderId: orden1.id,
        testParameterId: param.id,
        valor,
        valorControl,
        fueraDeRango: evalRes.fueraDeRango,
        validado: true,
        validadoPor: bioUser.nombreCompleto,
        fechaValidacion: new Date(),
      },
    });
  }

  // ----------------------------------------------------
  // ORDEN 2: Frotis + TPT -> Mariana Silva (EN_PROCESO)
  const totalUsd2 = 10.00 + 10.00; // 20.00 USD
  const totalBs2 = totalUsd2 * tasaBcv;

  const orden2 = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      codigoOrden: 'ORD-2026-0002',
      patientId: pacienteMujer.id,
      medicoTratante: 'Dra. Carmen Rivas (Hematología)',
      totalUsd: totalUsd2,
      tasaBcv,
      totalBs: totalBs2,
      estado: EstadoOrden.EN_PROCESO,
      estadoPago: EstadoPago.PAGADO,
      items: {
        create: [
          { testId: testFrotis.id, precioUnitarioUsd: 10.00 },
          { testId: testTPT.id, precioUnitarioUsd: 10.00 },
        ],
      },
      payments: {
        create: [
          {
            tenantId: tenant.id,
            branchId: branch.id,
            metodoPago: MetodoPago.PUNTO_DE_VENTA,
            monedaOriginal: Moneda.VES,
            montoOriginal: totalBs2,
            tasaCambio: tasaBcv,
            montoEquivalenteUsd: totalUsd2,
            referencia: 'POS-774921',
            notas: 'Tarjeta Débito Mercantil',
          },
        ],
      },
    },
  });

  // Resultados Orden 2 (Borrador inicial para el Bioanalista)
  for (const param of testFrotis.parameters) {
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

  for (const param of testTPT.parameters) {
    await prisma.orderResult.create({
      data: {
        orderId: orden2.id,
        testParameterId: param.id,
        valor: param.valorPorDefecto || '',
        valorControl: param.requiereControl ? '30.0' : null,
        fueraDeRango: false,
        validado: false,
      },
    });
  }

  console.log(`✅ Órdenes clínicas ORD-2026-0001 y ORD-2026-0002 creadas con éxito.`);
  console.log('🚀 Seed con Flujo Analítico Clínico completado.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
