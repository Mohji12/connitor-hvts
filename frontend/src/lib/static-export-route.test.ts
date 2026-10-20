import {
  hospitalDeliveryIdFromLocation,
  vendorDeliveryIdFromLocation,
} from '@/lib/static-export-route';

describe('static-export-route', () => {
  it('reads a vendor delivery UUID from the live URL after a static-export rewrite', () => {
    const id = 'cbde6f99-8532-4345-8104-ea7b7135e3e5';
    expect(vendorDeliveryIdFromLocation(`/vendor/deliveries/${id}/`, '_')).toBe(id);
    expect(vendorDeliveryIdFromLocation(`/vendor/deliveries/${id}`, '_')).toBe(id);
  });

  it('ignores the book route and the export placeholder', () => {
    expect(vendorDeliveryIdFromLocation('/vendor/deliveries/book/', 'book')).toBe('');
    expect(vendorDeliveryIdFromLocation('/vendor/deliveries/_/', '_')).toBe('');
    expect(vendorDeliveryIdFromLocation('/vendor/deliveries/', 'abc')).toBe('abc');
  });

  it('reads a hospital delivery UUID and skips vendors', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(hospitalDeliveryIdFromLocation(`/dashboard/delivery/${id}/`, '_')).toBe(id);
    expect(hospitalDeliveryIdFromLocation('/dashboard/delivery/vendors/', 'vendors')).toBe('');
  });
});
