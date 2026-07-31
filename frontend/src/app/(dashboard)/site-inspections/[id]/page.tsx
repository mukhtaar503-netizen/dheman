'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Upload } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { InspectionMeasurement, InspectionStatus, LaborEstimateRow, MaterialEstimateRow, SiteInspection } from '@/types';

const STATUS_VARIANT: Record<InspectionStatus, 'secondary' | 'default' | 'success' | 'destructive'> = {
  SCHEDULED: 'secondary',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: inspection, isLoading } = useQuery({
    queryKey: ['site-inspection', id],
    queryFn: () => api.get<InspectionDetail>(`/inspections/${id}`),
  });

  const [technicalNotes, setTechnicalNotes] = React.useState('');
  const [estimatedCost, setEstimatedCost] = React.useState('');
  const [estimatedDuration, setEstimatedDuration] = React.useState('');
  const [measurements, setMeasurements] = React.useState<Partial<InspectionMeasurement>[]>([]);
  const [materials, setMaterials] = React.useState<MaterialEstimateRow[]>([]);
  const [labor, setLabor] = React.useState<LaborEstimateRow[]>([]);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    if (!inspection) return;
    setTechnicalNotes(inspection.technicalNotes ?? '');
    setEstimatedCost(inspection.estimatedCost != null ? String(inspection.estimatedCost) : '');
    setEstimatedDuration(inspection.estimatedDuration ?? '');
    setMeasurements(inspection.measurements ?? []);
    setMaterials(inspection.materialEstimate ?? []);
    setLabor(inspection.laborEstimate ?? []);
  }, [inspection]);

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
      measurements: measurements
        .filter((m) => m.label)
        .map((m) => ({
          label: m.label!,
          length: m.length != null ? Number(m.length) : undefined,
          width: m.width != null ? Number(m.width) : undefined,
          height: m.height != null ? Number(m.height) : undefined,
          unit: m.unit || undefined,
          area: m.area != null ? Number(m.area) : undefined,
        })),
      materialEstimate: materials.filter((m) => m.material),
      laborEstimate: labor.filter((l) => l.task),
      estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      estimatedDuration: estimatedDuration || undefined,
    };
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

  async function handlePhotoUpload() {
    if (!photoFile) return;
    setUploading(true);
    try {
      const { signedUrl, publicUrl } = await api.post<{ signedUrl: string; publicUrl: string }>(`/inspections/${id}/photos/upload-url`, {
        fileName: photoFile.name,
        mimeType: photoFile.type,
      });
      await fetch(signedUrl, { method: 'PUT', body: photoFile }).catch(() => {});
      await api.post(`/inspections/${id}/photos`, { fileUrl: publicUrl });
      toast({ title: 'Photo uploaded' });
      setPhotoFile(null);
      invalidate();
    } catch (error) {
      toast({ title: 'Photo upload failed', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
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
            <h1 className="text-2xl font-semibold">{inspection.serviceRequest?.referenceNo ?? 'Inspection'}</h1>
            <Badge variant={STATUS_VARIANT[inspection.status]}>{inspection.status.replaceAll('_', ' ')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{inspection.serviceRequest?.customer?.fullName}</p>
        </div>
        {!isLocked && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? 'Saving…' : 'Save Details'}
            </Button>
            <Button size="sm" disabled={completeMutation.isPending} onClick={() => completeMutation.mutate()}>
              {completeMutation.isPending ? 'Completing…' : 'Complete Inspection'}
            </Button>
          </div>
        )}
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
          <CardTitle>Technical Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={3} disabled={isLocked} value={technicalNotes} onChange={(e) => setTechnicalNotes(e.target.value)} />
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
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-6">
              <Input
                placeholder="Label"
                disabled={isLocked}
                value={m.label ?? ''}
                onChange={(e) => setMeasurements(measurements.map((row, idx) => (idx === i ? { ...row, label: e.target.value } : row)))}
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
                placeholder="Area"
                disabled={isLocked}
                value={m.area ?? ''}
                onChange={(e) => setMeasurements(measurements.map((row, idx) => (idx === i ? { ...row, area: Number(e.target.value) } : row)))}
              />
              {!isLocked && (
                <Button variant="ghost" size="sm" onClick={() => setMeasurements(measurements.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Material Estimation</CardTitle>
          {!isLocked && (
            <Button size="sm" variant="outline" onClick={() => setMaterials([...materials, { material: '', quantity: '', estimatedCost: 0 }])}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {materials.length === 0 && <p className="text-sm text-muted-foreground">No materials estimated.</p>}
          {materials.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input
                placeholder="Material"
                disabled={isLocked}
                value={row.material}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, material: e.target.value } : r)))}
              />
              <Input
                placeholder="Quantity"
                disabled={isLocked}
                value={row.quantity}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, quantity: e.target.value } : r)))}
              />
              <Input
                type="number"
                placeholder="Estimated cost"
                disabled={isLocked}
                value={row.estimatedCost}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, estimatedCost: Number(e.target.value) } : r)))}
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
          <CardTitle>Overall Estimate</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Estimated cost</Label>
            <Input type="number" disabled={isLocked} value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Estimated duration</Label>
            <Input placeholder="e.g. 2 days" disabled={isLocked} value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!inspection.photos || inspection.photos.length === 0) && <p className="text-sm text-muted-foreground">No photos uploaded.</p>}
          {inspection.photos && inspection.photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {inspection.photos.map((p) => (
                <a key={p.id} href={p.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.fileUrl} alt={p.caption ?? 'Inspection photo'} className="h-24 w-full object-cover" />
                </a>
              ))}
            </div>
          )}
          {!isLocked && (
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" className="h-8 max-w-xs text-xs" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
              <Button size="sm" variant="outline" disabled={!photoFile || uploading} onClick={handlePhotoUpload}>
                <Upload className="mr-1 h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
