import test from 'node:test';
import assert from 'node:assert/strict';
import { itkpBands, interpretScore, validateBands } from '../lib/score-interpretation.ts';
test('ITKP exact boundaries and upper bound', () => {
  for (const [score,predicate] of [[0,'D'],[29.99,'D'],[30,'C'],[50,'CC'],[60,'B'],[70,'BB'],[79.99,'BB'],[80,'A'],[90,'AA'],[100,'AA']]) assert.equal(interpretScore(score,itkpBands,100)?.predicate,predicate);
  for (const score of [null,-1,101,NaN]) assert.equal(interpretScore(score,itkpBands,100),null);
  assert.equal(interpretScore(77,[],100),null);
});
test('period rules cover zero and reject ambiguous or malformed ranges', () => {
  assert.deepEqual(validateBands(itkpBands,100),itkpBands);
  for (const input of [[{minimum:30,predicate:'C',interpretation:'Kurang'}],[...itkpBands,itkpBands[0]], [{minimum:'0',predicate:'A',interpretation:'Baik'}],itkpBands]) {
    assert.throws(() => validateBands(input,5));
  }
  assert.deepEqual(validateBands([],5),[]);
});
