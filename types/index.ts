export * from '../lib/currency';
export * from '../lib/lis';

export const LAB_AREA = {
  HEMATOLOGIA: 'HEMATOLOGIA',
  QUIMICA_SANGUINEA: 'QUIMICA_SANGUINEA',
  COAGULACION: 'COAGULACION',
  UROANALISIS: 'UROANALISIS',
  COPROANALISIS: 'COPROANALISIS',
  INMUNOLOGIA_SEROLOGIA: 'INMUNOLOGIA_SEROLOGIA',
  HORMONAS: 'HORMONAS',
} as const;

export type LAB_AREA_TYPE = (typeof LAB_AREA)[keyof typeof LAB_AREA];

export const LAB_AREA_LABELS: Record<string, string> = {
  HEMATOLOGIA: 'Hematología',
  QUIMICA_SANGUINEA: 'Química Sanguínea',
  COAGULACION: 'Coagulación',
  UROANALISIS: 'Uroanálisis',
  COPROANALISIS: 'Coproanálisis',
  INMUNOLOGIA_SEROLOGIA: 'Inmunología & Serología',
  HORMONAS: 'Hormonas & Marcadores',
};

export interface PatientDTO {
  id: string;
  cedula: string;
  nombreCompleto: string;
  fechaNacimiento: Date;
  sexo: 'MASCULINO' | 'FEMENINO';
  telefono: string;
  email?: string | null;
  direccion?: string | null;
}

export interface TestDTO {
  id: string;
  codigo: string;
  nombre: string;
  precioUsd: number;
  tiempoEntregaHoras: number;
  categoria: string;
  area: string;
  tipoMuestra: string;
  activo: boolean;
  parameters?: TestParameterDTO[];
}

export interface TestParameterDTO {
  id: string;
  testId: string;
  nombre: string;
  unidadMedida?: string | null;
  tipoResultado: 'NUMERICO' | 'TEXTO' | 'POSITIVO_NEGATIVO';
  requiereControl?: boolean;
  rangoMinHombre?: number | null;
  rangoMaxHombre?: number | null;
  rangoMinMujer?: number | null;
  rangoMaxMujer?: number | null;
  rangoMinNino?: number | null;
  rangoMaxNino?: number | null;
  valorPorDefecto?: string | null;
  ordenVisualizacion: number;
}

