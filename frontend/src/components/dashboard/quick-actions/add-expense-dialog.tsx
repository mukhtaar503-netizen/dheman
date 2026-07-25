'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PaginatedResult } from '@/types';

interface ProjectOption {
  id: string;
  projectNo: string;
}

const CATEGORIES = ['MATERIAL', 'LABOR', 'TRANSPORT', 'EQUIPMENT_RENTAL', 'OTHER'];

export function AddExpenseDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState('MATERIAL');
  const [projectId, setProjectId] = React.useState<string>('');
  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = React.useState('');
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['projects-picker'],
    queryFn: () => api.get<PaginatedResult<ProjectOption>>('/projects?page=1&pageSize=100'),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/expenses', {
        category,
        projectId: projectId || undefined,
        amount: Number(amount),
        date: new Date(date).toISOString(),
        description: description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-expenses'] });
      setAmount('');
      setDescription('');
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Submit a project or general expense for approval (FR-EXP-01).</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replaceAll('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="General / not project-linked" />
              </SelectTrigger>
              <SelectContent>
                {projects?.items.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.projectNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="exp-amount">Amount</Label>
              <Input id="exp-amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="exp-date">Date</Label>
              <Input id="exp-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="exp-description">Description (optional)</Label>
            <Input id="exp-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive">{mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong'}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !amount}>
              {mutation.isPending ? 'Submitting…' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
