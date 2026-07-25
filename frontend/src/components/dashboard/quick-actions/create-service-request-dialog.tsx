'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Customer, PaginatedResult } from '@/types';

interface ServiceCategory {
  id: string;
  name: string;
}

export function CreateServiceRequestDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [customerId, setCustomerId] = React.useState('');
  const [serviceCategoryId, setServiceCategoryId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ['customers-picker'],
    queryFn: () => api.get<PaginatedResult<Customer>>('/customers?page=1&pageSize=100'),
    enabled: open,
  });
  const { data: categories } = useQuery({
    queryKey: ['service-categories-picker'],
    queryFn: () => api.get<ServiceCategory[]>('/service-categories'),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/service-requests', { customerId, serviceCategoryId, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setCustomerId('');
      setServiceCategoryId('');
      setDescription('');
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Service Request</DialogTitle>
          <DialogDescription>Log a new service request on behalf of a customer (FR-SR-02).</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId} required>
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
          <div className="space-y-1">
            <Label>Service category</Label>
            <Select value={serviceCategoryId} onValueChange={setServiceCategoryId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
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
            <Label htmlFor="sr-description">Description</Label>
            <textarea
              id="sr-description"
              required
              className="flex min-h-16 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive">{mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong'}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !customerId || !serviceCategoryId}>
              {mutation.isPending ? 'Creating…' : 'Create Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
