'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Send, FileText } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Customer, CompletedInspectionOption, QuotationItemCategory, QuotationPrefill, ServiceRequest } from '@/types';

interface DraftLineItem {
  category: QuotationItemCategory;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface ColumnConfig {
  key: 'itemName' | 'description' | 'quantity' | 'unit' | 'unitPrice';
  label: string;
  placeholder: string;
  numeric?: boolean;
}

interface SectionConfig {
  category: QuotationItemCategory;
  title: string;
  emptyLabel: string;
  addLabel: string;
  gridClass: string;
  columns: ColumnConfig[];
}

const SECTIONS: SectionConfig[] = [
  {
    category: 'MATERIAL',
    title: 'Material Items',
    emptyLabel: 'No material items added',
    addLabel: 'Add Material',
    gridClass: 'sm:grid-cols-[1.5fr_1.5fr_0.7fr_1fr_1fr_1fr_1.75rem]',
    columns: [
      { key: 'itemName', label: 'Material Name', placeholder: 'e.g. MDF 18mm' },
      { key: 'description', label: 'Description / Purpose', placeholder: 'e.g. Used for furniture' },
      { key: 'quantity', label: 'Quantity', placeholder: 'Qty', numeric: true },
      { key: 'unit', label: 'Unit', placeholder: 'e.g. pcs, meters, sheets' },
      { key: 'unitPrice', label: 'Unit Price', placeholder: 'Price per unit', numeric: true },
    ],
  },
  {
    category: 'LABOR',
    title: 'Labor Items',
    emptyLabel: 'No labor items added',
    addLabel: 'Add Labor',
    gridClass: 'sm:grid-cols-[1.5fr_1.5fr_0.8fr_0.9fr_1fr_1fr_1.75rem]',
    columns: [
      { key: 'itemName', label: 'Labor / Worker Name', placeholder: 'e.g. Installation team' },
      { key: 'description', label: 'Description', placeholder: 'e.g. Aluminum installation' },
      { key: 'quantity', label: 'Quantity / Hours', placeholder: 'e.g. 2', numeric: true },
      { key: 'unit', label: 'Unit', placeholder: 'e.g. hrs, days' },
      { key: 'unitPrice', label: 'Rate', placeholder: 'Rate per hour/day', numeric: true },
    ],
  },
  {
    category: 'TRANSPORTATION',
    title: 'Transportation Items',
    emptyLabel: 'No transportation added',
    addLabel: 'Add Transportation',
    gridClass: 'sm:grid-cols-[2.4fr_0.8fr_0.9fr_1fr_1fr_1.75rem]',
    columns: [
      { key: 'description', label: 'Transportation Type / Description', placeholder: 'e.g. Material delivery' },
      { key: 'quantity', label: 'Quantity', placeholder: 'e.g. 1', numeric: true },
      { key: 'unit', label: 'Unit', placeholder: 'e.g. trip' },
      { key: 'unitPrice', label: 'Unit Cost', placeholder: 'Cost per trip', numeric: true },
    ],
  },
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const currency = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

/** Clamps to >= 0 (and optionally <= max) so out-of-range values like "-8" can never land in state. */
function clampNumber(raw: string, max?: number): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return 0;
  const nonNegative = Math.max(0, n);
  return max != null ? Math.min(max, nonNegative) : nonNegative;
}

function lineItemFieldErrors(item: DraftLineItem): Partial<Record<ColumnConfig['key'], string>> {
  const errors: Partial<Record<ColumnConfig['key'], string>> = {};
  if (!item.description.trim()) errors.description = 'Required';
  if (!item.unit.trim()) errors.unit = 'Required';
  if (!(item.quantity > 0)) errors.quantity = 'Must be greater than 0';
  if (item.unitPrice < 0) errors.unitPrice = 'Cannot be negative';
  return errors;
}

/** A quotation was successfully saved as a draft, but the follow-up "send" call failed
 * (e.g. the discount exceeds the auto-approval threshold) — carries the id so the caller
 * can still navigate to the saved record instead of losing the user's work. */
class SendAfterCreateError extends Error {
  quotationId: string;
  cause2: unknown;
  constructor(quotationId: string, cause: unknown) {
    super('Quotation saved as draft, but sending failed');
    this.quotationId = quotationId;
    this.cause2 = cause;
  }
}

export default function NewQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [inspectionSearch, setInspectionSearch] = React.useState('');
  const [siteInspectionId, setSiteInspectionId] = React.useState('');
  const [serviceRequestId, setServiceRequestId] = React.useState('');
  const [prefillInfo, setPrefillInfo] = React.useState<{ customer: Customer; serviceRequest: ServiceRequest } | null>(null);
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
  const [submitAttempted, setSubmitAttempted] = React.useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = React.useState<number | null>(null);

  const { data: completedInspections } = useQuery({
    queryKey: ['completed-inspections-picker'],
    queryFn: () => api.get<CompletedInspectionOption[]>('/inspections/completed'),
  });
  const filteredInspections = React.useMemo(() => {
    const list = completedInspections ?? [];
    const q = inspectionSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => `${i.customer.name} ${i.service.name}`.toLowerCase().includes(q));
  }, [completedInspections, inspectionSearch]);

  const { data: settings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => api.get<{ taxRatePercent: string | number; discountApprovalThreshold: string | number }>('/settings'),
  });

  React.useEffect(() => {
    if (settings && !vatPercentage) setVatPercentage(String(settings.taxRatePercent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const prefillMutation = useMutation({
    mutationFn: (inspectionId: string) => api.get<QuotationPrefill>(`/quotations/prefill/${inspectionId}`),
    onSuccess: (data) => {
      setServiceRequestId(data.serviceRequest.id);
      setPrefillInfo({ customer: data.customer, serviceRequest: data.serviceRequest });
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
  function confirmRemoveItem() {
    if (pendingDeleteIndex === null) return;
    setLineItems(lineItems.filter((_, i) => i !== pendingDeleteIndex));
    setPendingDeleteIndex(null);
  }

  const materialCost = round2(lineItems.filter((i) => i.category === 'MATERIAL').reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const laborCost = round2(lineItems.filter((i) => i.category === 'LABOR').reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const transportationCost = round2(lineItems.filter((i) => i.category === 'TRANSPORTATION').reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const subtotal = round2(materialCost + laborCost + transportationCost);
  const discountValueNum = Number(discountValue || 0);
  const discountAmount = round2(
    discountType === 'NONE' || !discountValue
      ? 0
      : discountType === 'PERCENTAGE'
        ? subtotal * (discountValueNum / 100)
        : discountValueNum,
  );
  const taxableBase = Math.max(subtotal - discountAmount, 0);
  const vatPercent = Number(vatPercentage || 0);
  const taxAmount = round2(taxableBase * (vatPercent / 100));
  const total = round2(taxableBase + taxAmount);

  const discountError =
    discountType === 'PERCENTAGE' && (discountValueNum < 0 || discountValueNum > 100)
      ? 'Discount percentage must be between 0 and 100'
      : discountType === 'FIXED' && discountValueNum < 0
        ? 'Discount amount cannot be negative'
        : null;
  const vatError = vatPercent < 0 ? 'VAT cannot be negative' : vatPercent > 100 ? 'VAT cannot exceed 100%' : null;
  const lineItemErrorsByIndex = lineItems.map(lineItemFieldErrors);
  const hasLineItemErrors = lineItemErrorsByIndex.some((e) => Object.keys(e).length > 0);

  // Mirrors the backend's BR-QUOTE-02 check exactly so the reason field is only required
  // when the discount is actually above the configured approval threshold, not on every discount.
  const discountPercentOfSubtotal = discountType === 'PERCENTAGE' ? discountValueNum : subtotal ? (discountAmount / subtotal) * 100 : 0;
  const discountApprovalThreshold = settings ? Number(settings.discountApprovalThreshold) : null;
  const discountRequiresReason =
    discountType !== 'NONE' && discountApprovalThreshold != null && discountPercentOfSubtotal > discountApprovalThreshold && !discountReason;

  const mutation = useMutation({
    mutationFn: async (sendAfterCreate: boolean) => {
      const created = await api.post<{ id: string }>('/quotations', {
        serviceRequestId,
        siteInspectionId: siteInspectionId || undefined,
        title: title || undefined,
        description: description || undefined,
        lineItems: lineItems.map((i) => ({ ...i, itemName: i.itemName || undefined })),
        discountType: discountType === 'NONE' ? undefined : discountType,
        discountValue: discountType === 'NONE' ? undefined : discountValueNum,
        discountReason: discountReason || undefined,
        vatPercentage: vatPercent,
        validityDays: validityDays ? Number(validityDays) : undefined,
        termsAndConditions: termsAndConditions || undefined,
      });
      if (sendAfterCreate) {
        try {
          await api.patch(`/quotations/${created.id}/status`, { status: 'SENT' });
        } catch (err) {
          throw new SendAfterCreateError(created.id, err);
        }
      }
      return created;
    },
    onSuccess: (data, sendAfterCreate) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-statistics'] });
      toast({ title: sendAfterCreate ? 'Quotation created and sent' : 'Quotation saved as draft' });
      router.push(`/quotations/${data.id}`);
    },
    onError: (error) => {
      if (error instanceof SendAfterCreateError) {
        queryClient.invalidateQueries({ queryKey: ['quotations'] });
        queryClient.invalidateQueries({ queryKey: ['quotation-statistics'] });
        toast({
          title: 'Saved as draft — could not send',
          description: error.cause2 instanceof ApiError ? error.cause2.message : undefined,
          variant: 'destructive',
        });
        router.push(`/quotations/${error.quotationId}`);
        return;
      }
      toast({ title: 'Could not create quotation', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  const canSubmit = !!serviceRequestId && lineItems.length > 0 && !hasLineItemErrors && !discountError && !vatError && !discountRequiresReason;

  function handleSave(sendAfterCreate: boolean) {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    mutation.mutate(sendAfterCreate);
  }

  const pendingItem = pendingDeleteIndex !== null ? lineItems[pendingDeleteIndex] : null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-semibold">New Quotation</h1>
        <p className="text-sm text-muted-foreground">Create a quotation from a completed site inspection.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="space-y-4 lg:col-span-2">
          {/* 1. Quotation Header / Source */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Quotation Header</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="space-y-1">
                <Label htmlFor="siteInspection">Site Inspection</Label>
                <Select value={siteInspectionId} onValueChange={handleSelectInspection}>
                  <SelectTrigger id="siteInspection">
                    <SelectValue placeholder="Search and select a completed site inspection…" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Search by customer or service…"
                        value={inspectionSearch}
                        onChange={(e) => setInspectionSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        aria-label="Search site inspections"
                      />
                    </div>
                    {filteredInspections.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.customer.name} — {i.service.name} — {new Date(i.inspectionDate).toLocaleDateString()}
                        {i.estimatedCost != null ? ` — ${currency(i.estimatedCost)}` : ''}
                      </SelectItem>
                    ))}
                    {filteredInspections.length === 0 && <p className="p-2 text-xs text-muted-foreground">No matching inspections.</p>}
                  </SelectContent>
                </Select>
                {prefillMutation.isPending && <p className="text-xs text-muted-foreground">Loading inspection details…</p>}
                {completedInspections && completedInspections.length === 0 && (
                  <p className="text-xs text-muted-foreground">No completed inspections available yet.</p>
                )}
              </div>

              {prefillInfo && (
                <div className="grid grid-cols-1 gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Customer</p>
                    <p className="font-medium">
                      {prefillInfo.customer.fullName}
                      {prefillInfo.customer.companyName ? ` — ${prefillInfo.customer.companyName}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Project / Service</p>
                    <p className="font-medium">
                      {prefillInfo.serviceRequest.title || prefillInfo.serviceRequest.service?.serviceName || prefillInfo.serviceRequest.serviceCategory?.name || prefillInfo.serviceRequest.referenceNo}
                    </p>
                  </div>
                </div>
              )}

              {serviceRequestId && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="quotationTitle">Quotation Title</Label>
                    <Input id="quotationTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Aluminum Installation Quotation" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="quotationDescription">Description</Label>
                    <Textarea
                      id="quotationDescription"
                      rows={2}
                      className="min-h-0"
                      placeholder="Brief summary of the work covered by this quotation"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {serviceRequestId && (
            <>
              {/* 2-4. Material / Labor / Transportation line items */}
              {SECTIONS.map((section) => {
                const rows = lineItems.map((item, index) => ({ item, index })).filter(({ item }) => item.category === section.category);
                return (
                  <Card key={section.category}>
                    <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <Button type="button" size="sm" variant="outline" onClick={() => addItem(section.category)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> {section.addLabel}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-2 p-4 pt-0">
                      {rows.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border py-4 text-center">
                          <p className="text-sm text-muted-foreground">{section.emptyLabel}</p>
                        </div>
                      ) : (
                        <>
                          <div className={`hidden gap-2 px-1 text-[11px] font-medium text-muted-foreground sm:grid ${section.gridClass}`}>
                            {section.columns.map((col) => (
                              <span key={col.key}>{col.label}</span>
                            ))}
                            <span>Total</span>
                            <span className="sr-only">Actions</span>
                          </div>
                          <div className="space-y-2">
                            {rows.map(({ item, index }) => {
                              const errors = lineItemErrorsByIndex[index];
                              const rowTotal = round2((item.quantity || 0) * (item.unitPrice || 0));
                              return (
                                <div key={index} className={`grid grid-cols-2 items-start gap-2 rounded-md border border-border p-2 sm:items-center sm:border-0 sm:p-0 ${section.gridClass}`}>
                                  {section.columns.map((col) => (
                                    <div key={col.key} className={col.key === 'description' || col.key === 'itemName' ? 'col-span-2 sm:col-span-1' : ''}>
                                      <span className="mb-0.5 block text-[10px] text-muted-foreground sm:hidden">{col.label}</span>
                                      <Input
                                        type={col.numeric ? 'number' : 'text'}
                                        min={col.numeric ? 0 : undefined}
                                        step={col.key === 'quantity' ? 'any' : undefined}
                                        placeholder={col.placeholder}
                                        aria-label={col.label}
                                        value={item[col.key]}
                                        onChange={(e) => {
                                          if (col.numeric) {
                                            updateItem(index, { [col.key]: clampNumber(e.target.value) } as Partial<DraftLineItem>);
                                          } else {
                                            updateItem(index, { [col.key]: e.target.value } as Partial<DraftLineItem>);
                                          }
                                        }}
                                        className={submitAttempted && errors[col.key] ? 'border-destructive' : ''}
                                      />
                                      {submitAttempted && errors[col.key] && <p className="mt-0.5 text-[10px] text-destructive">{errors[col.key]}</p>}
                                    </div>
                                  ))}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground sm:hidden">Total</span>
                                    <span className="text-sm font-medium tabular-nums">{currency(rowTotal)}</span>
                                  </div>
                                  <div className="flex justify-end sm:justify-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => setPendingDeleteIndex(index)}
                                      aria-label={`Remove ${section.title.slice(0, -1).toLowerCase()} row`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* 5. Discount & VAT */}
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Discount &amp; VAT</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="discountType">Discount Type</Label>
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as typeof discountType)}>
                      <SelectTrigger id="discountType">
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
                      <Label htmlFor="discountValue">Discount Value {discountType === 'PERCENTAGE' ? '(%)' : '($)'}</Label>
                      <Input
                        id="discountValue"
                        type="number"
                        min={0}
                        max={discountType === 'PERCENTAGE' ? 100 : undefined}
                        placeholder={discountType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 50.00'}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(String(clampNumber(e.target.value, discountType === 'PERCENTAGE' ? 100 : undefined)))}
                        className={submitAttempted && discountError ? 'border-destructive' : ''}
                      />
                      {submitAttempted && discountError && <p className="text-[10px] text-destructive">{discountError}</p>}
                    </div>
                  )}
                  {discountType !== 'NONE' && (
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <Label htmlFor="discountReason">Discount Reason</Label>
                      <Input
                        id="discountReason"
                        placeholder="Required above the approval threshold"
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                        className={submitAttempted && discountRequiresReason ? 'border-destructive' : ''}
                      />
                      {submitAttempted && discountRequiresReason && (
                        <p className="text-[10px] text-destructive">This discount exceeds the auto-approval threshold — add a reason to continue</p>
                      )}
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="vatPercentage">VAT (%)</Label>
                    <Input
                      id="vatPercentage"
                      type="number"
                      min={0}
                      max={100}
                      placeholder="e.g. 5"
                      value={vatPercentage}
                      onChange={(e) => setVatPercentage(String(clampNumber(e.target.value, 100)))}
                      className={submitAttempted && vatError ? 'border-destructive' : ''}
                    />
                    {submitAttempted && vatError && <p className="text-[10px] text-destructive">{vatError}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="validityDays">Validity (Days)</Label>
                    <Input
                      id="validityDays"
                      type="number"
                      min={0}
                      placeholder="Defaults to company setting"
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value === '' ? '' : String(clampNumber(e.target.value)))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 7. Terms & Conditions */}
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Terms &amp; Conditions</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Label htmlFor="terms" className="sr-only">
                    Terms and Conditions
                  </Label>
                  <Textarea id="terms" rows={3} className="min-h-0" value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} />
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* 6. Live Summary + Actions — sticky on desktop */}
        {serviceRequestId && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Quotation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-4 pt-0 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material Subtotal</span>
                  <span className="tabular-nums">{currency(materialCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Labor Subtotal</span>
                  <span className="tabular-nums">{currency(laborCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transportation Subtotal</span>
                  <span className="tabular-nums">{currency(transportationCost)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 font-medium">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{currency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount</span>
                    <span className="tabular-nums">-{currency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({vatPercent}%)</span>
                  <span className="tabular-nums">{currency(taxAmount)}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between rounded-md bg-primary/10 px-2.5 py-2">
                  <span className="text-sm font-semibold">Grand Total</span>
                  <span className="text-xl font-bold tabular-nums text-primary">{currency(total)}</span>
                </div>

                {!canSubmit && submitAttempted && (
                  <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                    {!serviceRequestId
                      ? 'Select a site inspection first.'
                      : lineItems.length === 0
                        ? 'Add at least one line item.'
                        : hasLineItemErrors
                          ? 'Fix the highlighted line item fields.'
                          : discountError || vatError || 'Add a discount reason to continue.'}
                  </p>
                )}

                <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                  <Button type="button" onClick={() => handleSave(true)} disabled={mutation.isPending}>
                    <Send className="mr-1.5 h-4 w-4" />
                    {mutation.isPending && mutation.variables === true ? 'Sending…' : 'Save & Send'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleSave(false)} disabled={mutation.isPending}>
                    <FileText className="mr-1.5 h-4 w-4" />
                    {mutation.isPending && mutation.variables === false ? 'Saving…' : 'Save Draft'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => router.back()} disabled={mutation.isPending}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AlertDialog open={pendingDeleteIndex !== null} onOpenChange={(open) => !open && setPendingDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this item?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingItem?.itemName || pendingItem?.description
                ? `"${pendingItem.itemName || pendingItem.description}" will be removed from this quotation.`
                : 'This line item will be removed from this quotation.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveItem}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
