'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Plus, X } from 'lucide-react';
import {
  DistributorDeliveryService,
  type ApprovedBranch,
  type DeliveryAgent,
  type DeliverySlot,
  type DeliveryVehicle,
  type PackageType,
  type VehicleCategory,
} from '@/lib/services/distributorDeliveryService';
import { todayIstDateIso, formatIstDateTime } from '@/lib/datetime';
import { DeliveryStepper } from '@/features/delivery-management/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


type Step = 1 | 2;

const WIZARD_STEPS = ['Details', 'Payment'];

type PayMethod = 'UPI' | 'CARD';

const PACKAGE_TYPES: PackageType[] = ['Small', 'Medium', 'Large', 'Equipment', 'Custom'];
const VEHICLE_TYPES: VehicleCategory[] = ['Bike', 'Auto', 'SCV', 'MCV', 'LCV'];

const PACKAGE_WEIGHT: Record<PackageType, number> = {
  Small: 1,
  Medium: 2,
  Large: 4,
  Equipment: 8,
  Custom: 10,
};

const VEHICLE_BASE_FEE: Record<VehicleCategory, number> = {
  Bike: 48,
  Auto: 149,
  SCV: 349,
  MCV: 1449,
  LCV: 1999,
};

const VEHICLE_CAPACITY: Record<VehicleCategory, number> = {
  Bike: 2,
  Auto: 6,
  SCV: 15,
  MCV: 40,
  LCV: 80,
};

const SUPPORT_OPTIONS = [
  'None',
  'One Person',
  'Two Persons',
  'Trolley',
  'Forklift',
  'Crane',
  'Biomedical Engineer',
  'Hospital Technician',
] as const;

type PackageRow = {
  id: string;
  packageType: PackageType;
  qty: string;
  remarks: string;
  customSize: string;
  customWeightKg: string;
  supportRequired: string;
};

function newPackageRow(): PackageRow {
  return {
    id: crypto.randomUUID(),
    packageType: 'Small',
    qty: '1',
    remarks: '',
    customSize: '',
    customWeightKg: '',
    supportRequired: 'None',
  };
}

function computeQuote(packages: PackageRow[], vehicleType: VehicleCategory | '') {
  if (!vehicleType || packages.length === 0) return null;
  let units = 0;
  let totalBoxes = 0;
  for (const row of packages) {
    const qty = parseInt(row.qty, 10) || 0;
    if (qty < 1) return null;
    units += PACKAGE_WEIGHT[row.packageType] * qty;
    totalBoxes += qty;
  }
  const capacity = VEHICLE_CAPACITY[vehicleType];
  const baseFee = VEHICLE_BASE_FEE[vehicleType];
  const over = Math.max(0, units - capacity);
  const blocks = over > 0 ? Math.ceil(over / 5) : 0;
  const handlingFee = blocks * 25;
  const slotMinutes = 10 + (over > 0 ? blocks * 5 : 0);
  return {
    usedUnits: units,
    capacityUnits: capacity,
    overUnits: over,
    baseFee,
    handlingFee,
    walletFee: baseFee + handlingFee,
    slotMinutes,
    totalBoxes,
    overCapacity: over > 0,
    warning:
      over > 0
        ? 'Selected vehicle exceeds its standard capacity. Consider upgrading the vehicle.'
        : null,
  };
}

export function DeliveryBookingWizard(): React.ReactElement {
  const [step, setStep] = React.useState<Step>(1);
  const [branches, setBranches] = React.useState<ApprovedBranch[]>([]);
  const [branchId, setBranchId] = React.useState('');
  const [poNumber, setPoNumber] = React.useState('');
  const [slotDate, setSlotDate] = React.useState(todayIstDateIso());
  const [slots, setSlots] = React.useState<DeliverySlot[]>([]);
  const [slotId, setSlotId] = React.useState('');
  const [allowUnscheduled, setAllowUnscheduled] = React.useState(false);
  const [useUnscheduled, setUseUnscheduled] = React.useState(false);
  const [expectedArrivalTime, setExpectedArrivalTime] = React.useState('');
  const [vehicleCategory, setVehicleCategory] = React.useState<VehicleCategory | ''>('Bike');
  const [vehicles, setVehicles] = React.useState<DeliveryVehicle[]>([]);
  const [agents, setAgents] = React.useState<DeliveryAgent[]>([]);
  const [vehicleMode, setVehicleMode] = React.useState<'existing' | 'new'>('new');
  const [vehicleId, setVehicleId] = React.useState('');
  const [vehicleReg, setVehicleReg] = React.useState('');
  const [agentMode, setAgentMode] = React.useState<'existing' | 'new'>('new');
  const [agentId, setAgentId] = React.useState('');
  const [agentName, setAgentName] = React.useState('');
  const [agentEmail, setAgentEmail] = React.useState('');
  const [agentPhone, setAgentPhone] = React.useState('');
  const [packages, setPackages] = React.useState<PackageRow[]>([newPackageRow()]);
  const [loading, setLoading] = React.useState(false);
  const [payMethod, setPayMethod] = React.useState<PayMethod>('UPI');
  const [upiId, setUpiId] = React.useState('');
  const [cardNumber, setCardNumber] = React.useState('');
  const [cardExpiry, setCardExpiry] = React.useState('');
  const [cardCvv, setCardCvv] = React.useState('');
  const [success, setSuccess] = React.useState<{
    deliveryNumber: string;
    walletFee?: number;
  } | null>(null);

  React.useEffect(() => {
    DistributorDeliveryService.listBranches()
      .then(setBranches)
      .catch(() => toast.error('Could not load hospitals'));
    DistributorDeliveryService.listVehicles()
      .then((rows) => {
        setVehicles(rows);
        if (rows.length > 0) setVehicleMode('existing');
      })
      .catch(() => undefined);
    DistributorDeliveryService.listAgents()
      .then((rows) => {
        setAgents(rows);
        if (rows.length > 0) setAgentMode('existing');
      })
      .catch(() => undefined);
  }, []);

  const selectedBranch = branches.find((b) => b.id === branchId);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const feePreview = computeQuote(packages, vehicleCategory);

  React.useEffect(() => {
    if (!branchId || !slotDate) return;
    const need = feePreview?.slotMinutes;
    DistributorDeliveryService.listSlots(branchId, slotDate, need)
      .then((rows) => {
        setSlots(rows);
        if (slotId && !rows.some((s) => s.id === slotId)) {
          setSlotId('');
        }
      })
      .catch(() => setSlots([]));
    DistributorDeliveryService.getBranchSettings(branchId)
      .then((s) => setAllowUnscheduled(s.allowUnscheduledDeliveries))
      .catch(() => setAllowUnscheduled(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when unload duration changes
  }, [branchId, slotDate, feePreview?.slotMinutes]);

  React.useEffect(() => {
    if (vehicleMode === 'existing' && selectedVehicle?.vehicleType) {
      const vt = selectedVehicle.vehicleType.toUpperCase();
      let matched = VEHICLE_TYPES.find((t) => t.toUpperCase() === vt);
      if (!matched) {
        if (vt.includes('TRUCK')) matched = 'MCV';
        else if (vt.includes('VAN')) matched = 'SCV';
        else if (vt.includes('AUTO')) matched = 'Auto';
        else matched = 'Bike';
      }
      setVehicleCategory(matched as VehicleCategory);
    }
  }, [vehicleMode, selectedVehicle]);

  const updatePackage = (id: string, patch: Partial<PackageRow>) => {
    setPackages((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const canReview = (): boolean => {
    if (!branchId || !vehicleCategory) return false;
    if (useUnscheduled) {
      if (!expectedArrivalTime) return false;
    } else if (!slotId) {
      return false;
    }
    if (!feePreview || feePreview.totalBoxes < 1) return false;
    if (vehicleMode === 'existing') {
      if (!vehicleId) return false;
    } else if (!vehicleReg.trim()) {
      return false;
    }
    if (agentMode === 'existing') {
      if (!agentId) return false;
    } else if (!agentName.trim() || !agentPhone.trim()) {
      return false;
    }
    return true;
  };

  const buildPackagesPayload = () =>
    packages.map((row) => ({
      packageType: row.packageType,
      qty: parseInt(row.qty, 10) || 1,
      remarks: row.remarks.trim() || undefined,
      customSize: row.packageType === 'Custom' ? row.customSize.trim() || undefined : undefined,
      customWeightKg:
        row.packageType === 'Custom' && row.customWeightKg
          ? Number(row.customWeightKg)
          : undefined,
      supportRequired:
        row.packageType === 'Custom' && row.supportRequired !== 'None'
          ? row.supportRequired
          : undefined,
    }));

  const canPay = (): boolean => {
    if (payMethod === 'UPI') return upiId.trim().length >= 3;
    return cardNumber.replace(/\s/g, '').length >= 12 && cardExpiry.trim().length >= 3 && cardCvv.trim().length >= 3;
  };

  const submit = async (simulateFailure = false) => {
    if (!vehicleCategory) return;
    if (simulateFailure) {
      toast.error('Payment failed (simulated). Try again or go back to edit details.');
      return;
    }
    if (!canPay()) {
      toast.error(payMethod === 'UPI' ? 'Enter a UPI ID' : 'Enter card details');
      return;
    }
    setLoading(true);
    try {
      // Brief fake gateway delay for demo UX
      await new Promise((r) => setTimeout(r, 1200));
      const driverEmail =
        agentEmail.trim() ||
        `${agentPhone.trim().replace(/\D/g, '') || 'driver'}@delivery.local`;
      const payload = {
        branchId,
        poNumber: poNumber.trim() || undefined,
        packages: buildPackagesPayload(),
        vehicleCategory,
        remarks: undefined as string | undefined,
        slotId: useUnscheduled ? undefined : slotId || undefined,
        expectedArrivalTime: useUnscheduled ? expectedArrivalTime : undefined,
        vehicleId: vehicleMode === 'existing' ? vehicleId : undefined,
        vehicle:
          vehicleMode === 'new'
            ? {
                registrationNumber: vehicleReg.trim(),
                vehicleType: vehicleCategory,
              }
            : undefined,
        agentId: agentMode === 'existing' ? agentId : undefined,
        agent:
          agentMode === 'new'
            ? {
                name: agentName.trim(),
                email: driverEmail,
                phone: agentPhone.trim() || undefined,
              }
            : undefined,
        paymentMethod: 'DUMMY' as const,
      };
      const result = await DistributorDeliveryService.bookDelivery(payload);
      setSuccess({
        deliveryNumber: result.deliveryNumber,
        walletFee: result.pricing?.walletFee ?? result.walletFee,
      });
      toast.success('Payment successful — delivery booked');
    } catch (e: unknown) {
      const detail =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detail || 'Payment / booking failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <CardContent className="space-y-4 pt-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="text-xl font-semibold text-slate-900">Delivery booked</h2>
          <p className="text-muted-foreground">
            Reference: <strong>{success.deliveryNumber}</strong>
          </p>
          {success.walletFee != null && (
            <p className="text-sm text-slate-700">
              Paid: <strong>₹{success.walletFee.toFixed(2)}</strong>
            </p>
          )}
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Security and hospital admins have been notified. The driver will receive full delivery
            instructions and the gate check-in QR by email — no app login needed.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = '/vendor/deliveries';
              }}
            >
              View deliveries
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => window.location.reload()}
            >
              Book another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <DeliveryStepper steps={WIZARD_STEPS} current={step} />

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Hospital & trip</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Hospital</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose approved hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} — {b.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>PO Number</Label>
                  <Input
                    placeholder="Purchase Order Number"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Vehicle Type</Label>
                  <Select
                    value={vehicleCategory || undefined}
                    onValueChange={(v) => setVehicleCategory(v as VehicleCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v} · ₹{VEHICLE_BASE_FEE[v]} · cap {VEHICLE_CAPACITY[v]}u
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={slotDate}
                    onChange={(e) => {
                      setSlotDate(e.target.value);
                      setSlotId('');
                    }}
                  />
                </div>
              </div>

              {allowUnscheduled && (
                <div className="flex items-center gap-2">
                  <input
                    id="unscheduled"
                    type="checkbox"
                    checked={useUnscheduled}
                    onChange={(e) => setUseUnscheduled(e.target.checked)}
                  />
                  <Label htmlFor="unscheduled">Unscheduled arrival</Label>
                </div>
              )}
              {useUnscheduled ? (
                <div>
                  <Label>Expected arrival</Label>
                  <Input
                    type="datetime-local"
                    value={expectedArrivalTime}
                    onChange={(e) => setExpectedArrivalTime(e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <Label>Delivery window</Label>
                  <p className="mb-1.5 text-xs text-muted-foreground">
                    Your unload needs ~{feePreview?.slotMinutes ?? 10} min. Remaining time stays
                    open for other distributors.
                  </p>
                  <Select value={slotId} onValueChange={setSlotId} disabled={slots.length === 0}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          slots.length === 0
                            ? 'No open windows for this date'
                            : 'Select hospital window'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {slots.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {formatIstDateTime(s.slotStart)} –{' '}
                          {formatIstDateTime(s.slotEnd).split(',').pop()?.trim() ??
                            formatIstDateTime(s.slotEnd)}{' '}
                          ({s.remainingMinutes ?? s.remaining} min left)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {slots.length === 0 && (
                    <div className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <p>
                        No delivery windows left for this date (they may have ended, or hospital has
                        not published any).
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-amber-300 bg-white"
                          onClick={() => {
                            const d = new Date(`${slotDate}T12:00:00`);
                            d.setDate(d.getDate() + 1);
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            setSlotDate(`${y}-${m}-${day}`);
                            setSlotId('');
                          }}
                        >
                          Try next day
                        </Button>
                        {allowUnscheduled && (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => setUseUnscheduled(true)}
                          >
                            Use unscheduled arrival
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Vehicle & driver</h3>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={vehicleMode === 'existing'}
                    onChange={() => setVehicleMode('existing')}
                  />
                  Existing vehicle
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={vehicleMode === 'new'}
                    onChange={() => setVehicleMode('new')}
                  />
                  New vehicle
                </label>
              </div>
              {vehicleMode === 'existing' ? (
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registrationNumber}
                        {v.vehicleType ? ` · ${v.vehicleType}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Vehicle Number</Label>
                    <Input
                      placeholder="KA01AB1234"
                      value={vehicleReg}
                      onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <Label>Vehicle Type</Label>
                    <Select
                      value={vehicleCategory}
                      onValueChange={(val: VehicleCategory) => setVehicleCategory(val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={agentMode === 'existing'}
                    onChange={() => setAgentMode('existing')}
                  />
                  Existing driver
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={agentMode === 'new'}
                    onChange={() => setAgentMode('new')}
                  />
                  New driver
                </label>
              </div>
              {agentMode === 'existing' ? (
                <Select value={agentId} onValueChange={setAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                        {a.phone ? ` · ${a.phone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Driver Name</Label>
                    <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Driver Mobile</Label>
                    <Input
                      inputMode="numeric"
                      value={agentPhone}
                      onChange={(e) =>
                        setAgentPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <Label>Driver Email (optional)</Label>
                    <Input
                      type="email"
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      placeholder="For QR email"
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Consignment details</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPackages((rows) => [...rows, newPackageRow()])}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add package
                </Button>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Package Type</th>
                      <th className="px-3 py-2 font-medium">Qty</th>
                      <th className="px-3 py-2 font-medium">Remarks</th>
                      <th className="px-3 py-2 font-medium">Custom details</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((row) => (
                      <tr key={row.id} className="border-t align-top">
                        <td className="px-3 py-2">
                          <Select
                            value={row.packageType}
                            onValueChange={(v) =>
                              updatePackage(row.id, { packageType: v as PackageType })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PACKAGE_TYPES.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p} ({PACKAGE_WEIGHT[p]}u)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 w-24">
                          <Input
                            type="number"
                            min={1}
                            value={row.qty}
                            onChange={(e) => updatePackage(row.id, { qty: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="Optional remarks"
                            value={row.remarks}
                            onChange={(e) => updatePackage(row.id, { remarks: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          {row.packageType === 'Custom' ? (
                            <div className="space-y-2 rounded border border-dashed bg-slate-50 p-2">
                              <Input
                                placeholder="L × W × H"
                                value={row.customSize}
                                onChange={(e) =>
                                  updatePackage(row.id, { customSize: e.target.value })
                                }
                              />
                              <Input
                                placeholder="Weight (kg)"
                                value={row.customWeightKg}
                                onChange={(e) =>
                                  updatePackage(row.id, { customWeightKg: e.target.value })
                                }
                              />
                              <Select
                                value={row.supportRequired}
                                onValueChange={(v) =>
                                  updatePackage(row.id, { supportRequired: v })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Support required" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SUPPORT_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={packages.length === 1}
                            onClick={() =>
                              setPackages((rows) => rows.filter((r) => r.id !== row.id))
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-3 rounded-lg border border-sky-100 bg-sky-50/70 p-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-md bg-white/80 p-3 text-center">
                <p className="text-xs text-muted-foreground">Capacity</p>
                <p className="font-semibold">{feePreview ? `${feePreview.usedUnits} Units` : '0'}</p>
              </div>
              <div className="rounded-md bg-white/80 p-3 text-center">
                <p className="text-xs text-muted-foreground">Vehicle</p>
                <p className="font-semibold">{vehicleCategory || '—'}</p>
              </div>
              <div className="rounded-md bg-white/80 p-3 text-center">
                <p className="text-xs text-muted-foreground">Slot</p>
                <p className="font-semibold">
                  {feePreview ? `${feePreview.slotMinutes} min` : '10 min'}
                </p>
              </div>
              <div className="rounded-md bg-white/80 p-3 text-center">
                <p className="text-xs text-muted-foreground">Base Fee</p>
                <p className="font-semibold">₹{feePreview?.baseFee ?? 0}</p>
              </div>
              <div className="rounded-md bg-white/80 p-3 text-center">
                <p className="text-xs text-muted-foreground">Handling</p>
                <p className="font-semibold">₹{feePreview?.handlingFee ?? 0}</p>
              </div>
              <div className="rounded-md bg-white/80 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-semibold text-sky-900">₹{feePreview?.walletFee ?? 0}</p>
              </div>
            </div>
            {feePreview?.warning ? (
              <p className="text-sm font-medium text-red-700">{feePreview.warning}</p>
            ) : null}

            <Button
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={!canReview()}
              onClick={() => setStep(2)}
            >
              Continue to payment
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <p className="text-sm text-muted-foreground">
              Demo payment only — no real money is charged. Complete payment to confirm the booking.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Hospital</dt>
                <dd className="font-medium">{selectedBranch?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">PO Number</dt>
                <dd className="font-medium">{poNumber.trim() || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">When</dt>
                <dd className="font-medium">
                  {useUnscheduled
                    ? expectedArrivalTime
                    : slots.find((s) => s.id === slotId)
                      ? formatIstDateTime(slots.find((s) => s.id === slotId)!.slotStart)
                      : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vehicle</dt>
                <dd className="font-medium">
                  {vehicleCategory} ·{' '}
                  {vehicleMode === 'existing'
                    ? selectedVehicle?.registrationNumber
                    : vehicleReg}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Driver</dt>
                <dd className="font-medium">
                  {agentMode === 'existing'
                    ? agents.find((a) => a.id === agentId)?.name
                    : `${agentName}${agentPhone ? ` · ${agentPhone}` : ''}`}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Packages</dt>
                <dd className="font-medium">
                  {packages.map((p) => `${p.packageType}×${p.qty}`).join(', ')}
                </dd>
              </div>
            </dl>

            {feePreview && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-sky-800">
                  Amount due
                </p>
                <p className="text-2xl font-semibold text-sky-950">
                  ₹{feePreview.walletFee.toFixed(2)}
                </p>
                <p className="text-muted-foreground">
                  {feePreview.usedUnits} units / {feePreview.capacityUnits} capacity · base ₹
                  {feePreview.baseFee}
                  {feePreview.handlingFee > 0 ? ` + handling ₹${feePreview.handlingFee}` : ''} ·{' '}
                  {feePreview.slotMinutes} min unload estimate
                </p>
              </div>
            )}

            <div className="space-y-3 rounded-lg border p-4">
              <Label>Payment method</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={payMethod === 'UPI' ? 'default' : 'outline'}
                  className={payMethod === 'UPI' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                  onClick={() => setPayMethod('UPI')}
                >
                  UPI
                </Button>
                <Button
                  type="button"
                  variant={payMethod === 'CARD' ? 'default' : 'outline'}
                  className={payMethod === 'CARD' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                  onClick={() => setPayMethod('CARD')}
                >
                  Card
                </Button>
              </div>

              {payMethod === 'UPI' ? (
                <div>
                  <Label htmlFor="upi-id">UPI ID</Label>
                  <Input
                    id="upi-id"
                    placeholder="name@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="card-number">Card number</Label>
                    <Input
                      id="card-number"
                      placeholder="4111 1111 1111 1111"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="card-expiry">Expiry</Label>
                    <Input
                      id="card-expiry"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="card-cvv">CVV</Label>
                    <Input
                      id="card-cvv"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>
                Back
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void submit(true)}
              >
                Simulate failure
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 min-w-[10rem]"
                disabled={loading || !feePreview || !canPay()}
                onClick={() => void submit(false)}
              >
                {loading
                  ? 'Processing…'
                  : `Pay ₹${(feePreview?.walletFee ?? 0).toFixed(2)}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
