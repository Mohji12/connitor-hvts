import { filterBySearchName } from './BookingListSearch';

describe('filterBySearchName', () => {
  const items = [
    { id: '1', name: 'Cardiology' },
    { id: '2', name: 'Cardiothoracic and Vascular Surgery' },
    { id: '3', name: 'Dental Care' },
  ];

  it('returns the full list until 3 characters are typed', () => {
    expect(filterBySearchName(items, '', (i) => i.name)).toHaveLength(3);
    expect(filterBySearchName(items, 'ca', (i) => i.name)).toHaveLength(3);
  });

  it('filters from the third character and narrows as more is typed', () => {
    expect(filterBySearchName(items, 'card', (i) => i.name).map((i) => i.id)).toEqual(['1', '2']);
    expect(filterBySearchName(items, 'cardiol', (i) => i.name).map((i) => i.id)).toEqual(['1']);
  });

  it('is case-insensitive', () => {
    expect(filterBySearchName(items, 'DEN', (i) => i.name).map((i) => i.id)).toEqual(['3']);
  });
});
