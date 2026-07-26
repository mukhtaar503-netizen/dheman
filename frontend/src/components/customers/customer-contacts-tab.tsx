'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import type { CustomerContact } from '@/types';

const EMPTY_CONTACT = { name: '', position: '', phone: '', email: '', isPrimary: false };

export function CustomerContactsTab({ customerId, contacts }: { customerId: string; contacts: CustomerContact[] }) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_CONTACT);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customer', customerId] });

  const addMutation = useMutation({
    mutationFn: () => api.post(`/customers/${customerId}/contacts`, form),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm(EMPTY_CONTACT);
      toast({ title: 'Contact added' });
    },
    onError: (e) => toast({ title: 'Could not add contact', description: e instanceof ApiError ? e.message : undefined, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (contactId: string) => api.del(`/customers/${customerId}/contacts/${contactId}`),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Contact removed' });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (contactId: string) => api.patch(`/customers/${customerId}/contacts/${contactId}`, { isPrimary: true }),
    onSuccess: () => invalidate(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate();
              }}
            >
              <div className="space-y-1">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Position</Label>
                <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.isPrimary} onCheckedChange={(c) => setForm({ ...form, isPrimary: c === true })} />
                <Label>Primary contact</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Saving…' : 'Save contact'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {contacts.length === 0 && <EmptyState title="No contacts on file" />}
      {contacts.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="flex items-center gap-2">
                  {contact.name}
                  {contact.isPrimary && <Badge>Primary</Badge>}
                </TableCell>
                <TableCell>{contact.position ?? '—'}</TableCell>
                <TableCell>{contact.phone ?? '—'}</TableCell>
                <TableCell>{contact.email ?? '—'}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  {!contact.isPrimary && (
                    <Button variant="ghost" size="sm" onClick={() => setPrimaryMutation.mutate(contact.id)} title="Make primary">
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(contact.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
