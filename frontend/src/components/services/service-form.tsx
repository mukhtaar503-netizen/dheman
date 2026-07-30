'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Service } from '@/types';

const serviceFormSchema = z.object({
  serviceName: z.string().min(2, 'Service name must be at least 2 characters'),
  category: z.enum(['FURNITURE', 'ALUMINUM', 'CCTV', 'PVC']),
  description: z.string().optional(),
  durationMinutes: z.string().optional(),
  estimatedCost: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

function toFormValues(service?: Service): ServiceFormValues {
  return {
    serviceName: service?.serviceName ?? '',
    category: service?.category ?? 'FURNITURE',
    description: service?.description ?? '',
    durationMinutes: service?.durationMinutes ? String(service.durationMinutes) : '',
    estimatedCost: service?.estimatedCost !== undefined && service?.estimatedCost !== null ? String(service.estimatedCost) : '',
    status: service?.status ?? 'ACTIVE',
  };
}

export function ServiceForm({ serviceId, initial }: { serviceId?: string; initial?: Service }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [materials, setMaterials] = React.useState<string[]>(initial?.requiredMaterials ?? []);
  const [materialInput, setMaterialInput] = React.useState('');

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: toFormValues(initial),
  });

  function addMaterial() {
    const value = materialInput.trim();
    if (value && !materials.includes(value)) {
      setMaterials([...materials, value]);
    }
    setMaterialInput('');
  }

  function removeMaterial(value: string) {
    setMaterials(materials.filter((m) => m !== value));
  }

  const mutation = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      const payload = {
        serviceName: values.serviceName,
        category: values.category,
        description: values.description || undefined,
        durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : undefined,
        estimatedCost: values.estimatedCost ? Number(values.estimatedCost) : undefined,
        requiredMaterials: materials,
        status: values.status,
      };
      if (serviceId) return api.patch(`/services/${serviceId}`, payload);
      return api.post('/services', payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service-statistics'] });
      toast({ title: serviceId ? 'Service updated' : 'Service created' });
      const id = serviceId ?? (data as { id: string }).id;
      router.push(`/services/${id}`);
    },
    onError: (error) => {
      toast({
        title: 'Something went wrong',
        description: error instanceof ApiError ? error.message : undefined,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="serviceName">Service name</Label>
          <Input id="serviceName" {...form.register('serviceName')} />
          {form.formState.errors.serviceName && <p className="text-xs text-destructive">{form.formState.errors.serviceName.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={form.watch('category')} onValueChange={(v) => form.setValue('category', v as ServiceFormValues['category'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FURNITURE">Furniture Installation</SelectItem>
              <SelectItem value="ALUMINUM">Aluminum Installation</SelectItem>
              <SelectItem value="CCTV">CCTV Installation</SelectItem>
              <SelectItem value="PVC">PVC Installation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...form.register('description')} />
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input id="durationMinutes" type="number" min="1" {...form.register('durationMinutes')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="estimatedCost">Estimated cost</Label>
          <Input id="estimatedCost" type="number" min="0" step="0.01" {...form.register('estimatedCost')} />
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as ServiceFormValues['status'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="space-y-2">
        <Label>Required materials</Label>
        <div className="flex gap-2">
          <Input
            value={materialInput}
            onChange={(e) => setMaterialInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMaterial();
              }
            }}
            placeholder="e.g. MDF board"
          />
          <Button type="button" variant="outline" onClick={addMaterial}>
            Add
          </Button>
        </div>
        {materials.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {materials.map((m) => (
              <Badge key={m} variant="secondary" className="gap-1 pr-1">
                {m}
                <button type="button" onClick={() => removeMaterial(m)} className="rounded-full hover:bg-muted-foreground/20">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : serviceId ? 'Save changes' : 'Create service'}
        </Button>
      </div>
    </form>
  );
}
