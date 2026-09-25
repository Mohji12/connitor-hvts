# Delivery booking pricing — UX

> Distributor booking with package-type units, vehicle-type base fees, and over-capacity handling (Conninter Delivery Booking v2).

## Pricing (v2 — default)

| Package | Units |
|---------|-------|
| Small | 1 |
| Medium | 2 |
| Large | 4 |
| Equipment | 8 |
| Custom | 10 |

| Vehicle | Base fee | Capacity |
|---------|----------|----------|
| Bike | ₹48 | 2 |
| Auto | ₹149 | 6 |
| SCV | ₹349 | 15 |
| MCV | ₹1449 | 40 |
| LCV | ₹1999 | 80 |

- `units = Σ(package_weight × qty)`
- `over = max(0, units − capacity)`
- `handling = ceil(over/5) × ₹25` (0 if within capacity)
- `slot_minutes = 10 + ceil(over/5)×5` when over, else 10
- `total = base + handling` (wallet debit)

Over-capacity is allowed with a warning (suggest upgrading vehicle).

## Booking UI

1. **Details** — hospital, PO, vehicle type, slot, vehicle number, driver, consignment package rows (+ custom size/weight/support), live summary (capacity / vehicle / slot / base / handling / total)
2. **Payment** — summary + amount due → mock **UPI / Card** form → **Pay ₹X** (demo gateway only; no real charge)
   - On success: books delivery with `paymentMethod: DUMMY` (backend credits fee then debits wallet — works at ₹0 balance)
   - Optional **Simulate failure** for demos
3. **Success** — delivery number + amount paid

> Real Razorpay/Stripe is out of scope; this is a dummy payment screen for demos.

## Legacy

Volume fill-ratio pricing (`boxes × L×B×H / vehicle × 60 × ₹10`) remains available for older API clients that omit `packages` / `vehicleCategory`.
