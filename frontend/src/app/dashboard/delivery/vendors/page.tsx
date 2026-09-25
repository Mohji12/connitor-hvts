'use client';

import * as React from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { useAuthSession } from '@/hooks/useAuthSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeliveryEmptyState, DeliveryPageShell } from '@/features/delivery-management/ui';

interface MappingRow {
  mappingId: string;
  approvalStatus: string;
  vendorId?: string;
  verificationStatus?: string;
  onboardingStatus?: string | null;
  contactPerson?: string | null;
  vendorType?: string | null;
  gstNumber?: string | null;
  vendor: {
    id: string;
    vendorCode: string;
    vendorName: string;
    email?: string | null;
    phone?: string | null;
    verificationStatus?: string;
    onboardingStatus?: string | null;
    contactPerson?: string | null;
    vendorType?: string | null;
    gstNumber?: string | null;
  };
}

type DistributorDetail = {
  id: string;
  vendorCode: string;
  vendorName: string;
  tradeName?: string | null;
  vendorType?: string | null;
  legalEntityType?: string | null;
  gstNumber?: string | null;
  gstRegistrationType?: string | null;
  panNumber?: string | null;
  cin?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  verificationStatus?: string;
  onboardingStatus?: string | null;
  rejectionReason?: string | null;
  goodsDescription?: string | null;
  deliveryMode?: string | null;
  supplyCategories?: string[];
  registeredAddress?: {
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    pinCode?: string;
  } | null;
  documents?: Array<{
    id: string;
    documentType: string;
    documentNumber?: string | null;
    fileUrl?: string | null;
    verificationStatus?: string;
  }>;
  branchMappings?: Array<{
    mappingId: string;
    branchName?: string | null;
    approvalStatus: string;
  }>;
  canBookDeliveries?: boolean;
};

export default function DeliveryVendorsPage(): React.ReactElement {
  const user = useAuthSession<{ branchId?: string }>();
  const branchId = user?.branchId;
  const [items, setItems] = React.useState<MappingRow[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<DistributorDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await apiClient.get('/api/delivery/vendor-mappings', {
        params: { branchId },
      });
      setItems(res.data.items ?? []);
    } catch {
      toast.error('Could not load vendors');
      setItems([]);
    }
  }, [branchId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (vendorId: string) => {
    setSelectedId(vendorId);
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/api/delivery/distributors/${vendorId}`);
      setDetail(res.data);
    } catch {
      toast.error('Could not load vendor profile');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const approve = async (mappingId: string) => {
    try {
      await apiClient.post(`/api/delivery/vendor-mappings/${mappingId}/approve`);
      toast.success('Vendor approved for this branch');
      await load();
      if (selectedId) await openDetail(selectedId);
    } catch {
      toast.error('Approve failed');
    }
  };

  const setVerification = async (status: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW') => {
    if (!selectedId) return;
    try {
      const res = await apiClient.post(`/api/delivery/distributors/${selectedId}/verification`, {
        status,
        rejectionReason:
          status === 'REJECTED' ? 'Incomplete or invalid documents — please re-apply or contact vendor desk.' : undefined,
      });
      setDetail(res.data);
      toast.success(`Platform verification set to ${status}`);
      await load();
    } catch (e: unknown) {
      const detailMsg =
        typeof e === 'object' && e && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : '';
      toast.error(detailMsg || 'Could not update verification');
    }
  };

  return (
    <DeliveryPageShell
      title="Delivery vendors"
      subtitle="Review distributor onboarding profiles, verify documents, and approve branch mappings."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-amber-100 bg-white/90">
          <CardHeader>
            <CardTitle>Branch mappings</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <DeliveryEmptyState
                title="No vendor mappings"
                description="Distributors appear here when they apply or are linked to your branch."
              />
            ) : (
              <ul className="space-y-2">
                {items.map((m) => {
                  const vendorId = m.vendorId ?? m.vendor.id;
                  const verification =
                    m.verificationStatus ?? m.vendor.verificationStatus ?? 'PENDING';
                  return (
                    <li
                      key={m.mappingId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => void openDetail(vendorId)}
                      >
                        <p className="font-medium">
                          {m.vendor.vendorName}{' '}
                          <span className="text-muted-foreground">({m.vendor.vendorCode})</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {m.vendor.email ?? '—'} · {m.vendor.phone ?? '—'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Platform: {verification}
                          {m.vendor.vendorType || m.vendorType
                            ? ` · ${m.vendor.vendorType ?? m.vendorType}`
                            : ''}
                        </p>
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            verification === 'APPROVED'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                          }
                        >
                          {verification}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            m.approvalStatus === 'APPROVED'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-amber-200 bg-amber-50 text-amber-900'
                          }
                        >
                          Branch: {m.approvalStatus}
                        </Badge>
                        {m.approvalStatus !== 'APPROVED' && (
                          <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => void approve(m.mappingId)}
                          >
                            Approve branch
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-teal-100 bg-white/90">
          <CardHeader>
            <CardTitle>Vendor profile</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedId && (
              <p className="text-sm text-muted-foreground">
                Select a vendor from the list to review onboarding details and documents.
              </p>
            )}
            {selectedId && detailLoading && (
              <p className="text-sm text-muted-foreground">Loading profile…</p>
            )}
            {detail && !detailLoading && (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{detail.vendorName}</p>
                  <p className="text-muted-foreground">
                    {detail.vendorCode}
                    {detail.tradeName ? ` · ${detail.tradeName}` : ''}
                  </p>
                </div>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Contact</dt>
                    <dd>{detail.contactPerson ?? '—'} · {detail.phone ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd>{detail.email ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd>
                      {detail.vendorType ?? '—'} · {detail.legalEntityType ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">GST / PAN</dt>
                    <dd>
                      {detail.gstNumber ?? '—'} / {detail.panNumber ?? '—'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Address</dt>
                    <dd>
                      {detail.registeredAddress
                        ? [
                            detail.registeredAddress.line1,
                            detail.registeredAddress.line2,
                            detail.registeredAddress.city,
                            detail.registeredAddress.state,
                            detail.registeredAddress.pinCode,
                          ]
                            .filter(Boolean)
                            .join(', ')
                        : `${detail.city ?? '—'}, ${detail.state ?? '—'}`}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Goods</dt>
                    <dd>{detail.goodsDescription ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Supply categories</dt>
                    <dd>{(detail.supplyCategories ?? []).join(', ') || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Can book</dt>
                    <dd>{detail.canBookDeliveries ? 'Yes' : 'No — pending approvals'}</dd>
                  </div>
                </dl>

                <div className="space-y-2">
                  <p className="font-medium">Documents</p>
                  {(detail.documents ?? []).length === 0 ? (
                    <p className="text-muted-foreground">No documents uploaded.</p>
                  ) : (
                    <ul className="space-y-1">
                      {(detail.documents ?? []).map((d) => (
                        <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1.5">
                          <span>
                            {d.documentType}
                            {d.documentNumber ? ` · ${d.documentNumber}` : ''}
                          </span>
                          {d.fileUrl ? (
                            <a
                              href={d.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-800 underline"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="text-muted-foreground">No file</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => void setVerification('APPROVED')}
                  >
                    Verify platform profile
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void setVerification('UNDER_REVIEW')}
                  >
                    Mark under review
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void setVerification('REJECTED')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DeliveryPageShell>
  );
}
