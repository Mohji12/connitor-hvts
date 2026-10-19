import { attendantSlugFromPath, parseAttendantQr } from './parseAttendantQr';

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

assert(attendantSlugFromPath('/attendant-pass/ovum-kalyan-nagar/') === 'ovum-kalyan-nagar', 'slug path');
assert(attendantSlugFromPath('/attendant-pass/apply/') === null, 'reject apply');
assert(
  parseAttendantQr('https://www.conninter.com/attendant-pass/kauvery-electronic-city/') ===
    'kauvery-electronic-city',
  'full url',
);
assert(parseAttendantQr('https://www.conninter.com/attendant-pass/apply/?branchId=x') === null, 'legacy apply');
assert(parseAttendantQr('not-a-url') === null, 'junk');

console.log('parseAttendantQr tests passed');
