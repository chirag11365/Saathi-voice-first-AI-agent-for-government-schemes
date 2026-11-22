import test from 'node:test';
import assert from 'node:assert/strict';
import { profileFromWizard } from './profileFromWizard.js';

test('maps farmer wizard answers to deterministic scheme fields', () => {
  assert.deepEqual(profileFromWizard({ role:'farmer', ageGroup:'age41to59', state:'Bihar', income:'income1to3', land:'land2to5' }), {
    age:50,state:'Bihar',annualIncome:200000,occupation:'farmer',landHolding:3.5
  });
});
test('exact age overrides age group and students get category fields', () => {
  assert.deepEqual(profileFromWizard({ role:'student', ageGroup:'age18to25', ageExact:'19', state:'Maharashtra', category:'SC' }), {
    age:19,state:'Maharashtra',occupation:'student',isStudent:true,category:'SC'
  });
});
test('skipped values stay unknown instead of being guessed', () => {
  assert.deepEqual(profileFromWizard({ role:'farmer' }), { occupation:'farmer' });
});
