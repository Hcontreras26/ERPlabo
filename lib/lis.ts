export type Sexo = 'MASCULINO' | 'FEMENINO';

export interface ParameterRangeConfig {
  rangoMinHombre?: number | null;
  rangoMaxHombre?: number | null;
  rangoMinMujer?: number | null;
  rangoMaxMujer?: number | null;
  rangoMinNino?: number | null;
  rangoMaxNino?: number | null;
}

export interface EvaluationResult {
  fueraDeRango: boolean;
  interpretacion: 'NORMAL' | 'BAJO' | 'ALTO' | 'ANORMAL' | 'NO_APLICA';
  rangoAplicadoTexto: string;
}

/**
 * Determina si el paciente es considerado niño (ej. < 12 años)
 */
export function esNino(fechaNacimiento: Date | string, fechaReferencia: Date = new Date()): boolean {
  const birth = new Date(fechaNacimiento);
  const diffTime = Math.abs(fechaReferencia.getTime() - birth.getTime());
  const ageYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return ageYears < 12;
}

/**
 * Evalúa automáticamente si un resultado de analito clínico está fuera de rango
 * basándose en el sexo y la edad del paciente.
 */
export function evaluarResultadoLIS(
  valorInput: string,
  tipoResultado: 'NUMERICO' | 'TEXTO' | 'POSITIVO_NEGATIVO',
  configRangos: ParameterRangeConfig,
  sexoPaciente: Sexo,
  fechaNacimientoPaciente: Date | string
): EvaluationResult {
  const esInfante = esNino(fechaNacimientoPaciente);

  if (tipoResultado === 'NUMERICO') {
    const valorNumerico = parseFloat(valorInput.replace(',', '.').trim());

    if (isNaN(valorNumerico)) {
      return {
        fueraDeRango: false,
        interpretacion: 'NO_APLICA',
        rangoAplicadoTexto: 'Sin valor numérico',
      };
    }

    let min: number | null | undefined;
    let max: number | null | undefined;
    let etiqueta = '';

    if (esInfante && (configRangos.rangoMinNino != null || configRangos.rangoMaxNino != null)) {
      min = configRangos.rangoMinNino;
      max = configRangos.rangoMaxNino;
      etiqueta = 'Niño';
    } else if (sexoPaciente === 'MASCULINO') {
      min = configRangos.rangoMinHombre;
      max = configRangos.rangoMaxHombre;
      etiqueta = 'Hombre';
    } else {
      min = configRangos.rangoMinMujer;
      max = configRangos.rangoMaxMujer;
      etiqueta = 'Mujer';
    }

    const minStr = min != null ? `${min}` : '';
    const maxStr = max != null ? `${max}` : '';
    const rangoAplicadoTexto = min != null && max != null ? `${minStr} - ${maxStr} (${etiqueta})` : 'Referencial';

    if (min != null && valorNumerico < min) {
      return { fueraDeRango: true, interpretacion: 'BAJO', rangoAplicadoTexto };
    }
    if (max != null && valorNumerico > max) {
      return { fueraDeRango: true, interpretacion: 'ALTO', rangoAplicadoTexto };
    }

    return { fueraDeRango: false, interpretacion: 'NORMAL', rangoAplicadoTexto };
  }

  if (tipoResultado === 'POSITIVO_NEGATIVO') {
    const normalizado = valorInput.toUpperCase().trim();
    const esPositivo = normalizado.includes('POSITIVO') || normalizado.includes('REACTIVO') || normalizado === '+';
    return {
      fueraDeRango: esPositivo,
      interpretacion: esPositivo ? 'ANORMAL' : 'NORMAL',
      rangoAplicadoTexto: 'Negativo / No reactivo',
    };
  }

  // Texto libre / Cualitativo
  return {
    fueraDeRango: false,
    interpretacion: 'NORMAL',
    rangoAplicadoTexto: 'Referencial',
  };
}
