import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateAssessment, validateScore, indicatorMaximum } from '../lib/assessment-scoring.ts';

const maxima = [5, 2.5, 2.5, 10, 2.5, 2.5, 5, 15, 9, 6, 30, 10];
const fixture = () => maxima.map((maximum, index) => ({
  indicatorId: `i${index}`, subcategoryId: `s${index}`, categoryId: index < 7 ? 'system' : index < 10 ? 'people' : index === 10 ? 'maturity' : 'integrity',
  categoryWeight: index < 11 ? 30 : 10, subcategoryWeight: maximum, maxValue: maximum,
  internalValue: maximum, assessorValue: maximum, finalValue: maximum, targetValue: maximum,
}));
test('direct points sum maxima to 100 without applying weights twice', () => {
  const result = aggregateAssessment(fixture(), 'direct_points', 100);
  assert.equal(result.internal, 100); assert.equal(result.final, 100); assert.equal(result.maximum, 100);
  assert.deepEqual(result.categories.map(c => c.internal), [30, 30, 30, 10]);
});
test('Renaksi 4 and maturity 21 contribute 25, missing rows do not redistribute points', () => {
  const rows = fixture().map((r, index) => ({ ...r, internalValue: index === 9 ? 4 : index === 10 ? 21 : null, assessorValue: null, finalValue: null }));
  const result = aggregateAssessment(rows, 'direct_points', 100);
  assert.equal(result.internal, 25); assert.equal(result.completed, 2); assert.equal(result.final, null);
});
test('indicator caps support fractional maxima and reject null, nonfinite and excessive inputs', () => {
  assert.equal(indicatorMaximum('direct_points', 6, 100), 6);
  assert.equal(indicatorMaximum('weighted_average', null, 5), 5);
  assert.throws(() => indicatorMaximum('direct_points', null, 100));
  for (const [value, maximum] of [[6.01, 6], [30.01, 30], [-1, 6], [NaN, 6], [Infinity, 6], [null, 6], ['', 6]]) assert.throws(() => validateScore(value, maximum));
  assert.equal(validateScore(6, 6), 6); assert.equal(validateScore(30, 30), 30); assert.equal(validateScore(2.5, 2.5), 2.5);
});
test('weighted mode retains subcategory then category weighting and shared subcategory finals', () => {
  const rows = [
    { indicatorId:'a', subcategoryId:'s1', categoryId:'c', categoryWeight:100, subcategoryWeight:25, internalValue:2, finalValue:3 },
    { indicatorId:'b', subcategoryId:'s1', categoryId:'c', categoryWeight:100, subcategoryWeight:25, internalValue:4, finalValue:3 },
    { indicatorId:'c', subcategoryId:'s2', categoryId:'c', categoryWeight:100, subcategoryWeight:75, internalValue:5, finalValue:5 },
  ];
  const result = aggregateAssessment(rows, 'weighted_average', 5);
  assert.equal(result.internal, 4.5); assert.equal(result.final, 4.5);
});
test('multiple units are averaged per indicator and repeated evidence rows cannot inflate points', () => {
  const row = fixture()[9];
  const result = aggregateAssessment([{...row, internalValue:4}, {...row, internalValue:6}], 'direct_points', 100);
  assert.equal(result.internal, 5); assert.equal(result.maximum, 6); assert.equal(result.total, 1);
  const repeated = aggregateAssessment([row, row, row], 'direct_points', 100);
  assert.equal(repeated.internal, 6); assert.equal(repeated.maximum, 6);
});

test('rejected RUP evidence contributes zero verified points without erasing the staff value', () => {
  const rows = [5,2.5,2.5].map((maximum,index) => ({indicatorId:`i${index}`,subcategoryId:'plan',categoryId:'system',categoryWeight:30,subcategoryWeight:10,maxValue:maximum,internalValue:maximum,status:index===1?'rejected':'approved',evidenceCount:1}));
  const summary=aggregateAssessment(rows,'direct_points',100);
  assert.equal(summary.internal,10); assert.equal(summary.verified,7.5);
  assert.equal(summary.subcategories[0].accepted,2); assert.equal(summary.subcategories[0].rejected,1);
  assert.equal(summary.accepted,2);assert.equal(summary.total,3);
});

test('pending evidence, rejected evidence and approved values without evidence never count as accepted', () => {
  const rows=['draft','submitted','rejected','approved','locked'].map((status,index)=>({indicatorId:`i${index}`,subcategoryId:'s',categoryId:'c',maxValue:5,internalValue:5,status,evidenceCount:index===3?0:1}));
  const summary=aggregateAssessment(rows,'direct_points',100);
  assert.equal(summary.verified,5); assert.equal(summary.accepted,1);assert.equal(summary.completed,5);
});

test('verification across units does not remove rejected units from the denominator', () => {
  const base={indicatorId:'i',subcategoryId:'s',categoryId:'c',maxValue:5,internalValue:5,evidenceCount:1};
  const summary=aggregateAssessment([{...base,status:'approved'},{...base,status:'rejected'}],'direct_points',100);
  assert.equal(summary.internal,5);assert.equal(summary.verified,2.5);assert.equal(summary.accepted,0);
});
