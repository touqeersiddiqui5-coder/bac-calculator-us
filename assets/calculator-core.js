export const DENSITY = 0.789;
export const US_OUNCE = 29.5735295625;

export function alcoholGrams(drinks) {
  if (!Array.isArray(drinks) || !drinks.length || drinks.length > 30) throw new RangeError('drinks');
  return drinks.reduce((sum, d) => {
    if (![d.volume, d.abv, d.count].every(Number.isFinite)) throw new RangeError('drink');
    if (!['ml', 'oz'].includes(d.unit) || d.volume <= 0 || d.volume > (d.unit === 'oz' ? 100 : 3000) || d.abv < 0 || d.abv > 100 || d.count <= 0 || d.count > 30) throw new RangeError('drink');
    return sum + d.volume * (d.unit === 'oz' ? US_OUNCE : 1) * d.abv / 100 * d.count * DENSITY;
  }, 0);
}

export function estimateBAC({ weight, weightUnit, factor, hours, drinks }) {
  if (![weight, factor, hours].every(Number.isFinite) || !['kg','lb'].includes(weightUnit)) throw new RangeError('input');
  const kg = weightUnit === 'lb' ? weight * 0.45359237 : weight;
  if (kg < 30 || kg > 350 || ![0.55, 0.68].includes(factor) || hours < 0 || hours > 72) throw new RangeError('input');
  const grams = alcoholGrams(drinks);
  const theoretical = grams / (kg * factor * 10);
  return {
    grams, theoretical,
    estimate: Math.max(0, theoretical - hours * 0.015),
    low: Math.max(0, theoretical - hours * 0.020),
    high: Math.max(0, theoretical - hours * 0.010),
    standardDrinks: { us: grams / 14, au: grams / 10, ca: grams / 13.45, uk: grams / DENSITY / 10 }
  };
}
