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
import type { Employee, Role } from '@/types';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'SITE_INSPECTOR', label: 'Site Inspector' },
  { value: 'TECHNICIAN', label: 'Technician' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
];

const employeeFormSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().optional(),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  address: z.string().optional(),
  hireDate: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'SUPERVISOR', 'SITE_INSPECTOR', 'TECHNICIAN', 'ACCOUNTANT']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

function toFormValues(employee?: Employee): EmployeeFormValues {
  return {
    fullName: employee?.fullName ?? '',
    email: employee?.email ?? '',
    password: '',
    phone: employee?.phone ?? '',
    employeeId: employee?.employeeId ?? '',
    department: employee?.department ?? '',
    jobTitle: employee?.jobTitle ?? '',
    address: employee?.address ?? '',
    hireDate: employee?.hireDate ? employee.hireDate.slice(0, 10) : '',
    role: (employee?.role as EmployeeFormValues['role']) ?? 'TECHNICIAN',
    status: employee?.status ?? 'ACTIVE',
  };
}

export function EmployeeForm({ employeeId, initial }: { employeeId?: string; initial?: Employee }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: toFormValues(initial),
  });

  const mutation = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      const payload = {
        ...values,
        email: values.email,
        phone: values.phone || undefined,
        employeeId: values.employeeId || undefined,
        department: values.department || undefined,
        jobTitle: values.jobTitle || undefined,
        address: values.address || undefined,
        hireDate: values.hireDate || undefined,
      };
      if (employeeId) {
        const { password: _password, ...updatePayload } = payload;
        return api.patch(`/users/${employeeId}`, updatePayload);
      }
      if (!values.password) throw new ApiError(400, 'Password is required to create an employee');
      return api.post('/users', payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-statistics'] });
      toast({ title: employeeId ? 'Employee updated' : 'Employee created' });
      const id = employeeId ?? (data as { id: string }).id;
      router.push(`/employees/${id}`);
    },
    onError: (error) => {
      toast({ title: 'Something went wrong', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" {...form.register('fullName')} />
          {form.formState.errors.fullName && <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="employeeId">Employee ID (optional)</Label>
          <Input id="employeeId" {...form.register('employeeId')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register('email')} />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" {...form.register('phone')} />
        </div>
        {!employeeId && (
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register('password')} />
            <p className="text-xs text-muted-foreground">At least 8 characters, with an uppercase letter, a number, and a symbol.</p>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="jobTitle">Job title / position (optional)</Label>
          <Input id="jobTitle" {...form.register('jobTitle')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="department">Department (optional)</Label>
          <Input id="department" {...form.register('department')} />
        </div>
        <div className="space-y-1">
          <Label>Role</Label>
          <Select value={form.watch('role')} onValueChange={(v) => form.setValue('role', v as EmployeeFormValues['role'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Employment status</Label>
          <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as EmployeeFormValues['status'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="ON_LEAVE">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="hireDate">Hire date (optional)</Label>
          <Input id="hireDate" type="date" {...form.register('hireDate')} />
        </div>
      </section>

      <div className="space-y-1">
        <Label htmlFor="address">Address (optional)</Label>
        <Textarea id="address" rows={2} {...form.register('address')} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : employeeId ? 'Save changes' : 'Create employee'}
        </Button>
      </div>
    </form>
  );
}
