'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Plus, Printer, Trash2, Upload } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { openFileInNewTab } from '@/lib/download';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AttachmentType, InspectionMeasurement, InspectionStatus, LaborEstimateRow, MaterialEstimateRow, SiteInspection } from '@/types';

const STATUS_VARIANT: Record<InspectionStatus, 'secondary' | 'default' | 'outline' | 'success' | 'destructive'> = {
  PENDING: 'outline',
  SCHEDULED: 'secondary',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

const ATTACHMENT_TYPE_LABEL: Record<AttachmentType, string> = {
  PHOTO: 'Photo',
  VIDEO: 'Video',
  DRAWING: 'Drawing',
  DOCUMENT: 'Document',
};

const MATERIAL_UNITS = ['pcs', 'meters', 'sq. meters', 'kg', 'liters', 'boxes', 'rolls', 'sets'];

/** Height × Width, rounded to 2 decimals — recomputed on every edit so Area never needs manual entry. */
function computeArea(height?: number | string | null, width?: number | string | null): number | undefined {
  const h = Number(height);
  const w = Number(width);
  if (!h || !w) return undefined;
  return Math.round(h * w * 100) / 100;
}

interface InspectionDetail extends SiteInspection {
  serviceRequest?: { id: string; referenceNo: string; title?: string | null; customer?: { fullName: string }; serviceCategory?: { name: string } };
}

/** Compact read-only label/value pair — used for computed or non-editable summary data. */
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

/** Compact card section header — smaller than the app-wide default so a page with several
 *  sections still reads as one scannable whole rather than a stack of full-size cards. */
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
      <CardTitle className="text-sm">{title}</CardTitle>
      {action}
    </CardHeader>
  );
}

export default function SiteInspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: inspection, isLoading } = useQuery({
    queryKey: ['site-inspection', id],
    queryFn: () => api.get<InspectionDetail>(`/inspections/${id}`),
  });

  const [measurements, setMeasurements] = React.useState<Partial<InspectionMeasurement>[]>([]);
  const [materials, setMaterials] = React.useState<MaterialEstimateRow[]>([]);
  const [labor, setLabor] = React.useState<LaborEstimateRow[]>([]);
  const [siteAddress, setSiteAddress] = React.useState('');
  const [city, setCity] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [transportationCost, setTransportationCost] = React.useState('');
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
  const [attachmentType, setAttachmentType] = React.useState<AttachmentType>('PHOTO');
  const [uploading, setUploading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!inspection) return;
    setMeasurements(inspection.measurements ?? []);
    setMaterials(inspection.materialEstimate ?? []);
    setLabor(inspection.laborEstimate ?? []);
    setSiteAddress(inspection.siteAddress ?? '');
    setCity(inspection.city ?? '');
    setRegion(inspection.region ?? '');
    setTransportationCost(inspection.transportationCost != null ? String(inspection.transportationCost) : '');
  }, [inspection]);

  const isDraft = inspection?.status === 'PENDING';
  const isLocked = inspection?.status === 'COMPLETED' || inspection?.status === 'CANCELLED';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['site-inspection', id] });
    queryClient.invalidateQueries({ queryKey: ['site-inspections'] });
    queryClient.invalidateQueries({ queryKey: ['service-request'] });
    queryClient.invalidateQueries({ queryKey: ['service-request-statistics'] });
  };

  function buildPayload() {
    return {
      siteAddress: siteAddress || undefined,
      city: city || undefined,
      region: region || undefined,
      measurements: measurements
        .filter((m) => m.label)
        .map((m) => ({
          label: m.label!,
          width: m.width != null ? Number(m.width) : undefined,
          height: m.height != null ? Number(m.height) : undefined,
          area: m.area != null ? Number(m.area) : undefined,
        })),
      materialEstimate: materials.filter((m) => m.material),
      laborEstimate: labor.filter((l) => l.task),
      transportationCost: transportationCost ? Number(transportationCost) : undefined,
      // No manual override: the backend derives estimatedCost as material + labor +
      // transportation whenever it isn't explicitly sent — leaving it out here is what
      // keeps "Estimated Total" a pure auto-calculation instead of an editable field.
    };
  }

  const registrationSaveMutation = useMutation({
    mutationFn: (status?: 'SCHEDULED') => api.patch(`/inspections/${id}`, { ...buildPayload(), status }),
    onSuccess: (_data, status) => {
      invalidate();
      toast({ title: status === 'SCHEDULED' ? 'Inspection submitted' : 'Draft saved' });
    },
    onError: (error) => {
      toast({ title: 'Could not save', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/inspections/${id}`),
    onSuccess: () => {
      toast({ title: 'Inspection deleted' });
      router.push('/site-inspections');
    },
    onError: (error) => {
      toast({ title: 'Could not delete this inspection', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
      setConfirmDelete(false);
    },
  });

  async function handlePrint() {
    try {
      await openFileInNewTab(`/inspections/${id}/pdf`);
    } catch (error) {
      toast({ title: 'Could not open the report', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/inspections/${id}/details`, buildPayload()),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Inspection details saved' });
    },
    onError: (error) => {
      toast({ title: 'Could not save details', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/inspections/${id}/complete`, buildPayload()),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Inspection completed' });
    },
    onError: (error) => {
      toast({ title: 'Could not complete inspection', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  async function handleAttachmentUpload() {
    if (!attachmentFile) return;
    setUploading(true);
    try {
      const { signedUrl, publicUrl } = await api.post<{ signedUrl: string; publicUrl: string }>(`/inspections/${id}/photos/upload-url`, {
        fileName: attachmentFile.name,
        mimeType: attachmentFile.type,
      });
      await fetch(signedUrl, { method: 'PUT', body: attachmentFile }).catch(() => {});
      await api.post(`/inspections/${id}/photos`, { fileUrl: publicUrl, fileType: attachmentType });
      toast({ title: 'Attachment uploaded' });
      setAttachmentFile(null);
      invalidate();
    } catch (error) {
      toast({ title: 'Upload failed', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  if (isLoading || !inspection) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // One primary action (the natural next step for the current status) plus everything else
  // — Print Report, alternate save actions, and Delete — in the "More" menu. Delete is always
  // last, separated, and rendered in destructive red so it reads as distinct from routine actions.
  let primaryAction: { label: string; pendingLabel: string; pending: boolean; disabled?: boolean; onClick: () => void };
  const secondaryItems: { label: string; pendingLabel?: string; pending?: boolean; icon?: React.ComponentType<{ className?: string }>; onClick: () => void }[] = [];

  if (isDraft) {
    primaryAction = {
      label: 'Submit Inspection',
      pendingLabel: 'Submitting…',
      pending: registrationSaveMutation.isPending && registrationSaveMutation.variables === 'SCHEDULED',
      disabled: !siteAddress,
      onClick: () => registrationSaveMutation.mutate('SCHEDULED'),
    };
    secondaryItems.push({
      label: 'Save Draft',
      pendingLabel: 'Saving…',
      pending: registrationSaveMutation.isPending && registrationSaveMutation.variables === undefined,
      onClick: () => registrationSaveMutation.mutate(undefined),
    });
  } else if (!isLocked && inspection.status === 'SCHEDULED') {
    primaryAction = { label: 'Start Inspection', pendingLabel: 'Starting…', pending: saveMutation.isPending, onClick: () => saveMutation.mutate() };
    secondaryItems.push({
      label: 'Complete Inspection',
      pendingLabel: 'Completing…',
      pending: completeMutation.isPending,
      onClick: () => completeMutation.mutate(),
    });
  } else if (!isLocked) {
    primaryAction = {
      label: 'Complete Inspection',
      pendingLabel: 'Completing…',
      pending: completeMutation.isPending,
      onClick: () => completeMutation.mutate(),
    };
    secondaryItems.push({ label: 'Save Details', pendingLabel: 'Saving…', pending: saveMutation.isPending, onClick: () => saveMutation.mutate() });
  } else {
    primaryAction = { label: 'Print Report', pendingLabel: 'Print Report', pending: false, onClick: handlePrint };
  }

  if (!isLocked) {
    secondaryItems.push({ label: 'Print Report', icon: Printer, onClick: handlePrint });
  }

  const statusSteps: { key: string; label: string; at: string | null; done: boolean }[] = [
    { key: 'registered', label: 'Registered', at: inspection.createdAt, done: true },
    { key: 'scheduled', label: 'Scheduled', at: inspection.status !== 'PENDING' ? inspection.updatedAt : null, done: inspection.status !== 'PENDING' },
    {
      key: 'in_progress',
      label: 'In Progress',
      at: inspection.status === 'IN_PROGRESS' || inspection.status === 'COMPLETED' ? inspection.updatedAt : null,
      done: inspection.status === 'IN_PROGRESS' || inspection.status === 'COMPLETED',
    },
    { key: 'completed', label: 'Completed', at: inspection.submittedAt ?? null, done: inspection.status === 'COMPLETED' },
  ];

  // Live, client-side mirror of the backend's own cost formula (materialCost + laborCost +
  // transportationCost) — computed straight from the current on-screen rows so Material Cost,
  // Labor Cost, and Estimated Total update instantly as the user types, instead of only
  // reflecting whatever was returned by the last save.
  const materialCostLive = materials.reduce((sum, m) => sum + (Number(m.estimatedCost) || 0), 0);
  const laborCostLive = labor.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
  const transportationCostLive = Number(transportationCost) || 0;
  const estimatedTotalLive = materialCostLive + laborCostLive + transportationCostLive;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{inspection.inspectionNo}</h1>
            <Badge variant={STATUS_VARIANT[inspection.status]}>{inspection.status.replaceAll('_', ' ')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {inspection.serviceRequest?.referenceNo} — {inspection.serviceRequest?.customer?.fullName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={primaryAction.disabled || primaryAction.pending} onClick={primaryAction.onClick}>
            {primaryAction.pending ? primaryAction.pendingLabel : primaryAction.label}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-2">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {secondaryItems.map((item) => (
                <DropdownMenuItem key={item.label} disabled={item.pending} onSelect={item.onClick}>
                  {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                  {item.pending ? item.pendingLabel : item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <Field label="Service" value={inspection.serviceRequest?.serviceCategory?.name} />
          <Field label="Inspector" value={inspection.inspector?.fullName} />
          <Field label="Scheduled" value={new Date(inspection.scheduledAt).toLocaleString()} />
          <Field label="Completed" value={inspection.submittedAt ? new Date(inspection.submittedAt).toLocaleString() : undefined} />
        </CardContent>
      </Card>

      <Card>
        <SectionHeader title="Site" />
        <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="siteAddress" className="text-xs">
              Address
            </Label>
            <Input
              id="siteAddress"
              className="h-8 text-sm"
              disabled={isLocked}
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="e.g. Villa 12, Al Nahda"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="city" className="text-xs">
              City
            </Label>
            <Input id="city" className="h-8 text-sm" disabled={isLocked} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="region" className="text-xs">
              Region
            </Label>
            <Input id="region" className="h-8 text-sm" disabled={isLocked} value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionHeader
          title="Measurements"
          action={
            !isLocked && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setMeasurements([...measurements, { label: '' }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Measurement
              </Button>
            )
          }
        />
        <CardContent className="space-y-2 p-4 pt-0">
          {measurements.length === 0 && <p className="text-sm text-muted-foreground">No measurements recorded.</p>}
          {measurements.length > 0 && (
            <div className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_2rem]">
              <span>Item</span>
              <span>Height (m)</span>
              <span>Width (m)</span>
              <span>Area (m²)</span>
              <span />
            </div>
          )}
          {measurements.map((m, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_2rem] sm:items-center">
              <div className="col-span-2 space-y-1 sm:col-span-1 sm:space-y-0">
                <Label htmlFor={`measurement-item-${i}`} className="text-xs sm:hidden">
                  Item
                </Label>
                <Input
                  id={`measurement-item-${i}`}
                  className="h-9 text-sm"
                  placeholder="Enter item"
                  disabled={isLocked}
                  value={m.label ?? ''}
                  onChange={(e) => setMeasurements(measurements.map((row, idx) => (idx === i ? { ...row, label: e.target.value } : row)))}
                />
              </div>
              <div className="space-y-1 sm:space-y-0">
                <Label htmlFor={`measurement-height-${i}`} className="text-xs sm:hidden">
                  Height (m)
                </Label>
                <Input
                  id={`measurement-height-${i}`}
                  type="number"
                  className="h-9 text-sm"
                  placeholder="0"
                  disabled={isLocked}
                  value={m.height ?? ''}
                  onChange={(e) =>
                    setMeasurements(
                      measurements.map((row, idx) =>
                        idx === i ? { ...row, height: Number(e.target.value), area: computeArea(e.target.value, row.width) } : row,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1 sm:space-y-0">
                <Label htmlFor={`measurement-width-${i}`} className="text-xs sm:hidden">
                  Width (m)
                </Label>
                <Input
                  id={`measurement-width-${i}`}
                  type="number"
                  className="h-9 text-sm"
                  placeholder="0"
                  disabled={isLocked}
                  value={m.width ?? ''}
                  onChange={(e) =>
                    setMeasurements(
                      measurements.map((row, idx) =>
                        idx === i ? { ...row, width: Number(e.target.value), area: computeArea(row.height, e.target.value) } : row,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1 sm:space-y-0">
                <Label htmlFor={`measurement-area-${i}`} className="text-xs sm:hidden">
                  Area (m²)
                </Label>
                <Input id={`measurement-area-${i}`} readOnly disabled className="h-9 bg-muted text-sm" value={m.area != null ? m.area : 'Auto-calculated'} />
              </div>
              {!isLocked && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="col-span-2 h-9 justify-self-start px-2 sm:col-span-1 sm:justify-self-center"
                  onClick={() => setMeasurements(measurements.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="ml-1 sm:hidden">Delete</span>
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <SectionHeader
          title="Materials"
          action={
            !isLocked && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setMaterials([...materials, { material: '', quantity: '', unit: MATERIAL_UNITS[0] }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Material
              </Button>
            )
          }
        />
        <CardContent className="space-y-2 p-4 pt-0">
          {materials.length === 0 && <p className="text-sm text-muted-foreground">No materials added.</p>}
          {materials.length > 0 && (
            <div className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_2rem]">
              <span>Material Name</span>
              <span>Quantity</span>
              <span>Unit</span>
              <span>Cost</span>
              <span />
            </div>
          )}
          {materials.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_2rem] sm:items-center">
              <div className="col-span-2 space-y-1 sm:col-span-1 sm:space-y-0">
                <Label htmlFor={`material-name-${i}`} className="text-xs sm:hidden">
                  Material Name
                </Label>
                <Input
                  id={`material-name-${i}`}
                  className="h-9 text-sm"
                  placeholder="Enter material name"
                  disabled={isLocked}
                  value={row.material}
                  onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, material: e.target.value } : r)))}
                />
              </div>
              <div className="space-y-1 sm:space-y-0">
                <Label htmlFor={`material-qty-${i}`} className="text-xs sm:hidden">
                  Quantity
                </Label>
                <Input
                  id={`material-qty-${i}`}
                  type="number"
                  className="h-9 text-sm"
                  placeholder="0"
                  disabled={isLocked}
                  value={row.quantity}
                  onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, quantity: e.target.value } : r)))}
                />
              </div>
              <div className="space-y-1 sm:space-y-0">
                <Label htmlFor={`material-unit-${i}`} className="text-xs sm:hidden">
                  Unit
                </Label>
                <Select
                  value={row.unit || undefined}
                  onValueChange={(v) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, unit: v } : r)))}
                  disabled={isLocked}
                >
                  <SelectTrigger id={`material-unit-${i}`} className="h-9 text-sm">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:space-y-0">
                <Label htmlFor={`material-cost-${i}`} className="text-xs sm:hidden">
                  Cost
                </Label>
                <Input
                  id={`material-cost-${i}`}
                  type="number"
                  className="h-9 text-sm"
                  placeholder="0.00"
                  disabled={isLocked}
                  value={row.estimatedCost ?? ''}
                  onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, estimatedCost: Number(e.target.value) } : r)))}
                />
              </div>
              {!isLocked && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="col-span-2 h-9 justify-self-start px-2 sm:col-span-1 sm:justify-self-center"
                  onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="ml-1 sm:hidden">Delete</span>
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <SectionHeader
          title="Labor"
          action={
            !isLocked && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setLabor([...labor, { task: '', cost: 0 }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Labor
              </Button>
            )
          }
        />
        <CardContent className="space-y-2 p-4 pt-0">
          {labor.length === 0 && <p className="text-sm text-muted-foreground">No labor added.</p>}
          {labor.length > 0 && (
            <div className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_2rem]">
              <span>Work Type</span>
              <span>Workers</span>
              <span>Days</span>
              <span>Cost</span>
              <span />
            </div>
          )}
          {labor.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_2rem] sm:items-center">
              <div className="col-span-2 space-y-1 sm:col-span-1 sm:space-y-0">
                <Label htmlFor={`labor-task-${i}`} className="text-xs sm:hidden">
                  Work Type
                </Label>
                <Input
                  id={`labor-task-${i}`}
                  className="h-9 text-sm"
                  placeholder="Enter work type"
                  disabled={isLocked}
                  value={row.task}
                  onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, task: e.target.value } : r)))}
                />
              </div>
              <div className="space-y-1 sm:space-y-0">
                <Label htmlFor={`labor-workers-${i}`} className="text-xs sm:hidden">
                  Workers
                </Label>
                <Input
                  id={`labor-workers-${i}`}
                  type="number"
                  className="h-9 text-sm"
                  placeholder="0"
                  disabled={isLocked}
                  value={row.workers ?? ''}
                  onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, workers: Number(e.target.value) } : r)))}
                />
              </div>
              <div className="space-y-1 sm:space-y-0">
                <Label htmlFor={`labor-days-${i}`} className="text-xs sm:hidden">
                  Days
                </Label>
                <Input
                  id={`labor-days-${i}`}
                  type="number"
                  className="h-9 text-sm"
                  placeholder="0"
                  disabled={isLocked}
                  value={row.days ?? ''}
                  onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, days: Number(e.target.value) } : r)))}
                />
              </div>
              <div className="space-y-1 sm:space-y-0">
                <Label htmlFor={`labor-cost-${i}`} className="text-xs sm:hidden">
                  Cost
                </Label>
                <Input
                  id={`labor-cost-${i}`}
                  type="number"
                  className="h-9 text-sm"
                  placeholder="0.00"
                  disabled={isLocked}
                  value={row.cost}
                  onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, cost: Number(e.target.value) } : r)))}
                />
              </div>
              {!isLocked && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="col-span-2 h-9 justify-self-start px-2 sm:col-span-1 sm:justify-self-center"
                  onClick={() => setLabor(labor.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="ml-1 sm:hidden">Delete</span>
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <SectionHeader title="Cost Estimate" />
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Material Cost" value={`$${materialCostLive.toFixed(2)}`} />
            <Field label="Labor Cost" value={`$${laborCostLive.toFixed(2)}`} />
            <div className="space-y-1">
              <Label htmlFor="transportationCost" className="text-xs">
                Transportation
              </Label>
              <Input
                id="transportationCost"
                type="number"
                className="h-9 text-sm"
                placeholder="0.00"
                disabled={isLocked}
                value={transportationCost}
                onChange={(e) => setTransportationCost(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3">
            <span className="text-sm font-medium">Estimated Total</span>
            <span className="text-2xl font-semibold">${estimatedTotalLive.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionHeader title="Attachments" />
        <CardContent className="space-y-3 p-4 pt-0">
          {(!inspection.photos || inspection.photos.length === 0) && <p className="text-sm text-muted-foreground">No attachments uploaded.</p>}
          {inspection.photos && inspection.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {inspection.photos.map((p) =>
                p.fileType === 'PHOTO' ? (
                  <a key={p.id} href={p.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.fileUrl} alt={p.caption ?? 'Inspection photo'} loading="lazy" className="h-16 w-full object-cover" />
                  </a>
                ) : (
                  <a
                    key={p.id}
                    href={p.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-md border border-border text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">{ATTACHMENT_TYPE_LABEL[p.fileType]}</span>
                    <span>View</span>
                  </a>
                ),
              )}
            </div>
          )}
          {!isLocked && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={attachmentType} onValueChange={(v) => setAttachmentType(v as AttachmentType)}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHOTO">Photo</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="DRAWING">Drawing</SelectItem>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                </SelectContent>
              </Select>
              <Input type="file" className="h-8 max-w-xs text-xs" onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)} />
              <Button size="sm" variant="outline" className="h-8" disabled={!attachmentFile || uploading} onClick={handleAttachmentUpload}>
                <Upload className="mr-1 h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <SectionHeader title="Status" />
        <CardContent className="p-4 pt-0">
          <div className="flex items-start">
            {statusSteps.map((step, i) => (
              <React.Fragment key={step.key}>
                <div className="flex w-20 flex-col items-center gap-1 text-center">
                  <span className={`h-2 w-2 rounded-full ${step.done ? 'bg-primary' : 'bg-muted'}`} />
                  <span className="text-xs font-medium">{step.label}</span>
                  <span className="text-[10px] text-muted-foreground">{step.at ? new Date(step.at).toLocaleDateString() : '—'}</span>
                </div>
                {i < statusSteps.length - 1 && <div className={`mt-1 h-px flex-1 ${step.done ? 'bg-primary' : 'bg-muted'}`} />}
              </React.Fragment>
            ))}
          </div>
          {inspection.status === 'CANCELLED' && (
            <p className="mt-3 text-xs text-destructive">Cancelled on {new Date(inspection.updatedAt).toLocaleString()}</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Site Inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Inspections that already have a Quotation built from them cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
