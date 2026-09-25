# Visitor pass quota — tasks

- [x] Schema: `BranchVisitorPassPolicy`, `VisitorPass`, `Visit.visitorPassId`; migrate `python_backend/scripts/migrate_visitor_pass_quota.py`
- [x] Issue / top-up pool, lock-assign on in-person doctor and urgent approve; recycle before check-in
- [x] Policy, issue, list, security search, assign unused pass; serialize pass ID on appointments, QR, email
- [x] Hospital Admin page `/dashboard/visitor-passes` (quota, generate pool, assigned vs unused)
- [x] Security dashboard Visitor passes tab + Pass ID on today/check-in; 10s poll
- [x] Gate-pass email Pass ID + unit tests (consume / exhaust / online skip / recycle)
