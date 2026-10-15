import type { PackageType, VehicleCategory } from '@/lib/services/distributorDeliveryService';

const STORAGE_KEY = 'deliveryBookingDraft';
export const DELIVERY_BOOK_PATH = '/vendor/deliveries/book';

export interface DeliveryDraftPackage {
  id: string;
  packageType: PackageType;
  qty: string;
  remarks: string;
  customSize: string;
  customWeightKg: string;
  supportRequired: string;
}

/** Delivery details filled in before payment, kept while the distributor recharges the wallet. */
export interface DeliveryDraft {
  branchId: string;
  poNumber: string;
  slotDate: string;
  slotId: string;
  useUnscheduled: boolean;
  expectedArrivalTime: string;
  vehicleCategory: VehicleCategory | '';
  vehicleMode: 'existing' | 'new';
  vehicleId: string;
  vehicleReg: string;
  agentMode: 'existing' | 'new';
  agentId: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  packages: DeliveryDraftPackage[];
  /** Driver photo as a data URL; dropped when it is too large for session storage. */
  driverPhoto?: { dataUrl: string; name: string; type: string } | null;
}

/** Returns false when the draft could not be stored at all. */
export function saveDeliveryDraft(draft: DeliveryDraft): boolean {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    if (!draft.driverPhoto) return false;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, driverPhoto: null }));
      return true;
    } catch {
      return false;
    }
  }
}

export function loadDeliveryDraft(): DeliveryDraft | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DeliveryDraft) : null;
  } catch {
    return null;
  }
}

export function clearDeliveryDraft(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Wallet page link that returns to the booking payment step after a recharge. */
export function walletRechargeHref(shortfall: number | null): string {
  const params = new URLSearchParams({ returnTo: `${DELIVERY_BOOK_PATH}?resume=1` });
  if (shortfall && shortfall > 0) params.set('amount', String(Math.ceil(shortfall)));
  return `/vendor/wallet?${params.toString()}`;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function dataUrlToFile(dataUrl: string, name: string, type: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: type || blob.type });
}
