const AGE_VALUES = { under18: 16, age18to25: 21, age26to40: 33, age41to59: 50, age60plus: 65 };
const INCOME_VALUES = { under1L: 50000, income1to3: 200000, income3to6: 450000, above6: 700000 };
const LAND_VALUES = { landNone: 0, landUnder2: 1, land2to5: 3.5, landAbove5: 6 };

export function profileFromWizard(answers) {
  const profile = {};
  if (answers.ageExact && Number(answers.ageExact) >= 1 && Number(answers.ageExact) <= 120) profile.age = Number(answers.ageExact);
  else if (answers.ageGroup) profile.age = AGE_VALUES[answers.ageGroup];
  if (answers.state) profile.state = answers.state;
  if (answers.income && answers.income !== 'notSure' && INCOME_VALUES[answers.income] != null) profile.annualIncome = INCOME_VALUES[answers.income];
  if (answers.role === 'farmer') {
    profile.occupation = 'farmer';
    if (answers.land) profile.landHolding = LAND_VALUES[answers.land];
  } else if (answers.role === 'student') {
    profile.occupation = 'student';
    profile.isStudent = true;
    if (answers.category && answers.category !== 'notSure') profile.category = answers.category;
  } else if (answers.role === 'senior') {
    profile.occupation = 'senior citizen';
  } else if (answers.role === 'house') {
    profile.occupation = 'house seeker';
  } else if (answers.role === 'other') {
    profile.occupation = 'other';
  }
  return profile;
}
