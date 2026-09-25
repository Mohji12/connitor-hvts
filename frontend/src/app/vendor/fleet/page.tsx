'use client';

import * as React from 'react';
import { toast } from 'sonner';
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

type Tab = 'drivers' | 'vehicles';

export default function VendorFleetPage(): React.ReactElement {
  const [tab, setTab] = React.useState<Tab>('drivers');
  const [agents, setAgents] = React.useState<DeliveryAgent[]>([]);
  const [vehicles, setVehicles] = React.useState<DeliveryVehicle[]>([]);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [reg, setReg] = React.useState('');
  const [vType, setVType] = React.useState('');
  const [vLength, setVLength] = React.useState('');
  const [vBreadth, setVBreadth] = React.useState('');
  const [vHeight, setVHeight] = React.useState('');

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

  const addDriver = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email required');
      return;
    }
    try {
      await DistributorDeliveryService.createAgent({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      toast.success('Driver added');
      setName('');
      setEmail('');
      setPhone('');
      await load();
    } catch {
      toast.error('Failed to add driver');
    }
  };

  const addVehicle = async () => {
    if (!reg.trim()) {
      toast.error('Registration required');
      return;
    }
    const lengthCm = parseFloat(vLength);
    const breadthCm = parseFloat(vBreadth);
    const heightCm = parseFloat(vHeight);
    if (!(lengthCm > 0 && breadthCm > 0 && heightCm > 0)) {
      toast.error('Enter vehicle length, breadth, and height (cm)');
      return;
    }
    try {
      await DistributorDeliveryService.createVehicle({
        registrationNumber: reg.trim(),
        vehicleType: vType.trim() || undefined,
        lengthCm,
        breadthCm,
        heightCm,
      });
      toast.success('Vehicle added');
      setReg('');
      setVType('');
      setVLength('');
      setVBreadth('');
      setVHeight('');
      await load();
    } catch {
      toast.error('Failed to add vehicle');
    }
  };

  return (
    <DeliveryPageShell
      title="Fleet"
      subtitle="Drivers receive delivery instructions by email when you book. No driver login required."
    >
      <div className="flex gap-2">
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
          <Card className="border-[#001B71]/08 bg-white/90">
            <CardHeader>
              <CardTitle>Add driver</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Button onClick={() => void addDriver()}>
                Save driver
              </Button>
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
                    <li key={a.id} className="rounded-lg border p-3">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-muted-foreground">
                        {a.email}
                        {a.phone ? ` · ${a.phone}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-[#001B71]/08 bg-white/90">
            <CardHeader>
              <CardTitle>Add vehicle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Registration</Label>
                <Input value={reg} onChange={(e) => setReg(e.target.value)} />
              </div>
              <div>
                <Label>Type (optional)</Label>
                <Input value={vType} onChange={(e) => setVType(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>L (cm)</Label>
                  <Input
                    type="number"
                    value={vLength}
                    onChange={(e) => setVLength(e.target.value)}
                  />
                </div>
                <div>
                  <Label>B (cm)</Label>
                  <Input
                    type="number"
                    value={vBreadth}
                    onChange={(e) => setVBreadth(e.target.value)}
                  />
                </div>
                <div>
                  <Label>H (cm)</Label>
                  <Input
                    type="number"
                    value={vHeight}
                    onChange={(e) => setVHeight(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={() => void addVehicle()}>
                Save vehicle
              </Button>
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
                    <li key={v.id} className="rounded-lg border p-3">
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
