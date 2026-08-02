'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CompletedInspectionOption, QuotationItemCategory, QuotationPrefill } from '@/types';

interface DraftLineItem {
  category: QuotationItemCategory;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

const CATEGORY_SECTIONS: { category: QuotationItemCategory; label: string; unitPlaceholder: string }[] = [
  { category: 'MATERIAL', label: 'Material Items', unitPlaceholder: 'e.g. meters' },
  { category: 'LABOR', label: 'Labor Items', unitPlaceholder: 'e.g. hours' },
  { category: 'TRANSPORTATION', label: 'Transportation Items', unitPlaceholder: 'e.g. trips' },
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const currency = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

export default function NewQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [siteInspectionId, setSiteInspectionId] = React.useState('');
  const [serviceRequestId, setServiceRequestId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [lineItems, setLineItems] = React.useState<DraftLineItem[]>([]);
  const [discountType, setDiscountType] = React.useState<'NONE' | 'PERCENTAGE' | 'FIXED'>('NONE');
  const [discountValue, setDiscountValue] = React.useState('');
  const [discountReason, setDiscountReason] = React.useState('');
  const [vatPercentage, setVatPercentage] = React.useState('');
  const [validityDays, setValidityDays] = React.useState('');
  const [termsAndConditions, setTermsAndConditions] = React.useState(
    'Payment due within the validity period stated above. Prices are subject to change after expiry.',
  );

  const { data: completedInspections } = useQuery({
    queryKey: ['completed-inspections-picker'],
    queryFn: () => api.get<CompletedInspectionOption[]>('/inspections/completed'),
  });

  const { data: settings } = useQuery({ queryKey: ['company-settings'], queryFn: () => api.get<{ taxRatePercent: string | number }>('/settings') });

  React.useEffect(() => {
    if (settings && !vatPercentage) setVatPercentage(String(settings.taxRatePercent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const prefillMutation = useMutation({
    mutationFn: (inspectionId: string) => api.get<QuotationPrefill>(`/quotations/prefill/${inspectionId}`),
    onSuccess: (data) => {
      setServiceRequestId(data.serviceRequest.id);
      setLineItems(data.suggestedLineItems.map((i) => ({ ...i })));
      toast({ title: 'Loaded customer, service, and cost estimate from the inspection' });
    },
    onError: (error) => {
      toast({ title: 'Could not load inspection', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  function handleSelectInspection(id: string) {
    setSiteInspectionId(id);
    prefillMutation.mutate(id);
  }

  React.useEffect(() => {
    const preselect = searchParams.get('siteInspectionId');
    if (preselect && !siteInspectionId) handleSelectInspection(preselect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function addItem(category: QuotationItemCategory) {
    setLineItems([...lineItems, { category, itemName: '', description: '', quantity: 1, unit: '', unitPrice: 0 }]);
  }
  function updateItem(index: number, patch: Partial<DraftLineItem>) {
    setLineItems(lineItems.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  function removeItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  const materialCost = round2(lineItems.filter((i) => i.category === 'MATERIAL').reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const laborCost = round2(lineItems.filter((i) => i.category === 'LABOR').reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const transportationCost = round2(lineItems.filter((i) => i.category === 'TRANSPORTATION').reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const subtotal = round2(materialCost + laborCost + transportationCost);
  const discountAmount = round2(
    discountType === 'NONE' || !discountValue
      ? 0
      : discountType === 'PERCENTAGE'
        ? subtotal * (Number(discountValue) / 100)
        : Number(discountValue),
  );
  const taxableBase = Math.max(subtotal - discountAmount, 0);
  const vatPercent = Number(vatPercentage || 0);
  const taxAmount = round2(taxableBase * (vatPercent / 100));
  const total = round2(taxableBase + taxAmount);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/quotations', {
        serviceRequestId,
        siteInspectionId: siteInspectionId || undefined,
        title: title || undefined,
        description: description || undefined,
        lineItems: lineItems.map((i) => ({ ...i, itemName: i.itemName || undefined })),
        discountType: discountType === 'NONE' ? undefined : discountType,
        discountValue: discountType === 'NONE' ? undefined : Number(discountValue),
        discountReason: discountReason || undefined,
        vatPercentage: vatPercent,
        validityDays: validityDays ? Number(validityDays) : undefined,
        termsAndConditions: termsAndConditions || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-statistics'] });
      toast({ title: 'Quotation created' });
      router.push(`/quotations/${(data as { id: string }).id}`);
    },
    onError: (error) => {
      toast({ title: 'Could not create quotation', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  const canSubmit = !!serviceRequestId && lineItems.length > 0 && lineItems.every((i) => i.description && i.quantity > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">New Quotation</h1>

      <Card>
        <CardHeader>
          <CardTitle>Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Select a completed Site Inspection</Label>
          <Select value={siteInspectionId} onValueChange={handleSelectInspection}>
            <SelectTrigger>
              <SelectValue placeholder="Select a Site Inspection to auto-load customer, service, and estimates" />
            </SelectTrigger>
            <SelectContent>
              {(completedInspections ?? []).map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.customer.name} — {i.service.name} — {new Date(i.inspectionDate).toLocaleDateString()}
                  {i.estimatedCost != null ? ` — ${currency(i.estimatedCost)}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {prefillMutation.isPending && <p className="text-xs text-muted-foreground">Loading inspection details…</p>}
          {completedInspections && completedInspections.length === 0 && (
            <p className="text-xs text-muted-foreground">No completed inspections available yet.</p>
          )}
        </CardContent>
      </Card>

      {serviceRequestId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Quotation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Aluminum Installation Quotation" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {CATEGORY_SECTIONS.map((section) => (
            <Card key={section.category}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{section.label}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => addItem(section.category)}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {lineItems.filter((i) => i.category === section.category).length === 0 && (
                  <p className="text-sm text-muted-foreground">No {section.label.toLowerCase()} yet.</p>
                )}
                {lineItems.map((item, index) =>
                  item.category === section.category ? (
                    <div key={index} className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                      <Input
                        placeholder="Item name"
                        value={item.itemName}
                        onChange={(e) => updateItem(index, { itemName: e.target.value })}
                      />
                      <Input
                        placeholder="Description"
                        className="sm:col-span-2"
                        value={item.description}
                        onChange={(e) => updateItem(index, { description: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                      />
                      <Input
                        placeholder={section.unitPlaceholder}
                        value={item.unit}
                        onChange={(e) => updateItem(index, { unit: e.target.value })}
                      />
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          placeholder="Unit price"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null,
                )}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>Discount &amp; VAT</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Discount type</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as typeof discountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No discount</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {discountType !== 'NONE' && (
                <div className="space-y-1">
                  <Label>Discount value {discountType === 'PERCENTAGE' ? '(%)' : '($)'}</Label>
                  <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                </div>
              )}
              {discountType !== 'NONE' && (
                <div className="space-y-1 sm:col-span-2">
                  <Label>Discount reason (required above the approval threshold)</Label>
                  <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <Label>VAT (%)</Label>
                <Input type="number" value={vatPercentage} onChange={(e) => setVatPercentage(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Validity (days)</Label>
                <Input type="number" placeholder="Defaults to company setting" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terms &amp; Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea rows={3} value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Material Cost</span>
                <span>${materialCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor Cost</span>
                <span>${laborCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transportation Cost</span>
                <span>${transportationCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-medium">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT ({vatPercent}%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 text-base font-semibold">
                <span>Grand Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Saving…' : 'Save as Draft'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
