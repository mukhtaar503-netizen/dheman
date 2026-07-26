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
import { EmptyState } from '@/components/empty-state';
import type { CustomerSiteAddress } from '@/types';

const EMPTY_ADDRESS = { label: '', addressLine: '', country: '', region: '', city: '', district: '', street: '', building: '', postalCode: '', landmark: '', mapLocation: '', isDefault: false };

export function CustomerAddressesTab({ customerId, addresses }: { customerId: string; addresses: CustomerSiteAddress[] }) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_ADDRESS);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customer', customerId] });

  const addMutation = useMutation({
    mutationFn: () => api.post(`/customers/${customerId}/site-addresses`, form),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm(EMPTY_ADDRESS);
      toast({ title: 'Address added' });
    },
    onError: (e) => toast({ title: 'Could not add address', description: e instanceof ApiError ? e.message : undefined, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (addressId: string) => api.del(`/customers/${customerId}/site-addresses/${addressId}`),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Address removed' });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (addressId: string) => api.patch(`/customers/${customerId}/site-addresses/${addressId}`, { isDefault: true }),
    onSuccess: () => invalidate(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add Address
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Address</DialogTitle>
            </DialogHeader>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate();
              }}
            >
              <div className="space-y-1">
                <Label>Label</Label>
                <Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="HQ, Warehouse…" />
              </div>
              <div className="space-y-1">
                <Label>Address line</Label>
                <Input required value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Region</Label>
                <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>District</Label>
                <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Street</Label>
                <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Building</Label>
                <Input value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Postal code</Label>
                <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Landmark</Label>
                <Input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Google Maps link</Label>
                <Input value={form.mapLocation} onChange={(e) => setForm({ ...form, mapLocation: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox checked={form.isDefault} onCheckedChange={(c) => setForm({ ...form, isDefault: c === true })} />
                <Label>Mark as default address</Label>
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Saving…' : 'Save address'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 && <EmptyState title="No addresses on file" />}
      <div className="grid gap-3 sm:grid-cols-2">
        {addresses.map((address) => (
          <div key={address.id} className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium">{address.label}</p>
              <div className="flex items-center gap-1">
                {address.isDefault ? (
                  <Badge>Default</Badge>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setDefaultMutation.mutate(address.id)} title="Set as default">
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(address.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{address.addressLine}</p>
            <p className="text-sm text-muted-foreground">
              {[address.street, address.district, address.city, address.region, address.country].filter(Boolean).join(', ')}
            </p>
            {address.mapLocation && (
              <a href={address.mapLocation} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                View on map
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
