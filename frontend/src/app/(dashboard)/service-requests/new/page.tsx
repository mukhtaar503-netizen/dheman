'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Customer, PaginatedResult, Service } from '@/types';

interface ServiceCategory {
  id: string;
  name: string;
}

export default function NewServiceRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = React.useState('');
  const [serviceCategoryId, setServiceCategoryId] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [projectLocation, setProjectLocation] = React.useState('');
  const [preferredDate, setPreferredDate] = React.useState('');
  const [priority, setPriority] = React.useState('MEDIUM');

  const { data: customers } = useQuery({
    queryKey: ['customers-picker'],
    queryFn: () => api.get<PaginatedResult<Customer>>('/customers?page=1&pageSize=100'),
    enabled: !isCustomer,
  });
  const { data: categories } = useQuery({
    queryKey: ['service-categories-picker'],
    queryFn: () => api.get<ServiceCategory[]>('/service-categories'),
  });
  const { data: services } = useQuery({
    queryKey: ['services-picker'],
    queryFn: () => api.get<PaginatedResult<Service>>('/services?status=ACTIVE&pageSize=100'),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...(isCustomer ? {} : { customerId }),
        serviceCategoryId,
        serviceId: serviceId || undefined,
        title: title || undefined,
        description,
        projectLocation: projectLocation || undefined,
        preferredDate: preferredDate ? new Date(preferredDate).toISOString() : undefined,
        priority,
      };
      return isCustomer ? api.post('/service-requests/me', payload) : api.post('/service-requests', payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['service-request-statistics'] });
      toast({ title: 'Service Request created' });
      const id = (data as { id: string }).id;
      router.push(isCustomer ? '/service-requests' : `/service-requests/${id}`);
    },
    onError: (error) => {
      toast({
        title: 'Something went wrong',
        description: error instanceof ApiError ? error.message : undefined,
        variant: 'destructive',
      });
    },
  });

  const canSubmit = (isCustomer || !!customerId) && !!serviceCategoryId && description.trim().length >= 5;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New Service Request</h1>
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            {!isCustomer && (
              <div className="space-y-1">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.items.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Service category</Label>
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
                <Label>Specific service (optional)</Label>
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

            <div className="space-y-1">
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CCTV install at villa" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="projectLocation">Project location</Label>
                <Input
                  id="projectLocation"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  placeholder="e.g. Villa 12, Al Nahda"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="preferredDate">Preferred schedule</Label>
                <Input id="preferredDate" type="datetime-local" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
              </div>
            </section>

            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || mutation.isPending}>
                {mutation.isPending ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
