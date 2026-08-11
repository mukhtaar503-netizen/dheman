'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import type { Customer, PaginatedResult, ServiceRequest } from '@/types';

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
  const [city, setCity] = React.useState('');

  // Inspection details
  const [inspectionDate, setInspectionDate] = React.useState(todayLocalDate());
  const [inspectorId, setInspectorId] = React.useState('');

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

      const scheduledAt = new Date(`${inspectionDate}T09:00:00`).toISOString();

      // Detailed fields (measurements, materials, labor, transportation, internal notes,
      // photos/videos/documents) are added afterward from the inspection details page.
      const inspection = await api.post<{ id: string }>('/inspections', {
        serviceRequestId: targetServiceRequestId,
        inspectorId,
        scheduledAt,
        status,
        siteAddress: siteAddress || undefined,
        city: city || undefined,
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
          <div className="space-y-1">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="inspectionDate">Inspection Date</Label>
              <Input id="inspectionDate" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
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
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Measurements, materials, labor, transportation, and photos/videos/documents can be added from the inspection details page once it&apos;s registered.
      </p>

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
