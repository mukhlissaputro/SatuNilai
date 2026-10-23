export type ScoringMode = 'weighted_average' | 'direct_points';
export type ScoreRow = {
  indicatorId: string | null; subcategoryId: string; categoryId: string;
  categoryWeight?: number | null; subcategoryWeight?: number | null;
  maxValue?: number | null; internalValue?: number | null; assessorValue?: number | null;
  finalValue?: number | null; targetValue?: number | null;
  status?: string | null; evidenceCount?: number; verifiedValue?: number | null;
  accepted?: boolean; rejected?: boolean;
};
export function scoringMode(value: unknown): ScoringMode {
  if (value === undefined || value === null || value === 'weighted_average') return 'weighted_average';
  if (value === 'direct_points') return value;
  throw new Error('Mode penilaian tidak valid');
}
export function indicatorMaximum(mode: ScoringMode, maximum: unknown, periodMaximum: number) {
  const value = maximum == null || maximum === '' ? (mode === 'direct_points' ? NaN : periodMaximum) : Number(maximum);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Nilai maksimal indikator wajib lebih dari nol');
  return value;
}
export function validateScore(value: unknown, maximum: number) {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '' || (typeof value === 'string' && !value.trim())) throw new Error('Nilai wajib diisi');
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > maximum) throw new Error(`Nilai harus berada antara 0 dan ${maximum}`);
  return number;
}
const finite = (value: unknown): value is number => value != null && Number.isFinite(Number(value));
const average = (values: (number | null | undefined)[]) => {
  const valid = values.filter(finite).map(Number);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
};
const sum = (values: (number | null | undefined)[]) => values.reduce<number>((total, value) => total + (finite(value) ? Number(value) : 0), 0);
const weighted = (values: {value: number | null; weight: number}[]) => {
  const valid = values.filter(item => finite(item.value));
  const weight = sum(valid.map(item => Math.max(0, item.weight)));
  return !valid.length ? null : weight > 0 ? sum(valid.map(item => Number(item.value) * Math.max(0, item.weight))) / weight : average(valid.map(item => item.value));
};
export function aggregateAssessment(rows: ScoreRow[], mode: ScoringMode, periodMaximum: number) {
  const subcategories = [...new Set(rows.map(row => row.subcategoryId))].map(id => {
    const children = rows.filter(row => row.subcategoryId === id);
    const first = children[0];
    const indicators = [...new Set(children.map(row => row.indicatorId).filter(Boolean))].map(indicatorId => {
      const units = children.filter(row => row.indicatorId === indicatorId);
      const accepted = (row: ScoreRow) => finite(row.internalValue) && (row.accepted ?? (['approved','locked'].includes(row.status ?? '') && Number(row.evidenceCount ?? 0) > 0));
      return { internal: average(units.map(row => row.internalValue)), final: average(units.map(row => row.assessorValue)), verified: average(units.map(row => row.verifiedValue !== undefined ? row.verifiedValue : accepted(row) ? row.internalValue : finite(row.internalValue) ? 0 : null)), accepted: units.length > 0 && units.every(accepted), rejected: units.some(row => row.rejected ?? row.status === 'rejected'), maximum: indicatorMaximum(mode, units[0].maxValue, periodMaximum) };
    });
    const maximum = mode === 'direct_points' ? sum(indicators.map(row => row.maximum)) : periodMaximum;
    const internal = mode === 'direct_points' ? sum(indicators.map(row => row.internal)) : average(indicators.map(row => row.internal));
    const verified = mode === 'direct_points' ? sum(indicators.map(row => row.verified)) : average(indicators.map(row => row.verified));
    // Direct mode always uses indicator finals; legacy mode retains the assessor's subcategory value.
    const final = mode === 'direct_points'
      ? (indicators.some(row => row.final != null) ? sum(indicators.map(row => row.final)) : null)
      : first.finalValue == null ? average(indicators.map(row => row.final)) : Number(first.finalValue);
    return { id, categoryId: first.categoryId, weight: Number(first.subcategoryWeight ?? 0), categoryWeight: Number(first.categoryWeight ?? 0), maximum, internal, verified, accepted: indicators.filter(row => row.accepted).length, rejected: indicators.filter(row => row.rejected).length, final, target: first.targetValue == null ? null : Number(first.targetValue), total: indicators.length, completed: indicators.filter(row => row.internal != null).length };
  });
  const categories = [...new Set(rows.map(row => row.categoryId))].map(id => {
    const children = subcategories.filter(row => row.categoryId === id);
    const combine = (key: 'internal' | 'verified' | 'final' | 'target') => mode === 'direct_points'
      ? (key === 'final' && !children.some(row => row.final != null) ? null : sum(children.map(row => row[key])))
      : weighted(children.map(row => ({value:row[key], weight:row.weight})));
    return { id, weight: children[0].categoryWeight, maximum: mode === 'direct_points' ? sum(children.map(row => row.maximum)) : periodMaximum, internal: combine('internal'), verified: combine('verified'), accepted: sum(children.map(row => row.accepted)), rejected: sum(children.map(row => row.rejected)), final: combine('final'), target: combine('target'), total: sum(children.map(row => row.total)), completed: sum(children.map(row => row.completed)) };
  });
  const combine = (key: 'internal' | 'verified' | 'final' | 'target') => mode === 'direct_points'
    ? (key === 'final' && !categories.some(row => row.final != null) ? null : sum(categories.map(row => row[key])))
    : weighted(categories.map(row => ({value:row[key], weight:row.weight})));
  return { subcategories, categories, internal: combine('internal'), verified: combine('verified'), accepted: sum(categories.map(row => row.accepted)), rejected: sum(categories.map(row => row.rejected)), final: combine('final'), target: combine('target'), maximum: mode === 'direct_points' ? sum(categories.map(row => row.maximum)) : periodMaximum, total: sum(categories.map(row => row.total)), completed: sum(categories.map(row => row.completed)) };
}
