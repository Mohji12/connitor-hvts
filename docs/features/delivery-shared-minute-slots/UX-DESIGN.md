# Delivery shared-minute windows — UX

> Hospital publishes multi-hour receiving windows. Distributors book only the unload minutes they need; leftover time stays open for others.

## Example

| Actor | Action |
|-------|--------|
| Hospital admin | Creates a **10:00–12:00** window (120 minutes) |
| Distributor A | Books with ~**10 min** unload (from package/vehicle quote) |
| Result | Window shows **110 min left**; other distributors can still book |

## Hospital — `/dashboard/delivery-slots`

1. Choose date range
2. Set morning (and optional afternoon) start/end times
3. **Publish windows** → one `BranchDeliverySlot` per window (shared minute pool)
4. Day schedule shows `remaining/capacity min` and booking count

## Distributor — book flow

1. Package + vehicle set unload estimate (`slotMinutes`, usually 10+)
2. Slot picker lists windows with enough remaining minutes
3. Booking reserves those minutes inside the chosen window

## Rules

- Capacity = window length in minutes (`slotEnd − slotStart`)
- `bookedMinutes` accumulates per booking; reject when remaining &lt; needed
- Unscheduled arrivals still allowed when branch policy permits
- Legacy `mode: "grid"` still chops windows into fixed chunks if needed
