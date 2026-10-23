export type InterpretationBand = { minimum: number; predicate: string; interpretation: string };
export const itkpBands: InterpretationBand[] = [
  {minimum:0,predicate:'D',interpretation:'Sangat Kurang'},
  {minimum:30,predicate:'C',interpretation:'Kurang'},
  {minimum:50,predicate:'CC',interpretation:'Cukup'},
  {minimum:60,predicate:'B',interpretation:'Baik'},
  {minimum:70,predicate:'BB',interpretation:'Sangat Baik'},
  {minimum:80,predicate:'A',interpretation:'Memuaskan'},
  {minimum:90,predicate:'AA',interpretation:'Sangat Memuaskan'},
];
export function validateBands(input: unknown, maximum: number): InterpretationBand[] {
  if (!Array.isArray(input) || input.length > 30) throw new Error('Aturan interpretasi harus berupa daftar, maksimal 30 rentang');
  const bands = input.map(row => {
    if (!row || typeof row.minimum !== 'number' || !Number.isFinite(row.minimum) || row.minimum < 0 || row.minimum > maximum || typeof row.predicate !== 'string' || !row.predicate.trim() || row.predicate.length > 30 || typeof row.interpretation !== 'string' || !row.interpretation.trim() || row.interpretation.length > 300) throw new Error('Batas bawah, predikat, atau interpretasi tidak valid');
    return {minimum:row.minimum, predicate:row.predicate.trim(), interpretation:row.interpretation.trim()};
  }).sort((a,b) => a.minimum-b.minimum);
  if (bands.length && (bands[0].minimum !== 0 || bands.some((row,index) => index > 0 && row.minimum === bands[index-1].minimum))) throw new Error('Rentang harus dimulai dari 0 dan batas bawah tidak boleh berulang');
  return bands;
}
export function interpretScore(value: number | null, bands: InterpretationBand[], maximum: number) {
  if (value == null || !Number.isFinite(value) || value < 0 || value > maximum) return null;
  return [...bands].reverse().find(band => value >= band.minimum) ?? null;
}
