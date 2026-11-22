import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEligibility } from '../src/services/eligibility.js';

test('all rules pass', () => assert.equal(evaluateEligibility({ occupation: 'farmer', landHolding: 2 }, [{ field: 'occupation', op: 'eq', value: 'farmer', label: 'farmer' }, { field: 'landHolding', op: 'gt', value: 0, label: 'land' }]).eligible, true));
test('one failed rule makes result ineligible', () => assert.deepEqual(evaluateEligibility({ age: 17 }, [{ field: 'age', op: 'gte', value: 18, label: 'Adult' }]).failedRules, ['Adult']));
test('missing fields return maybe', () => assert.equal(evaluateEligibility({}, [{ field: 'state', op: 'eq', value: 'Bihar', label: 'State' }]).eligible, 'maybe'));
test('in and notIn operators', () => {
  assert.equal(evaluateEligibility({ category: 'SC' }, [{ field: 'category', op: 'in', value: ['SC', 'ST'], label: 'category' }]).eligible, true);
  assert.equal(evaluateEligibility({ state: 'Goa' }, [{ field: 'state', op: 'notIn', value: ['Bihar'], label: 'state' }]).eligible, true);
});
test('numeric boundaries are inclusive where expected', () => assert.equal(evaluateEligibility({ age: 18 }, [{ field: 'age', op: 'gte', value: 18, label: 'Age' }]).eligible, true));
