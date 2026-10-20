import { humanLabel, isUuidLabel } from './utils';

describe('isUuidLabel', () => {
  it('detects a UUID and ignores human names', () => {
    expect(isUuidLabel('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001')).toBe(true);
    expect(isUuidLabel('Fertility & IVF')).toBe(false);
    expect(isUuidLabel('OPD')).toBe(false);
    expect(isUuidLabel(null)).toBe(false);
  });
});

describe('humanLabel', () => {
  it('skips UUIDs and empty values', () => {
    expect(
      humanLabel('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001', '  ', 'Pediatrics'),
    ).toBe('Pediatrics');
    expect(humanLabel('OPD', 'OPD')).toBe('OPD');
    expect(humanLabel('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001')).toBeNull();
  });
});
