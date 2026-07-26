'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Customer } from '@/types';

const customerFormSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  type: z.enum(['INDIVIDUAL', 'CORPORATE']),
  companyName: z.string().optional(),
  phone: z.string().min(6, 'Phone number is required'),
  alternatePhone: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  nationalId: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', '']).optional(),
  dateOfBirth: z.string().optional(),
  preferredContactMethod: z.enum(['PHONE', 'EMAIL', 'SMS', 'WHATSAPP']),
  source: z.enum(['WALK_IN', 'REFERRAL', 'WEBSITE', 'SOCIAL_MEDIA', 'ADVERTISEMENT', 'PHONE_INQUIRY', 'OTHER']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']),
  billingAddress: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

function toFormValues(customer?: Customer): CustomerFormValues {
  return {
    fullName: customer?.fullName ?? '',
    type: customer?.type ?? 'INDIVIDUAL',
    companyName: customer?.companyName ?? '',
    phone: customer?.phone ?? '',
    alternatePhone: customer?.alternatePhone ?? '',
    email: customer?.email ?? '',
    nationalId: customer?.nationalId ?? '',
    gender: (customer?.gender as CustomerFormValues['gender']) ?? '',
    dateOfBirth: customer?.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : '',
    preferredContactMethod: customer?.preferredContactMethod ?? 'PHONE',
    source: customer?.source ?? 'OTHER',
    status: customer?.status ?? 'ACTIVE',
    billingAddress: customer?.billingAddress ?? '',
  };
}

export function CustomerForm({ customerId, initial }: { customerId?: string; initial?: Parameters<typeof toFormValues>[0] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [duplicateInfo, setDuplicateInfo] = React.useState<{ existingCustomerId: string; existingCustomerName: string } | null>(null);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: toFormValues(initial),
  });

  const mutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const payload = {
        ...values,
        email: values.email || undefined,
        gender: values.gender || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
      };
      if (customerId) {
        return api.patch(`/customers/${customerId}`, payload);
      }
      const query = duplicateInfo ? '?allowDuplicate=true' : '';
      return api.post(`/customers${query}`, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-statistics'] });
      toast({ title: customerId ? 'Customer updated' : 'Customer created' });
      const id = customerId ?? (data as { id: string }).id;
      router.push(`/customers/${id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        const details = error.details as { existingCustomerId: string; existingCustomerName: string };
        setDuplicateInfo(details);
        return;
      }
      toast({ title: 'Something went wrong', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {duplicateInfo && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">A customer with this phone or email already exists: {duplicateInfo.existingCustomerName}</p>
          <p className="text-muted-foreground">Submit again to create this record anyway, or change the phone/email above.</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" {...form.register('fullName')} />
          {form.formState.errors.fullName && <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Customer type</Label>
          <Select value={form.watch('type')} onValueChange={(v) => form.setValue('type', v as CustomerFormValues['type'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
              <SelectItem value="CORPORATE">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="companyName">Company name (optional)</Label>
          <Input id="companyName" {...form.register('companyName')} />
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as CustomerFormValues['status'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...form.register('phone')} />
          {form.formState.errors.phone && <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="alternatePhone">Alternative phone (optional)</Label>
          <Input id="alternatePhone" {...form.register('alternatePhone')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" type="email" {...form.register('email')} />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Preferred contact method</Label>
          <Select value={form.watch('preferredContactMethod')} onValueChange={(v) => form.setValue('preferredContactMethod', v as CustomerFormValues['preferredContactMethod'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PHONE">Phone</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="SMS">SMS</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="nationalId">National ID / Tax ID (optional)</Label>
          <Input id="nationalId" {...form.register('nationalId')} />
        </div>
        <div className="space-y-1">
          <Label>Gender (optional)</Label>
          <Select value={form.watch('gender') || 'unset'} onValueChange={(v) => form.setValue('gender', v === 'unset' ? '' : (v as CustomerFormValues['gender']))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Prefer not to say</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="dateOfBirth">Date of birth (optional)</Label>
          <Input id="dateOfBirth" type="date" {...form.register('dateOfBirth')} />
        </div>
        <div className="space-y-1">
          <Label>Source of customer</Label>
          <Select value={form.watch('source')} onValueChange={(v) => form.setValue('source', v as CustomerFormValues['source'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WALK_IN">Walk-in</SelectItem>
              <SelectItem value="REFERRAL">Referral</SelectItem>
              <SelectItem value="WEBSITE">Website</SelectItem>
              <SelectItem value="SOCIAL_MEDIA">Social media</SelectItem>
              <SelectItem value="ADVERTISEMENT">Advertisement</SelectItem>
              <SelectItem value="PHONE_INQUIRY">Phone inquiry</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="space-y-1">
        <Label htmlFor="billingAddress">Billing address (optional)</Label>
        <Textarea id="billingAddress" rows={2} {...form.register('billingAddress')} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : customerId ? 'Save changes' : 'Create customer'}
        </Button>
      </div>
    </form>
  );
}
