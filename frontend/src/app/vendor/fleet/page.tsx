'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Pencil, Plus } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useIsAppShell } from '@/hooks/use-mobile';
import { ResponsiveDialog } from '@/components/mobile/ResponsiveDialog';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import {
  DistributorDeliveryService,
  type DeliveryAgent,
  type DeliveryVehicle,
} from '@/lib/services/distributorDeliveryService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeliveryEmptyState, DeliveryPageShell } from '@/features/delivery-management/ui';
import { DriverPhotoField } from '@/features/distributor-delivery/DriverPhotoField';

type Tab = 'drivers' | 'vehicles';

export default function VendorFleetPage(): React.ReactElement {
  const [tab, setTab] = React.useState<Tab>('drivers');
  const [agents, setAgents] = React.useState<DeliveryAgent[]>([]);
  const [vehicles, setVehicles] = React.useState<DeliveryVehicle[]>([]);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [photo, setPhoto] = React.useState<{ file: File; preview: string } | null>(null);
  const [savingDriver, setSavingDriver] = React.useState(false);
  const [reg, setReg] = React.useState('');
  const [vType, setVType] = React.useState('');
  const [vLength, setVLength] = React.useState('');
  const [vBreadth, setVBreadth] = React.useState('');
  const [vHeight, setVHeight] = React.useState('');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingAgentId, setEditingAgentId] = React.useState<string | null>(null);
  const [editingVehicleId, setEditingVehicleId] = React.useState<string | null>(null);
  const [existingPhoto, setExistingPhoto] = React.useState<string | null>(null);
  const appShell = useIsAppShell();

  const load = React.useCallback(async () => {
    try {
      const [a, v] = await Promise.all([
        DistributorDeliveryService.listAgents(),
        DistributorDeliveryService.listVehicles(),
      ]);
      setAgents(a);
      setVehicles(v);
    } catch {
      toast.error('Could not load fleet');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const rememberPhoto = (file: File, preview: string) => {
    setPhoto((current) => {
      if (current?.preview.startsWith('blob:')) URL.revokeObjectURL(current.preview);
      return { file, preview };
    });
  };

  const clearPhoto = () => {
    setPhoto((current) => {
      if (current?.preview.startsWith('blob:')) URL.revokeObjectURL(current.preview);
      return null;
    });
  };

  const resetDriverForm = () => {
    setEditingAgentId(null);
    setName('');
    setEmail('');
    setPhone('');
    setExistingPhoto(null);
    clearPhoto();
  };

  const resetVehicleForm = () => {
    setEditingVehicleId(null);
    setReg('');
    setVType('');
    setVLength('');
    setVBreadth('');
    setVHeight('');
  };

  const openAdd = () => {
    if (tab === 'drivers') resetDriverForm();
    else resetVehicleForm();
    setSheetOpen(true);
  };

  const openEditDriver = (agent: DeliveryAgent) => {
    setTab('drivers');
    setEditingVehicleId(null);
    setEditingAgentId(agent.id);
    setName(agent.name);
    setEmail(agent.email ?? '');
    setPhone(agent.phone ?? '');
    setExistingPhoto(agent.photoUrl ?? null);
    clearPhoto();
    if (appShell) setSheetOpen(true);
  };

  const openEditVehicle = (vehicle: DeliveryVehicle) => {
    setTab('vehicles');
    setEditingAgentId(null);
    setEditingVehicleId(vehicle.id);
    setReg(vehicle.registrationNumber);
    setVType(vehicle.vehicleType ?? '');
    setVLength(vehicle.lengthCm != null ? String(vehicle.lengthCm) : '');
    setVBreadth(vehicle.breadthCm != null ? String(vehicle.breadthCm) : '');
    setVHeight(vehicle.heightCm != null ? String(vehicle.heightCm) : '');
    if (appShell) setSheetOpen(true);
  };

  const addDriver = async (): Promise<boolean> => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email required');
      return false;
    }
    setSavingDriver(true);
    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
    };
    try {
      const saved = editingAgentId
        ? await DistributorDeliveryService.updateAgent(editingAgentId, payload)
        : await DistributorDeliveryService.createAgent(payload);
      let photoFailed = false;
      if (photo) {
        try {
          await DistributorDeliveryService.uploadAgentPhoto(saved.id, photo.file);
        } catch {
          photoFailed = true;
        }
      }
      if (photoFailed) {
        toast.warning(
          editingAgentId
            ? 'Driver updated, but the photo could not be uploaded'
            : 'Driver added, but the photo could not be uploaded',
        );
      } else {
        toast.success(editingAgentId ? 'Driver updated' : 'Driver added');
      }
      resetDriverForm();
      await load();
      return true;
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, editingAgentId ? 'Failed to update driver' : 'Failed to add driver'),
      );
      return false;
    } finally {
      setSavingDriver(false);
    }
  };

  const addVehicle = async (): Promise<boolean> => {
    if (!reg.trim()) {
      toast.error('Registration required');
      return false;
    }
    const lengthCm = parseFloat(vLength);
    const breadthCm = parseFloat(vBreadth);
    const heightCm = parseFloat(vHeight);
    if (!(lengthCm > 0 && breadthCm > 0 && heightCm > 0)) {
      toast.error('Enter vehicle length, breadth, and height (cm)');
      return false;
    }
    try {
      const payload = {
        registrationNumber: reg.trim(),
        vehicleType: vType.trim() || undefined,
        lengthCm,
        breadthCm,
        heightCm,
      };
      if (editingVehicleId) {
        await DistributorDeliveryService.updateVehicle(editingVehicleId, payload);
        toast.success('Vehicle updated');
      } else {
        await DistributorDeliveryService.createVehicle(payload);
        toast.success('Vehicle added');
      }
      resetVehicleForm();
      await load();
      return true;
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          editingVehicleId ? 'Failed to update vehicle' : 'Failed to add vehicle',
        ),
      );
      return false;
    }
  };

  const driverFields = (
    <div className="space-y-3">
      <div>
        <Label>Name</Label>
        <Input className="max-lg:h-11" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label>Email</Label>
        <Input className="max-lg:h-11" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label>Phone</Label>
        <Input className="max-lg:h-11" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <Label>Driver photo (optional)</Label>
        <DriverPhotoField
          previewUrl={photo?.preview ?? existingPhoto}
          onPhoto={rememberPhoto}
          onClear={
            photo || existingPhoto
              ? () => {
                  clearPhoto();
                  setExistingPhoto(null);
                }
              : undefined
          }
        />
      </div>
    </div>
  );

  const vehicleFields = (
    <div className="space-y-3">
      <div>
        <Label>Registration</Label>
        <Input className="max-lg:h-11" value={reg} onChange={(e) => setReg(e.target.value)} />
      </div>
      <div>
        <Label>Type (optional)</Label>
        <Input className="max-lg:h-11" value={vType} onChange={(e) => setVType(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label>L (cm)</Label>
          <Input className="max-lg:h-11" type="number" inputMode="decimal" value={vLength} onChange={(e) => setVLength(e.target.value)} />
        </div>
        <div>
          <Label>B (cm)</Label>
          <Input className="max-lg:h-11" type="number" inputMode="decimal" value={vBreadth} onChange={(e) => setVBreadth(e.target.value)} />
        </div>
        <div>
          <Label>H (cm)</Label>
          <Input className="max-lg:h-11" type="number" inputMode="decimal" value={vHeight} onChange={(e) => setVHeight(e.target.value)} />
        </div>
      </div>
    </div>
  );

  const saveFromSheet = async (): Promise<void> => {
    const ok = tab === 'drivers' ? await addDriver() : await addVehicle();
    if (ok) setSheetOpen(false);
  };

  return (
    <DeliveryPageShell
      title="Fleet"
      subtitle="Drivers receive delivery instructions by email when you book. No driver login required."
    >
      {appShell ? (
        <div className="flex items-center gap-2">
          <SegmentedControl<Tab>
            className="min-w-0 flex-1"
            ariaLabel="Fleet"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'drivers', label: 'Drivers', count: agents.length },
              { value: 'vehicles', label: 'Vehicles', count: vehicles.length },
            ]}
          />
          <Button className="h-10 shrink-0" onClick={openAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      ) : null}

      {appShell ? (
        <ResponsiveDialog
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={
            tab === 'drivers'
              ? editingAgentId
                ? 'Edit driver'
                : 'Add driver'
              : editingVehicleId
                ? 'Edit vehicle'
                : 'Add vehicle'
          }
          description={
            tab === 'drivers'
              ? 'The driver receives the gate QR by email for each booking.'
              : 'Dimensions are used to check the load fits.'
          }
          footer={
            <Button
              className="h-12 w-full"
              disabled={tab === 'drivers' && savingDriver}
              onClick={() => void saveFromSheet()}
            >
              {tab === 'drivers'
                ? editingAgentId
                  ? 'Update driver'
                  : 'Save driver'
                : editingVehicleId
                  ? 'Update vehicle'
                  : 'Save vehicle'}
            </Button>
          }
        >
          {tab === 'drivers' ? driverFields : vehicleFields}
        </ResponsiveDialog>
      ) : null}

      <div className="flex gap-2 max-lg:hidden">
        <Button
          size="sm"
          variant={tab === 'drivers' ? 'default' : 'outline'}
          onClick={() => setTab('drivers')}
        >
          Drivers
        </Button>
        <Button
          size="sm"
          variant={tab === 'vehicles' ? 'default' : 'outline'}
          onClick={() => setTab('vehicles')}
        >
          Vehicles
        </Button>
      </div>

      {tab === 'drivers' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-[#001B71]/08 bg-white/90 max-lg:hidden">
            <CardHeader>
              <CardTitle>{editingAgentId ? 'Edit driver' : 'Add driver'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {driverFields}
              <div className="flex gap-2">
                <Button disabled={savingDriver} onClick={() => void addDriver()}>
                  {savingDriver ? 'Saving…' : editingAgentId ? 'Update driver' : 'Save driver'}
                </Button>
                {editingAgentId ? (
                  <Button type="button" variant="outline" onClick={resetDriverForm}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#001B71]/08 bg-white/90">
            <CardHeader>
              <CardTitle>Drivers ({agents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <DeliveryEmptyState title="No drivers yet" description="Add a driver to assign on bookings." />
              ) : (
                <ul className="space-y-2 text-sm">
                  {agents.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                      {a.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                        <img
                          src={a.photoUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                          {a.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{a.name}</p>
                        <p className="truncate text-muted-foreground">
                          {a.email}
                          {a.phone ? ` · ${a.phone}` : ''}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => openEditDriver(a)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-[#001B71]/08 bg-white/90 max-lg:hidden">
            <CardHeader>
              <CardTitle>{editingVehicleId ? 'Edit vehicle' : 'Add vehicle'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vehicleFields}
              <div className="flex gap-2">
                <Button onClick={() => void addVehicle()}>
                  {editingVehicleId ? 'Update vehicle' : 'Save vehicle'}
                </Button>
                {editingVehicleId ? (
                  <Button type="button" variant="outline" onClick={resetVehicleForm}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#001B71]/08 bg-white/90">
            <CardHeader>
              <CardTitle>Vehicles ({vehicles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicles.length === 0 ? (
                <DeliveryEmptyState title="No vehicles yet" description="Add a vehicle for bookings." />
              ) : (
                <ul className="space-y-2 text-sm">
                  {vehicles.map((v) => (
                    <li key={v.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{v.registrationNumber}</p>
                        <p className="text-muted-foreground">{v.vehicleType ?? '—'}</p>
                        {v.volumeCm3 != null && (
                          <p className="text-xs text-muted-foreground">
                            Volume {v.volumeCm3.toLocaleString()} cm³
                            {v.lengthCm != null
                              ? ` (${v.lengthCm}×${v.breadthCm}×${v.heightCm} cm)`
                              : ''}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => openEditVehicle(v)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DeliveryPageShell>
  );
}
