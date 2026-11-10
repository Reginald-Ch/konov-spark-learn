import { expect, test } from 'bun:test';
import { answerLabel, csvCell, hasWaitlistOwnerRole, signupSource } from './privateWaitlist';

test('only the dedicated waitlist owner role grants UI access', () => {
  expect(hasWaitlistOwnerRole([{ role: 'waitlist_owner' }])).toBe(true);
  expect(hasWaitlistOwnerRole([{ role: 'organizer' }, { role: 'judge' }, { role: 'admin' }])).toBe(false);
  expect(hasWaitlistOwnerRole([])).toBe(false);
});

test('exports neutralize spreadsheet formulas in signup fields', () => {
  expect(csvCell('=1+1')).toBe('"\'=1+1"');
  expect(csvCell('Ama')).toBe('"Ama"');
});
test('profile answers read as plain text in the dashboard and export', () => {
  expect(answerLabel('after_school')).toBe('after school');
  expect(answerLabel(['6-8', '12-14'])).toBe('6-8, 12-14');
  expect(answerLabel(null)).toBe('');
});

test('signup source prefers campaign tags, then the referring site, then a friend', () => {
  expect(signupSource({ utm_source: 'instagram', utm_campaign: 'akwaaba' })).toBe('instagram / akwaaba');
  expect(signupSource({ referrer: 'https://www.google.com/search?q=meai' })).toBe('www.google.com');
  expect(signupSource({ referred_by: 'ABC123' })).toBe('friend referral');
  expect(signupSource({})).toBe('');
});
