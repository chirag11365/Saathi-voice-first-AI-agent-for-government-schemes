const OPERATORS = {
  eq: (actual, expected) => actual === expected,
  neq: (actual, expected) => actual !== expected,
  gt: (actual, expected) => Number(actual) > Number(expected),
  gte: (actual, expected) => Number(actual) >= Number(expected),
  lt: (actual, expected) => Number(actual) < Number(expected),
  lte: (actual, expected) => Number(actual) <= Number(expected),
  in: (actual, expected) => expected.includes(actual),
  notIn: (actual, expected) => !expected.includes(actual),
  isTrue: actual => actual === true
};

export function evaluateEligibility(profile = {}, rules = []) {
  const failedRules = [];
  const missingFields = [];
  for (const rule of rules) {
    const actual = profile[rule.field];
    if (actual === null || actual === undefined || actual === '') {
      missingFields.push(rule.field);
      continue;
    }
    const operator = OPERATORS[rule.op];
    if (!operator) throw new Error(`Unsupported eligibility operator: ${rule.op}`);
    if (!operator(actual, rule.value)) failedRules.push(rule.label);
  }
  const uniqueMissing = [...new Set(missingFields)];
  return {
    eligible: failedRules.length ? false : uniqueMissing.length ? 'maybe' : true,
    failedRules,
    missingFields: uniqueMissing,
    reasons: failedRules.length ? [] : uniqueMissing.length ? ['More information is needed to check this scheme.'] : ['All simplified demo rules passed.']
  };
}
