import { expect, test } from 'bun:test';
import { csvCell, hasWaitlistOwnerRole } from './privateWaitlist';

test('only the dedicated waitlist owner role grants UI access', () => {
  expect(hasWaitlistOwnerRole([{ role: 'waitlist_owner' }])).toBe(true);
  expect(hasWaitlistOwnerRole([{ role: 'organizer' }, { role: 'judge' }, { role: 'admin' }])).toBe(false);
  expect(hasWaitlistOwnerRole([])).toBe(false);
});

test('exports neutralize spreadsheet formulas in signup fields', () => {
  expect(csvCell('=1+1')).toBe('"\'=1+1"');
  expect(csvCell('Ama')).toBe('"Ama"');
});