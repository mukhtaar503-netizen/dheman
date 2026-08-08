'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Customer, MaterialEstimateRow, PaginatedResult, ServiceRequest } from '@/types';

interface ServiceCategory {
  id: string;
  name: string;
}
interface Service {
  id: string;
  serviceName: string;
}
interface InspectorOption {
  id: string;
  fullName: string;
}
interface MeasurementRow {
  label: string;
  length: string;
  width: string;
  height: string;
  unit: string;
  quantity: string;
  notes: string;
}

const todayLocalDate = () => new Date().toISOString().slice(0, 10);

export default function NewSiteInspectionPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Customer
  const [customerId, setCustomerId] = React.useState('');
  const [customerSearch, setCustomerSearch] = React.useState('');

  // Project (existing Service Request, or create a new one inline)
  const [projectMode, setProjectMode] = React.useState<'existing' | 'new'>('existing');
  const [serviceRequestId, setServiceRequestId] = React.useState('');
  const [projectName, setProjectName] = React.useState('');
  const [serviceCategoryId, setServiceCategoryId] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [projectType, setProjectType] = React.useState('');
  const [projectLocation, setProjectLocation] = React.useState('');
  const [expectedStartDate, setExpectedStartDate] = React.useState('');
  const [expectedCompletionDate, setExpectedCompletionDate] = React.useState('');
  const [projectDescription, setProjectDescription] = React.useState('');

  // Site information
  const [siteAddress, setSiteAddress] = React.useState('');
  const [landmark, setLandmark] = React.useState('');
  const [city, setCity] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [longitude, setLongitude] = React.useState('');

  // Inspection details
  const [inspectionDate, setInspectionDate] = React.useState(todayLocalDate());
  const [inspectionTime, setInspectionTime] = React.useState('09:00');
  const [inspectorId, setInspectorId] = React.useState('');
  const [inspectionPurpose, setInspectionPurpose] = React.useState('');
  const [customerRequirements, setCustomerRequirements] = React.useState('');
  const [existingSiteCondition, setExistingSiteCondition] = React.useState('');
  const [technicalNotes, setTechnicalNotes] = React.useState('');

  // Measurements
  const [measurements, setMeasurements] = React.useState<MeasurementRow[]>([]);

  // Materials assessment
  const [materials, setMaterials] = React.useState<MaterialEstimateRow[]>([]);

  // Labor assessment
  const [estimatedWorkers, setEstimatedWorkers] = React.useState('');
  const [estimatedWorkingDays, setEstimatedWorkingDays] = React.useState('');
  const [specialSkillsRequired, setSpecialSkillsRequired] = React.useState('');

  // Transportation
  const [vehicleRequired, setVehicleRequired] = React.useState('');
  const [transportDistance, setTransportDistance] = React.useState('');
  const [accessibility, setAccessibility] = React.useState('');
  const [transportationNotes, setTransportationNotes] = React.useState('');

  // Internal notes
  const [internalNotes, setInternalNotes] = React.useState('');

  const debouncedCustomerSearch = useDebouncedValue(customerSearch);
  const { data: customers } = useQuery({
    queryKey: ['customers-picker', debouncedCustomerSearch],
    queryFn: () =>
      api.get<PaginatedResult<Customer>>(`/customers?page=1&pageSize=50${debouncedCustomerSearch ? `&search=${encodeURIComponent(debouncedCustomerSearch)}` : ''}`),
  });
  const selectedCustomer = customers?.items.find((c) => c.id === customerId);

  const { data: customerRequests } = useQuery({
    queryKey: ['service-requests-for-customer', customerId],
    queryFn: () => api.get<PaginatedResult<ServiceRequest>>(`/service-requests?customerId=${customerId}&pageSize=100`),
    enabled: !!customerId && projectMode === 'existing',
  });
  const { data: categories } = useQuery({
    queryKey: ['service-categories-picker'],
    queryFn: () => api.get<ServiceCategory[]>('/service-categories'),
    enabled: projectMode === 'new',
  });
  const { data: services } = useQuery({
    queryKey: ['services-picker'],
    queryFn: () => api.get<PaginatedResult<Service>>('/services?status=ACTIVE&pageSize=100'),
    enabled: projectMode === 'new',
  });
  const { data: inspectors } = useQuery({
    queryKey: ['inspectors-picker'],
    queryFn: () => api.get<PaginatedResult<InspectorOption>>('/users?role=SITE_INSPECTOR&pageSize=100'),
  });

  const mutation = useMutation({
    mutationFn: async (status: 'PENDING' | 'SCHEDULED') => {
      let targetServiceRequestId = serviceRequestId;
      if (projectMode === 'new') {
        const created = await api.post<{ id: string }>('/service-requests', {
          customerId,
          serviceCategoryId,
          serviceId: serviceId || undefined,
          title: projectName || undefined,
          description: projectDescription || `Site inspection registration for ${projectName || 'new project'}`,
          projectLocation: projectLocation || undefined,
          projectType: projectType || undefined,
          expectedStartDate: expectedStartDate ? new Date(expectedStartDate).toISOString() : undefined,
          expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate).toISOString() : undefined,
        });
        targetServiceRequestId = created.id;
      }

      const scheduledAt = new Date(`${inspectionDate}T${inspectionTime || '09:00'}:00`).toISOString();

      // Measurements/materials/technical notes are sent directly on create (not via the
      // on-site /details endpoint, which only accepts SCHEDULED/IN_PROGRESS inspections and
      // would reject a PENDING draft) so nothing typed here is lost when saving as a draft.
      const inspection = await api.post<{ id: string }>('/inspections', {
        serviceRequestId: targetServiceRequestId,
        inspectorId,
        scheduledAt,
        status,
        siteAddress: siteAddress || undefined,
        landmark: landmark || undefined,
        city: city || undefined,
        region: region || undefined,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        inspectionPurpose: inspectionPurpose || undefined,
        customerRequirements: customerRequirements || undefined,
        existingSiteCondition: existingSiteCondition || undefined,
        technicalNotes: technicalNotes || undefined,
        internalNotes: internalNotes || undefined,
        estimatedWorkers: estimatedWorkers ? Number(estimatedWorkers) : undefined,
        estimatedWorkingDays: estimatedWorkingDays ? Number(estimatedWorkingDays) : undefined,
        specialSkillsRequired: specialSkillsRequired || undefined,
        vehicleRequired: vehicleRequired || undefined,
        transportDistance: transportDistance ? Number(transportDistance) : undefined,
        accessibility: accessibility || undefined,
        transportationNotes: transportationNotes || undefined,
        measurements: measurements.length
          ? measurements
              .filter((m) => m.label)
              .map((m) => ({
                label: m.label,
                length: m.length ? Number(m.length) : undefined,
                width: m.width ? Number(m.width) : undefined,
                height: m.height ? Number(m.height) : undefined,
                unit: m.unit || undefined,
                quantity: m.quantity ? Number(m.quantity) : undefined,
                notes: m.notes || undefined,
              }))
          : undefined,
        materialEstimate: materials.length ? materials.filter((m) => m.material) : undefined,
      });
      return inspection;
    },
    onSuccess: (data, status) => {
      toast({ title: status === 'PENDING' ? 'Saved as draft' : 'Site Inspection registered' });
      router.push(`/site-inspections/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Could not save the inspection',
        description: error instanceof ApiError ? error.message : undefined,
        variant: 'destructive',
      });
    },
  });

  const hasProject = projectMode === 'existing' ? !!serviceRequestId : !!projectName && !!serviceCategoryId;
  const canSaveDraft = !!customerId && hasProject && !!inspectorId;
  const canSubmit = canSaveDraft && !!siteAddress;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Register Site Inspection</h1>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Customer</Label>
            <Select
              value={customerId}
              onValueChange={(v) => {
                setCustomerId(v);
                setServiceRequestId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an existing customer" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Search customers…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {customers?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName}
                    {c.companyName ? ` — ${c.companyName}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedCustomer && (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p>{selectedCustomer.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p>{selectedCustomer.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p>{selectedCustomer.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p>{selectedCustomer.billingAddress || '—'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={projectMode} onValueChange={(v) => setProjectMode(v as 'existing' | 'new')}>
            <TabsList>
              <TabsTrigger value="existing" disabled={!customerId}>
                Select Existing Project
              </TabsTrigger>
              <TabsTrigger value="new" disabled={!customerId}>
                Create New Project
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {!customerId && <p className="text-xs text-muted-foreground">Select a customer first.</p>}

          {customerId && projectMode === 'existing' && (
            <div className="space-y-1">
              <Label>Project (Service Request)</Label>
              <Select value={serviceRequestId} onValueChange={setServiceRequestId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {(customerRequests?.items ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.referenceNo} — {r.title || r.serviceCategory?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customerRequests && customerRequests.items.length === 0 && (
                <p className="text-xs text-muted-foreground">This customer has no existing projects yet — switch to &quot;Create New Project&quot;.</p>
              )}
            </div>
          )}

          {customerId && projectMode === 'new' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="projectName">Project Name</Label>
                <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Villa Renovation" />
              </div>
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Service Category</Label>
                  <Select value={serviceCategoryId} onValueChange={setServiceCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Specific Service (optional)</Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services?.items.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.serviceName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="projectType">Project Type</Label>
                  <Input id="projectType" value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="e.g. New Installation" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="projectLocation">Project Location</Label>
                  <Input id="projectLocation" value={projectLocation} onChange={(e) => setProjectLocation(e.target.value)} />
                </div>
              </section>
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="expectedStartDate">Expected Start Date</Label>
                  <Input id="expectedStartDate" type="date" value={expectedStartDate} onChange={(e) => setExpectedStartDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="expectedCompletionDate">Expected Completion Date</Label>
                  <Input id="expectedCompletionDate" type="date" value={expectedCompletionDate} onChange={(e) => setExpectedCompletionDate(e.target.value)} />
                </div>
              </section>
              <div className="space-y-1">
                <Label htmlFor="projectDescription">Description (optional)</Label>
                <Textarea id="projectDescription" rows={2} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="siteAddress">Site Address</Label>
            <Input id="siteAddress" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="e.g. Villa 12, Al Nahda" />
          </div>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="landmark">Landmark</Label>
              <Input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="region">Region</Label>
              <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} />
            </div>
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="latitude">GPS Latitude (optional)</Label>
              <Input id="latitude" type="number" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="longitude">GPS Longitude (optional)</Label>
              <Input id="longitude" type="number" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
            </div>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="inspectionDate">Inspection Date</Label>
              <Input id="inspectionDate" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inspectionTime">Inspection Time</Label>
              <Input id="inspectionTime" type="time" value={inspectionTime} onChange={(e) => setInspectionTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Assigned Inspector</Label>
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
          </section>
          <div className="space-y-1">
            <Label htmlFor="inspectionPurpose">Inspection Purpose</Label>
            <Textarea id="inspectionPurpose" rows={2} value={inspectionPurpose} onChange={(e) => setInspectionPurpose(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="customerRequirements">Customer Requirements</Label>
            <Textarea id="customerRequirements" rows={2} value={customerRequirements} onChange={(e) => setCustomerRequirements(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="existingSiteCondition">Existing Site Condition</Label>
            <Textarea id="existingSiteCondition" rows={2} value={existingSiteCondition} onChange={(e) => setExistingSiteCondition(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="technicalNotes">Technical Notes</Label>
            <Textarea id="technicalNotes" rows={2} value={technicalNotes} onChange={(e) => setTechnicalNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Measurements</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMeasurements([...measurements, { label: '', length: '', width: '', height: '', unit: 'ft', quantity: '1', notes: '' }])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Row
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {measurements.length === 0 && <p className="text-sm text-muted-foreground">No measurements added yet.</p>}
          {measurements.map((m, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-8">
              <Input
                className="sm:col-span-2"
                placeholder="Area/Room"
                value={m.label}
                onChange={(e) => setMeasurements(measurements.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)))}
              />
              <Input
                type="number"
                placeholder="Length"
                value={m.length}
                onChange={(e) => setMeasurements(measurements.map((r, idx) => (idx === i ? { ...r, length: e.target.value } : r)))}
              />
              <Input
                type="number"
                placeholder="Width"
                value={m.width}
                onChange={(e) => setMeasurements(measurements.map((r, idx) => (idx === i ? { ...r, width: e.target.value } : r)))}
              />
              <Input
                type="number"
                placeholder="Height"
                value={m.height}
                onChange={(e) => setMeasurements(measurements.map((r, idx) => (idx === i ? { ...r, height: e.target.value } : r)))}
              />
              <Select value={m.unit} onValueChange={(v) => setMeasurements(measurements.map((r, idx) => (idx === i ? { ...r, unit: v } : r)))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ft">Feet</SelectItem>
                  <SelectItem value="m">Meter</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Qty"
                value={m.quantity}
                onChange={(e) => setMeasurements(measurements.map((r, idx) => (idx === i ? { ...r, quantity: e.target.value } : r)))}
              />
              <div className="flex gap-1">
                <Input
                  placeholder="Notes"
                  value={m.notes}
                  onChange={(e) => setMeasurements(measurements.map((r, idx) => (idx === i ? { ...r, notes: e.target.value } : r)))}
                />
                <Button variant="ghost" size="sm" onClick={() => setMeasurements(measurements.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Materials Assessment</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setMaterials([...materials, { material: '', quantity: '', unit: '', remarks: '' }])}>
            <Plus className="mr-1 h-4 w-4" /> Add Material
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {materials.length === 0 && <p className="text-sm text-muted-foreground">No materials added yet.</p>}
          {materials.map((m, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Input
                placeholder="Material Name"
                value={m.material}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, material: e.target.value } : r)))}
              />
              <Input
                placeholder="Unit"
                value={m.unit ?? ''}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, unit: e.target.value } : r)))}
              />
              <Input
                placeholder="Estimated Quantity"
                value={m.quantity}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, quantity: e.target.value } : r)))}
              />
              <Input
                placeholder="Remarks"
                value={m.remarks ?? ''}
                onChange={(e) => setMaterials(materials.map((r, idx) => (idx === i ? { ...r, remarks: e.target.value } : r)))}
              />
              <Button variant="ghost" size="sm" onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
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
            <Input id="estimatedWorkers" type="number" value={estimatedWorkers} onChange={(e) => setEstimatedWorkers(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="estimatedWorkingDays">Estimated Working Days</Label>
            <Input id="estimatedWorkingDays" type="number" value={estimatedWorkingDays} onChange={(e) => setEstimatedWorkingDays(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="specialSkillsRequired">Special Skills Required</Label>
            <Input id="specialSkillsRequired" value={specialSkillsRequired} onChange={(e) => setSpecialSkillsRequired(e.target.value)} />
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
              <Input id="vehicleRequired" value={vehicleRequired} onChange={(e) => setVehicleRequired(e.target.value)} placeholder="e.g. Pickup truck" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="transportDistance">Distance (km)</Label>
              <Input id="transportDistance" type="number" value={transportDistance} onChange={(e) => setTransportDistance(e.target.value)} />
            </div>
          </section>
          <div className="space-y-1">
            <Label htmlFor="accessibility">Accessibility</Label>
            <Input id="accessibility" value={accessibility} onChange={(e) => setAccessibility(e.target.value)} placeholder="e.g. Narrow street, no elevator" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="transportationNotes">Transportation Notes</Label>
            <Textarea id="transportationNotes" rows={2} value={transportationNotes} onChange={(e) => setTransportationNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={4} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Engineer / inspector remarks" />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Photos, videos, drawings, and documents can be attached from the inspection details page once it&apos;s registered.</p>

      <div className="flex flex-col items-end gap-2 pb-8">
        {!canSubmit && (
          <p className="text-xs text-muted-foreground">
            {[
              !customerId && 'select a customer',
              !hasProject && 'select or create a project',
              !inspectorId && 'assign an inspector',
              canSaveDraft && !siteAddress && 'enter a site address to submit (or save as draft)',
            ]
              .filter(Boolean)
              .join(', ')
              .replace(/^./, (c) => c.toUpperCase())}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="button" variant="outline" disabled={!canSaveDraft || mutation.isPending} onClick={() => mutation.mutate('PENDING')}>
            {mutation.isPending && mutation.variables === 'PENDING' ? 'Saving…' : 'Save Draft'}
          </Button>
          <Button type="button" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate('SCHEDULED')}>
            {mutation.isPending && mutation.variables === 'SCHEDULED' ? 'Submitting…' : 'Submit Inspection'}
          </Button>
        </div>
      </div>
    </div>
  );
}
