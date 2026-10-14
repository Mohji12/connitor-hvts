import { branchSlug } from './branch-slug';

describe('branchSlug', () => {
  it('builds a readable slug from a branch display name', () => {
    expect(branchSlug('Ovum Hospital — Kalyan Nagar')).toBe('ovum-hospital-kalyan-nagar');
    expect(branchSlug('Ovum Hospital — HSR Layout')).toBe('ovum-hospital-hsr-layout');
  });

  it('collapses punctuation and trims hyphens', () => {
    expect(branchSlug('  St. John\'s (Main) ')).toBe('st-john-s-main');
  });
});
