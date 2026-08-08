'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Printer, Trash2, Upload } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { openFileInNewTab } from '@/lib/download';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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

interface InspectionDetail extends SiteInspection {
  serviceRequest?: { id: string; referenceNo: string; title?: string | null; customer?: { fullName: string }; serviceCategory?: { name: string } };
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
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

  const [technicalNotes, setTechnicalNotes] = React.useState('');
  const [internalNotes, setInternalNotes] = React.useState('');
  const [estimatedCost, setEstimatedCost] = React.useState('');
  const [estimatedDuration, setEstimatedDuration] = React.useState('');
  const [measurements, setMeasurements] = React.useState<Partial<InspectionMeasurement>[]>([]);
  const [materials, setMaterials] = React.useState<MaterialEstimateRow[]>([]);
  const [labor, setLabor] = React.useState<LaborEstimateRow[]>([]);
  const [siteAddress, setSiteAddress] = React.useState('');
  const [landmark, setLandmark] = React.useState('');
  const [city, setCity] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');
  const [inspectionPurpose, setInspectionPurpose] = React.useState('');
  const [customerRequirements, setCustomerRequirements] = React.useState('');
  const [existingSiteCondition, setExistingSiteCondition] = React.useState('');
  const [transportationCost, setTransportationCost] = React.useState('');
  const [estimatedWorkers, setEstimatedWorkers] = React.useState('');
  const [estimatedWorkingDays, setEstimatedWorkingDays] = React.useState('');
  const [specialSkillsRequired, setSpecialSkillsRequired] = React.useState('');
  const [vehicleRequired, setVehicleRequired] = React.useState('');
  const [transportDistance, setTransportDistance] = React.useState('');
  const [accessibility, setAccessibility] = React.useState('');
  const [transportationNotes, setTransportationNotes] = React.useState('');
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
  const [attachmentType, setAttachmentType] = React.useState<AttachmentType>('PHOTO');
  const [uploading, setUploading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!inspection) return;
    setTechnicalNotes(inspection.technicalNotes ?? '');
    setInternalNotes(inspection.internalNotes ?? '');
    setEstimatedCost(inspection.estimatedCost != null ? String(inspection.estimatedCost) : '');
    setEstimatedDuration(inspection.estimatedDuration ?? '');
    setMeasurements(inspection.measurements ?? []);
    setMaterials(inspection.materialEstimate ?? []);
    setLabor(inspection.laborEstimate ?? []);
    setSiteAddress(inspection.siteAddress ?? '');
    setLandmark(inspection.landmark ?? '');
    setCity(inspection.city ?? '');
    setRegion(inspection.region ?? '');
    setLatitude(inspection.latitude != null ? String(inspection.latitude) : '');
    setLongitude(inspection.longitude != null ? String(inspection.longitude) : '');
    setInspectionPurpose(inspection.inspectionPurpose ?? '');
    setCustomerRequirements(inspection.customerRequirements ?? '');
    setExistingSiteCondition(inspection.existingSiteCondition ?? '');
    setTransportationCost(inspection.transportationCost != null ? String(inspection.transportationCost) : '');
    setEstimatedWorkers(inspection.estimatedWorkers != null ? String(inspection.estimatedWorkers) : '');
    setEstimatedWorkingDays(inspection.estimatedWorkingDays != null ? String(inspection.estimatedWorkingDays) : '');
    setSpecialSkillsRequired(inspection.specialSkillsRequired ?? '');
    setVehicleRequired(inspection.vehicleRequired ?? '');
    setTransportDistance(inspection.transportDistance != null ? String(inspection.transportDistance) : '');
    setAccessibility(inspection.accessibility ?? '');
    setTransportationNotes(inspection.transportationNotes ?? '');
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
      technicalNotes: technicalNotes || undefined,
      internalNotes: internalNotes || undefined,
      siteAddress: siteAddress || undefined,
      landmark: landmark || undefined,
      city: city || undefined,
      region: region || undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      inspectionPurpose: inspectionPurpose || undefined,
      customerRequirements: customerRequirements || undefined,
      existingSiteCondition: existingSiteCondition || undefined,
      measurements: measurements
        .filter((m) => m.label)
        .map((m) => ({
          label: m.label!,
          length: m.length != null ? Number(m.length) : undefined,
          width: m.width != null ? Number(m.width) : undefined,
          height: m.height != null ? Number(m.height) : undefined,
          unit: m.unit || undefined,
          quantity: m.quantity != null ? Number(m.quantity) : undefined,
          area: m.area != null ? Number(m.area) : undefined,
          notes: m.notes || undefined,
        })),
      materialEstimate: materials.filter((m) => m.material),
      laborEstimate: labor.filter((l) => l.task),
      transportationCost: transportationCost ? Number(transportationCost) : undefined,
      estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      estimatedDuration: estimatedDuration || undefined,
      estimatedWorkers: estimatedWorkers ? Number(estimatedWorkers) : undefined,
      estimatedWorkingDays: estimatedWorkingDays ? Number(estimatedWorkingDays) : undefined,
      specialSkillsRequired: specialSkillsRequired || undefined,
      vehicleRequired: vehicleRequired || undefined,
      transportDistance: transportDistance ? Number(transportDistance) : undefined,
      accessibility: accessibility || undefined,
      transportationNotes: transportationNotes || undefined,
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{inspection.inspectionNo}</h1>
            <Badge variant={STATUS_VARIANT[inspection.status]}>{inspection.status.replaceAll('_', ' ')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {inspection.serviceRequest?.referenceNo} — {inspection.serviceRequest?.customer?.fullName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-1 h-4 w-4" /> Print Report
          </Button>
          {isDraft && (
            <>
              <Button variant="outline" size="sm" disabled={registrationSaveMutation.isPending} onClick={() => registrationSaveMutation.mutate(undefined)}>
                {registrationSaveMutation.isPending && registrationSaveMutation.variables === undefined ? 'Saving…' : 'Save Draft'}
              </Button>
              <Button
                size="sm"
                disabled={registrationSaveMutation.isPending || !siteAddress}
                onClick={() => registrationSaveMutation.mutate('SCHEDULED')}
              >
                {registrationSaveMutation.isPending && registrationSaveMutation.variables === 'SCHEDULED' ? 'Submitting…' : 'Submit Inspection'}
              </Button>
            </>
          )}
          {!isDraft && !isLocked && (
            <>
              {inspection.status === 'SCHEDULED' ? (
                <Button variant="outline" size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? 'Starting…' : 'Start Inspection'}
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? 'Saving…' : 'Save Details'}
                </Button>
              )}
              <Button size="sm" disabled={completeMutation.isPending} onClick={() => completeMutation.mutate()}>
                {completeMutation.isPending ? 'Completing…' : 'Complete Inspection'}
              </Button>
            </>
          )}
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Service" value={inspection.serviceRequest?.serviceCategory?.name} />
          <Field label="Inspector" value={inspection.inspector?.fullName} />
          <Field label="Scheduled" value={new Date(inspection.scheduledAt).toLocaleString()} />
          {inspection.submittedAt && <Field label="Completed" value={new Date(inspection.submittedAt).toLocaleString()} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="siteAddress">Site address</Label>
            <Input id="siteAddress" disabled={isLocked} value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="e.g. Villa 12, Al Nahda" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="landmark">Landmark</Label>
            <Input id="landmark" disabled={isLocked} value={landmark} onChange={(e) => setLandmark(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="city">City</Label>
            <Input id="city" disabled={isLocked} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="region">Region</Label>
            <Input id="region" disabled={isLocked} value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" type="number" disabled={isLocked} value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" type="number" disabled={isLocked} value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="inspectionPurpose">Inspection Purpose</Label>
            <Textarea id="inspectionPurpose" rows={2} disabled={isLocked} value={inspectionPurpose} onChange={(e) => setInspectionPurpose(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="customerRequirements">Customer Requirements</Label>
            <Textarea id="customerRequirements" rows={2} disabled={isLocked} value={customerRequirements} onChange={(e) => setCustomerRequirements(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="existingSiteCondition">Existing Site Condition</Label>
            <Textarea id="existingSiteCondition" rows={2} disabled={isLocked} value={existingSiteCondition} onChange={(e) => setExistingSiteCondition(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="technicalNotes">Technical Notes</Label>
            <Textarea id="technicalNotes" rows={3} disabled={isLocked} value={technicalNotes} onChange={(e) => setTechnicalNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Measurements</CardTitle>
          {!isLocked && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMeasurements([...measurements, { label: '', unit: 'ft' }])}
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {measurements.length === 0 && <p className="text-sm text-muted-foreground">No measurements recorded.</p>}
          {measurements.map((m, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-9">
              <Input
                className="sm:col-span-2"
                placeholder="Area/Room"
                disabled={isLocked}
                value={m.label ?? ''}
                onChange={(e) => setMeasurements(measurements.map((row, idx) => (idx === i ? { ...row, label: e.target.value } : row)))}
              />
              <Input
                type="number"
                placeholder="Length"
                disabled={isLocked}
                value={m.length ?? ''}
                onChange={(e) => setMeasurements(measurements.map((row, idx) => (idx === i ? { ...row, length: Number(e.target.value) } : row)))}
              />
              <Input
                type="number"
                placeholder="Width"
                disabled={isLocked}
                value={m.width ?? ''}
                onChange={(e) => setMeasurements(measurements.map((row, idx) => (idx === i ? { ...row, width: Number(e.target.value) } : row)))}
              />
              <Input
                type="number"
                placeholder="Height"
                disabled={isLocked}
                value={m.height ?? ''}
                onChange={(e) => setMeasurements(measurements.map((row, idx) => (idx === i ? { ...row, height: Number(e.target.value) } : row)))}
              />
              <Input
                placeholder="Unit"
                disabled={isLocked}
                value={m.unit ?? ''}
                onChange={(e) => setMeasurements(measurements.map((row, idx) => (idx === i ? { ...row, unit: e.target.value } : row)))}
              />
              <Input
                type="number"
                placeholder="Qty"
                disabled={isLocked}
                value={m.quantity ?? ''}
                onChange={(e) => setMeasurements(measurements.map((row, idx) => (idx === i ? { ...row, quantity: Number(e.target.value) } : row)))}
              />
              <div className="flex gap-1">
                <Input
                  placeholder="Notes"
                  disabled={isLocked}
                  value={m.notes ?? ''}
                  onChange={(e) => setMeasurements(measurements.map((row, idx) => (idx === i ? { ...row, notes: e.target.value } : row)))}
                />
                {!isLocked && (
                  <Button variant="ghost" size="sm" onClick={() => setMeasurements(measurements.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Materials Assessment</CardTitle>
          {!isLocked && (
            <Button size="sm" variant="outline" onClick={() => setMaterials([...materials, { material: '', quantity: '', unit: '', remarks: '' }])}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {materials.length === 0 && <p className="text-sm text-muted-foreground">No materials estimated.</p>}
          {materials.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-6">
              <Input
                placeholder="Material"
                disabled={isLocked}
                value={row.material}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, material: e.target.value } : r)))}
              />
              <Input
                placeholder="Unit"
                disabled={isLocked}
                value={row.unit ?? ''}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, unit: e.target.value } : r)))}
              />
              <Input
                placeholder="Estimated Quantity"
                disabled={isLocked}
                value={row.quantity}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, quantity: e.target.value } : r)))}
              />
              <Input
                type="number"
                placeholder="Estimated cost (optional)"
                disabled={isLocked}
                value={row.estimatedCost ?? ''}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, estimatedCost: Number(e.target.value) } : r)))}
              />
              <Input
                placeholder="Remarks"
                disabled={isLocked}
                value={row.remarks ?? ''}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, remarks: e.target.value } : r)))}
              />
              {!isLocked && (
                <Button variant="ghost" size="sm" onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Labor Estimation</CardTitle>
          {!isLocked && (
            <Button size="sm" variant="outline" onClick={() => setLabor([...labor, { task: '', estimatedHours: 0, cost: 0 }])}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {labor.length === 0 && <p className="text-sm text-muted-foreground">No labor estimated.</p>}
          {labor.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input
                placeholder="Task"
                disabled={isLocked}
                value={row.task}
                onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, task: e.target.value } : r)))}
              />
              <Input
                type="number"
                placeholder="Estimated hours"
                disabled={isLocked}
                value={row.estimatedHours}
                onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, estimatedHours: Number(e.target.value) } : r)))}
              />
              <Input
                type="number"
                placeholder="Cost"
                disabled={isLocked}
                value={row.cost}
                onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, cost: Number(e.target.value) } : r)))}
              />
              {!isLocked && (
                <Button variant="ghost" size="sm" onClick={() => setLabor(labor.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Labor Assessment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="estimatedWorkers">Estimated Workers</Label>
            <Input id="estimatedWorkers" type="number" disabled={isLocked} value={estimatedWorkers} onChange={(e) => setEstimatedWorkers(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="estimatedWorkingDays">Estimated Working Days</Label>
            <Input
              id="estimatedWorkingDays"
              type="number"
              disabled={isLocked}
              value={estimatedWorkingDays}
              onChange={(e) => setEstimatedWorkingDays(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="specialSkillsRequired">Special Skills Required</Label>
            <Input id="specialSkillsRequired" disabled={isLocked} value={specialSkillsRequired} onChange={(e) => setSpecialSkillsRequired(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transportation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="vehicleRequired">Vehicle Required</Label>
              <Input id="vehicleRequired" disabled={isLocked} value={vehicleRequired} onChange={(e) => setVehicleRequired(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="transportDistance">Distance (km)</Label>
              <Input id="transportDistance" type="number" disabled={isLocked} value={transportDistance} onChange={(e) => setTransportDistance(e.target.value)} />
            </div>
          </section>
          <div className="space-y-1">
            <Label htmlFor="accessibility">Accessibility</Label>
            <Input id="accessibility" disabled={isLocked} value={accessibility} onChange={(e) => setAccessibility(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="transportationNotes">Transportation Notes</Label>
            <Textarea id="transportationNotes" rows={2} disabled={isLocked} value={transportationNotes} onChange={(e) => setTransportationNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Estimation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Material cost" value={inspection.materialCost != null ? `$${Number(inspection.materialCost).toFixed(2)}` : '—'} />
            <Field label="Labor cost" value={inspection.laborCost != null ? `$${Number(inspection.laborCost).toFixed(2)}` : '—'} />
            <div className="space-y-1">
              <Label>Transportation cost</Label>
              <Input type="number" disabled={isLocked} value={transportationCost} onChange={(e) => setTransportationCost(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Estimated total cost</Label>
              <Input type="number" disabled={isLocked} value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
              <p className="text-xs text-muted-foreground">Auto-calculated from material + labor + transportation unless overridden.</p>
            </div>
            <div className="space-y-1">
              <Label>Estimated duration</Label>
              <Input placeholder="e.g. 2 days" disabled={isLocked} value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!inspection.photos || inspection.photos.length === 0) && <p className="text-sm text-muted-foreground">No attachments uploaded.</p>}
          {inspection.photos && inspection.photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {inspection.photos.map((p) =>
                p.fileType === 'PHOTO' ? (
                  <a key={p.id} href={p.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.fileUrl} alt={p.caption ?? 'Inspection photo'} loading="lazy" className="h-24 w-full object-cover" />
                  </a>
                ) : (
                  <a
                    key={p.id}
                    href={p.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-24 flex-col items-center justify-center gap-1 rounded-md border border-border text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">{ATTACHMENT_TYPE_LABEL[p.fileType]}</span>
                    <span>View file</span>
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
              <Button size="sm" variant="outline" disabled={!attachmentFile || uploading} onClick={handleAttachmentUpload}>
                <Upload className="mr-1 h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            disabled={isLocked}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Engineer / inspector remarks"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" /> Registered
              </span>
              <span className="text-muted-foreground">{new Date(inspection.createdAt).toLocaleString()}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${inspection.status !== 'PENDING' ? 'bg-primary' : 'bg-muted'}`} /> Scheduled
              </span>
              <span className="text-muted-foreground">{inspection.status !== 'PENDING' ? new Date(inspection.updatedAt).toLocaleString() : '—'}</span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${inspection.status === 'IN_PROGRESS' || inspection.status === 'COMPLETED' ? 'bg-primary' : 'bg-muted'}`} /> In Progress
              </span>
              <span className="text-muted-foreground">
                {inspection.status === 'IN_PROGRESS' || inspection.status === 'COMPLETED' ? new Date(inspection.updatedAt).toLocaleString() : '—'}
              </span>
            </li>
            <li className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${inspection.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-muted'}`} /> Completed
              </span>
              <span className="text-muted-foreground">{inspection.submittedAt ? new Date(inspection.submittedAt).toLocaleString() : '—'}</span>
            </li>
            {inspection.status === 'CANCELLED' && (
              <li className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-destructive" /> Cancelled
                </span>
                <span className="text-muted-foreground">{new Date(inspection.updatedAt).toLocaleString()}</span>
              </li>
            )}
          </ol>
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
