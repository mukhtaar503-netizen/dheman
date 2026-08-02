'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MaterialEstimateRow, LaborEstimateRow, PaginatedResult, ServiceRequest } from '@/types';

interface InspectorOption {
  id: string;
  fullName: string;
}

export default function NewSiteInspectionPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [serviceRequestId, setServiceRequestId] = React.useState('');
  const [inspectorId, setInspectorId] = React.useState('');
  const [scheduledAt, setScheduledAt] = React.useState('');
  const [siteAddress, setSiteAddress] = React.useState('');
  const [technicalNotes, setTechnicalNotes] = React.useState('');
  const [materials, setMaterials] = React.useState<MaterialEstimateRow[]>([]);
  const [labor, setLabor] = React.useState<LaborEstimateRow[]>([]);
  const [transportationCost, setTransportationCost] = React.useState('');

  const { data: serviceRequests } = useQuery({
    queryKey: ['service-requests-picker-for-inspection'],
    queryFn: () => api.get<PaginatedResult<ServiceRequest>>('/service-requests?pageSize=100'),
  });
  const { data: inspectors } = useQuery({
    queryKey: ['inspectors-picker'],
    queryFn: () => api.get<PaginatedResult<InspectorOption>>('/users?role=SITE_INSPECTOR&pageSize=100'),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const inspection = await api.post<{ id: string }>('/inspections', {
        serviceRequestId,
        inspectorId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        siteAddress: siteAddress || undefined,
      });

      const hasFollowUpDetails = technicalNotes || materials.length || labor.length || transportationCost;
      if (hasFollowUpDetails) {
        await api.patch(`/inspections/${inspection.id}/details`, {
          technicalNotes: technicalNotes || undefined,
          materialEstimate: materials.length ? materials : undefined,
          laborEstimate: labor.length ? labor : undefined,
          transportationCost: transportationCost ? Number(transportationCost) : undefined,
        });
      }
      return inspection;
    },
    onSuccess: (data) => {
      toast({ title: 'Site Inspection scheduled' });
      router.push(`/site-inspections/${data.id}`);
    },
    onError: (error) => {
      toast({ title: 'Could not schedule inspection', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  const canSubmit = !!serviceRequestId && !!inspectorId && !!scheduledAt;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New Site Inspection</h1>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Service Request</Label>
            <Select value={serviceRequestId} onValueChange={setServiceRequestId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service request" />
              </SelectTrigger>
              <SelectContent>
                {serviceRequests?.items.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.referenceNo} — {r.customer?.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Assign Inspector</Label>
            <Select value={inspectorId} onValueChange={setInspectorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an inspector" />
              </SelectTrigger>
              <SelectContent>
                {inspectors?.items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="scheduledAt">Inspection date &amp; time</Label>
              <Input id="scheduledAt" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="siteAddress">Site address</Label>
              <Input id="siteAddress" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="e.g. Villa 12, Al Nahda" />
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technical Notes (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={3} value={technicalNotes} onChange={(e) => setTechnicalNotes(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Material Estimate (optional)</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setMaterials([...materials, { material: '', quantity: '', estimatedCost: 0 }])}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {materials.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input
                placeholder="Material"
                value={row.material}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, material: e.target.value } : r)))}
              />
              <Input
                placeholder="Quantity"
                value={row.quantity}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, quantity: e.target.value } : r)))}
              />
              <Input
                type="number"
                placeholder="Estimated cost"
                value={row.estimatedCost}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, estimatedCost: Number(e.target.value) } : r)))}
              />
              <Button variant="ghost" size="sm" onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Labor Estimate (optional)</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setLabor([...labor, { task: '', estimatedHours: 0, cost: 0 }])}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {labor.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input
                placeholder="Task"
                value={row.task}
                onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, task: e.target.value } : r)))}
              />
              <Input
                type="number"
                placeholder="Estimated hours"
                value={row.estimatedHours}
                onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, estimatedHours: Number(e.target.value) } : r)))}
              />
              <Input
                type="number"
                placeholder="Cost"
                value={row.cost}
                onChange={(e) => setLabor(labor.map((r, idx) => (idx === i ? { ...r, cost: Number(e.target.value) } : r)))}
              />
              <Button variant="ghost" size="sm" onClick={() => setLabor(labor.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transportation Cost (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input type="number" value={transportationCost} onChange={(e) => setTransportationCost(e.target.value)} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Photos can be uploaded from the inspection details page once it&apos;s scheduled.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Scheduling…' : 'Schedule Inspection'}
        </Button>
      </div>
    </div>
  );
}
