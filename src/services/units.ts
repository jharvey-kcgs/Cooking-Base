// Display-only unit conversion. Stored recipes are never changed.
// Volume converts to volume and weight to weight; there is no cup <-> gram
// conversion because that depends on the ingredient.

export type UnitSystem = 'standard' | 'metric';

const ML_PER: Record<string, number> = {
  tsp: 4.92892,
  tbsp: 14.7868,
  'fl oz': 29.5735,
  cup: 236.588,
  pt: 473.176,
  qt: 946.353,
  gal: 3785.41,
  ml: 1,
  l: 1000,
};

const G_PER: Record<string, number> = { oz: 28.3495, lb: 453.592, g: 1, kg: 1000 };

const METRIC_UNITS = new Set(['ml', 'l', 'g', 'kg']);

export function isUnitSystem(v: unknown): v is UnitSystem {
  return v === 'standard' || v === 'metric';
}

export function isMetricUnit(unit: string | null): boolean {
  return unit !== null && METRIC_UNITS.has(unit);
}

type Kind = 'volume' | 'weight';

function kindOf(unit: string): Kind | null {
  if (unit in ML_PER) return 'volume';
  if (unit in G_PER) return 'weight';
  return null; // pinch, dash, anything unknown
}

// Round metric amounts to something a person would measure.
export function niceMetric(v: number): number {
  if (v >= 100) return Math.round(v / 5) * 5;
  if (v >= 10) return Math.round(v);
  const half = Math.round(v * 2) / 2;
  return half > 0 ? half : Math.round(v * 100) / 100;
}

export type Measure = { quantity: number; unit: string | null };

export function convertMeasure(quantity: number, unit: string | null, system: UnitSystem): Measure {
  if (unit === null) return { quantity, unit };
  const kind = kindOf(unit);
  if (kind === null) return { quantity, unit };
  const metric = isMetricUnit(unit);
  if (metric === (system === 'metric')) return { quantity, unit };

  if (kind === 'volume') {
    const ml = quantity * ML_PER[unit];
    if (system === 'metric') {
      return ml >= 1000
        ? { quantity: Math.round(ml / 10) / 100, unit: 'l' }
        : { quantity: niceMetric(ml), unit: 'ml' };
    }
    if (ml < 14) return { quantity: ml / ML_PER.tsp, unit: 'tsp' };
    if (ml < 59) return { quantity: ml / ML_PER.tbsp, unit: 'tbsp' };
    if (ml < 946) return { quantity: ml / ML_PER.cup, unit: 'cup' };
    if (ml < 3785) return { quantity: ml / ML_PER.qt, unit: 'qt' };
    return { quantity: ml / ML_PER.gal, unit: 'gal' };
  }

  const g = quantity * G_PER[unit];
  if (system === 'metric') {
    return g >= 1000
      ? { quantity: Math.round(g / 10) / 100, unit: 'kg' }
      : { quantity: niceMetric(g), unit: 'g' };
  }
  return g >= G_PER.lb
    ? { quantity: g / G_PER.lb, unit: 'lb' }
    : { quantity: g / G_PER.oz, unit: 'oz' };
}

const TEMP_RE = /(\d{2,3})(\s?°\s?|\s+degrees\s+)(F|C|Fahrenheit|Celsius)\b/gi;

// "350°F" -> "175°C" in metric mode, "180°C" -> "350°F" in standard mode.
export function convertTemperatures(text: string, system: UnitSystem): string {
  return text.replace(TEMP_RE, (match, num: string, _sep: string, scale: string) => {
    const n = Number(num);
    const isF = scale[0].toUpperCase() === 'F';
    if (isF && system === 'metric') {
      return `${Math.round((((n - 32) * 5) / 9) / 5) * 5}°C`;
    }
    if (!isF && system === 'standard') {
      return `${Math.round(((n * 9) / 5 + 32) / 25) * 25}°F`;
    }
    return match;
  });
}
