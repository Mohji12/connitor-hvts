/** Shared dummy credentials shown on public sign-in forms. Seed with
 * `python scripts/seed_demo_visitor_distributor.py --yes` (password Conninter123@).
 */
export const DEMO_VISITOR_LOGIN = {
  email: 'visitor@conninter.demo',
  phone: '9000000001',
} as const;

export const DEMO_DISTRIBUTOR_LOGIN = {
  email: 'distributor@citygen.demo',
  phone: '9000000102',
} as const;
