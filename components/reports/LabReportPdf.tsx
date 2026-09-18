import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 35,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#0284c7',
    paddingBottom: 12,
    marginBottom: 12,
  },
  labTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0369a1',
    letterSpacing: 0.5,
  },
  labSubtitle: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  labFiscalInfo: {
    fontSize: 8,
    textAlign: 'right',
    color: '#475569',
    lineHeight: 1.3,
  },
  patientBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: 9,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
  },
  fieldValueRegular: {
    fontSize: 9,
    color: '#334155',
  },
  testSection: {
    marginBottom: 14,
  },
  testHeader: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#f1f5f9',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  colParam: {
    width: '35%',
  },
  colResult: {
    width: '22%',
  },
  colUnit: {
    width: '18%',
  },
  colRange: {
    width: '25%',
  },
  outOfRangeText: {
    fontFamily: 'Helvetica-Bold',
    color: '#b91c1c',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 35,
    right: 35,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  signatureBox: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#475569',
    textAlign: 'center',
    paddingTop: 4,
  },
  signatureText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  signatureSubText: {
    fontSize: 7,
    color: '#64748b',
  },
  legalText: {
    fontSize: 6.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 1.2,
  },
});

export interface LabReportPdfProps {
  order: {
    codigoOrden: string;
    fechaCreacion: string | Date;
    medicoTratante?: string | null;
    patient: {
      cedula: string;
      nombreCompleto: string;
      fechaNacimiento: string | Date;
      sexo: string;
      telefono: string;
    };
    items: Array<{
      test: {
        id: string;
        codigo: string;
        nombre: string;
        categoria: string;
        area?: string;
        tipoMuestra?: string;
        parameters: Array<{
          id: string;
          nombre: string;
          unidadMedida: string | null;
          tipoResultado: string;
          requiereControl?: boolean;
          rangoMinHombre: number | null;
          rangoMaxHombre: number | null;
          rangoMinMujer: number | null;
          rangoMaxMujer: number | null;
          rangoMinNino: number | null;
          rangoMaxNino: number | null;
          valorPorDefecto: string | null;
        }>;
      };
    }>;
    results: Array<{
      testParameterId: string;
      valor: string;
      valorControl?: string | null;
      fueraDeRango: boolean;
      observaciones: string | null;
      validado: boolean;
      validadoPor: string | null;
      fechaValidacion: string | Date | null;
    }>;
  };
}

export function LabReportPdf({ order }: LabReportPdfProps) {
  const patient = order.patient;
  const isMale = patient.sexo === 'MASCULINO';
  
  // Calcular edad
  const birth = new Date(patient.fechaNacimiento);
  const diff = Date.now() - birth.getTime();
  const age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
  const isChild = age < 12;

  // Bioanalista validador principal
  const validadoPor = order.results.find((r) => r.validadoPor)?.validadoPor || 'Lic. Elena Blanco (MPPS 12450)';

  return (
    <Document title={`Informe-Medico-${order.codigoOrden}`} author="Laboratorio Clínico Central">
      <Page size="LETTER" style={styles.page}>
        {/* 1. CABECERA DEL LABORATORIO */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.labTitle}>LABCLINIC DIAGNOSTICS</Text>
            <Text style={styles.labSubtitle}>Laboratorio Clínico Automatizado & Especializado</Text>
            <Text style={styles.labSubtitle}>Caracas - Venezuela</Text>
          </View>
          <View style={styles.labFiscalInfo}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>R.I.F.: J-40123456-7</Text>
            <Text>Av. Francisco de Miranda, Edif. Centro Médico, PB</Text>
            <Text>Teléf.: +58 (212) 555-0199 / +58 (414) 123-4567</Text>
            <Text>Email: resultados@labclinic.com.ve</Text>
          </View>
        </View>

        {/* 2. CUADRO DE DATOS DEL PACIENTE */}
        <View style={styles.patientBox}>
          <View style={styles.patientRow}>
            <View style={{ width: '50%' }}>
              <Text style={styles.fieldLabel}>Paciente</Text>
              <Text style={styles.fieldValue}>{patient.nombreCompleto}</Text>
            </View>
            <View style={{ width: '25%' }}>
              <Text style={styles.fieldLabel}>Cédula / Identificación</Text>
              <Text style={styles.fieldValue}>{patient.cedula}</Text>
            </View>
            <View style={{ width: '25%' }}>
              <Text style={styles.fieldLabel}>N° de Orden</Text>
              <Text style={styles.fieldValue}>{order.codigoOrden}</Text>
            </View>
          </View>

          <View style={styles.patientRow}>
            <View style={{ width: '25%' }}>
              <Text style={styles.fieldLabel}>Edad / Sexo</Text>
              <Text style={styles.fieldValueRegular}>
                {age} años ({isMale ? 'Masculino' : 'Femenino'})
              </Text>
            </View>
            <View style={{ width: '25%' }}>
              <Text style={styles.fieldLabel}>Fecha de Muestra</Text>
              <Text style={styles.fieldValueRegular}>
                {new Date(order.fechaCreacion).toLocaleDateString('es-VE')}
              </Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text style={styles.fieldLabel}>Médico Tratante</Text>
              <Text style={styles.fieldValueRegular}>
                {order.medicoTratante || 'Particular / A solicitud'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. TABLA DE RESULTADOS AGRUPADA POR EXAMEN */}
        {order.items.map((item, idx) => {
          const test = item.test;
          return (
            <View key={test.id || idx} style={styles.testSection}>
              {/* Encabezado del Examen */}
              <View style={styles.testHeader}>
                <Text>{test.nombre.toUpperCase()}</Text>
                <Text style={{ fontSize: 8 }}>
                  {test.categoria} {test.tipoMuestra ? `• Muestra: ${test.tipoMuestra}` : ''}
                </Text>
              </View>

              {/* Columnas de la Tabla */}
              <View style={styles.tableHeader}>
                <Text style={styles.colParam}>PARÁMETRO / ANALITO</Text>
                <Text style={styles.colResult}>RESULTADO</Text>
                <Text style={styles.colUnit}>UNIDADES</Text>
                <Text style={styles.colRange}>VALORES DE REFERENCIA</Text>
              </View>

              {/* Filas de Parámetros */}
              {test.parameters.map((param) => {
                const result = order.results.find((r) => r.testParameterId === param.id);
                const valor = result?.valor || param.valorPorDefecto || '-';
                const valorControl = result?.valorControl;
                const isOutOfRange = result?.fueraDeRango || false;

                // Rango de Referencia
                let min: number | null = null;
                let max: number | null = null;
                if (isChild && (param.rangoMinNino != null || param.rangoMaxNino != null)) {
                  min = param.rangoMinNino;
                  max = param.rangoMaxNino;
                } else if (isMale) {
                  min = param.rangoMinHombre;
                  max = param.rangoMaxHombre;
                } else {
                  min = param.rangoMinMujer;
                  max = param.rangoMaxMujer;
                }

                let rangeStr = 'Referencial';
                if (param.requiereControl && valorControl) {
                  rangeStr = `Testigo: ${valorControl} ${param.unidadMedida || 'seg'}`;
                } else if (param.tipoResultado === 'NUMERICO' && min != null && max != null) {
                  rangeStr = `${min} - ${max}`;
                } else if (param.tipoResultado === 'POSITIVO_NEGATIVO') {
                  rangeStr = 'Negativo / No reactivo';
                }

                const displayResult = param.requiereControl && valorControl
                  ? `${valor} (Control: ${valorControl})`
                  : valor;

                return (
                  <View key={param.id} style={styles.tableRow}>
                    <Text style={styles.colParam}>{param.nombre}</Text>
                    <Text
                      style={[
                        styles.colResult,
                        isOutOfRange ? styles.outOfRangeText : { fontFamily: 'Helvetica' },
                      ]}
                    >
                      {displayResult} {isOutOfRange ? '*' : ''}
                    </Text>
                    <Text style={styles.colUnit}>{param.unidadMedida || '-'}</Text>
                    <Text style={styles.colRange}>{rangeStr}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* 4. PIE DE PÁGINA CON FIRMA Y TEXTO LEGAL */}
        <View style={styles.footer}>
          <View style={styles.signatureContainer}>
            <View>
              <Text style={{ fontSize: 7, color: '#64748b' }}>
                * Los valores marcados con asterisco (*) se encuentran fuera del rango de referencia biológico.
              </Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureText}>{validadoPor}</Text>
              <Text style={styles.signatureSubText}>Bioanalista Validador / Especialista LIS</Text>
            </View>
          </View>

          <Text style={styles.legalText}>
            Este documento contiene información médica confidencial protegida por la ley del ejercicio del Bioanálisis.
            Los resultados corresponden únicamente a la muestra recibida y analizada en las instalaciones de LabClinic.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
