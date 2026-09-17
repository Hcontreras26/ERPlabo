export * from '../lib/currency';
export * from '../lib/lis';

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
  activo: boolean;
  parameters?: TestParameterDTO[];
}

export interface TestParameterDTO {
  id: string;
  testId: string;
  nombre: string;
  unidadMedida?: string | null;
  tipoResultado: 'NUMERICO' | 'TEXTO' | 'POSITIVO_NEGATIVO';
  rangoMinHombre?: number | null;
  rangoMaxHombre?: number | null;
  rangoMinMujer?: number | null;
  rangoMaxMujer?: number | null;
  rangoMinNino?: number | null;
  rangoMaxNino?: number | null;
  valorPorDefecto?: string | null;
  ordenVisualizacion: number;
}
