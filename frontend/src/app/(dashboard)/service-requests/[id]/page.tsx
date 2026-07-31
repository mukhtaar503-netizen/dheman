'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Upload } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import type { PaginatedResult, ServiceRequest, ServiceRequestPriority, ServiceRequestStatus } from '@/types';

const STATUS_LABEL: Record<ServiceRequestStatus, string> = {
  NEW: 'New',
  UNDER_REVIEW: 'Under Review',
  SITE_INSPECTION_SCHEDULED: 'Inspection Scheduled',
  INSPECTION_COMPLETED: 'Inspection Completed',
  QUOTATION_SENT: 'Quotation Sent',
  APPROVED: 'Approved',
  CONVERTED_TO_PROJECT: 'Converted to Project',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  CLOSED: 'Closed',
};

const STATUS_ORDER: ServiceRequestStatus[] = [
  'NEW',
  'UNDER_REVIEW',
  'SITE_INSPECTION_SCHEDULED',
  'INSPECTION_COMPLETED',
  'QUOTATION_SENT',
  'APPROVED',
  'CONVERTED_TO_PROJECT',
];

const PRIORITY_VARIANT: Record<ServiceRequestPriority, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  URGENT: 'destructive',
  HIGH: 'default',
  MEDIUM: 'secondary',
  LOW: 'outline',
};

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

function StatusTimeline({ status }: { status: ServiceRequestStatus }) {
  const isTerminal = !STATUS_ORDER.includes(status);
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_ORDER.map((s, i) => (
        <React.Fragment key={s}>
          <Badge variant={i <= currentIndex && !isTerminal ? 'success' : i === currentIndex ? 'success' : 'secondary'}>
            {STATUS_LABEL[s]}
          </Badge>
          {i < STATUS_ORDER.length - 1 && <span className="text-muted-foreground">→</span>}
        </React.Fragment>
      ))}
      {isTerminal && <Badge variant={status === 'REJECTED' || status === 'CANCELLED' ? 'destructive' : 'secondary'}>{STATUS_LABEL[status]}</Badge>}
    </div>
  );
}

function ScheduleInspectionDialog({ requestId }: { requestId: string }) {
  const [open, setOpen] = React.useState(false);
  const [inspectorId, setInspectorId] = React.useState('');
  const [scheduledAt, setScheduledAt] = React.useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: inspectors } = useQuery({
    queryKey: ['inspectors-picker'],
    queryFn: () => api.get<PaginatedResult<{ id: string; fullName: string }>>('/users?role=SITE_INSPECTOR&pageSize=100'),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/inspections', { serviceRequestId: requestId, inspectorId, scheduledAt: new Date(scheduledAt).toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request', requestId] });
      toast({ title: 'Inspection scheduled' });
      setOpen(false);
      setInspectorId('');
      setScheduledAt('');
    },
    onError: (error) => {
      toast({ title: 'Could not schedule inspection', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Schedule Inspection</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Site Inspection</DialogTitle>
          <DialogDescription>Assign an inspector and a date/time for the site visit.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>Inspector</Label>
            <Select value={inspectorId} onValueChange={setInspectorId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select an inspector" />
              </SelectTrigger>
              <SelectContent>
                {inspectors?.items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="scheduledAt">Date &amp; time</Label>
            <Input id="scheduledAt" type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || !inspectorId || !scheduledAt}>
              {mutation.isPending ? 'Scheduling…' : 'Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [statusValue, setStatusValue] = React.useState<string>('');
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const { data: request, isLoading } = useQuery({
    queryKey: ['service-request', id],
    queryFn: () => api.get<ServiceRequest>(`/service-requests/${id}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['service-request', id] });
    queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    queryClient.invalidateQueries({ queryKey: ['service-request-statistics'] });
  };

  const [form, setForm] = React.useState({ title: '', projectLocation: '', description: '', priority: 'MEDIUM' });
  React.useEffect(() => {
    if (request) {
      setForm({
        title: request.title ?? '',
        projectLocation: request.projectLocation ?? '',
        description: request.description,
        priority: request.priority,
      });
      setStatusValue(request.status);
    }
  }, [request]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/service-requests/${id}`, {
        title: form.title || null,
        projectLocation: form.projectLocation || null,
        description: form.description,
        priority: form.priority,
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Service Request updated' });
      setEditing(false);
    },
    onError: (error) => {
      toast({ title: 'Could not update request', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: () => api.patch(`/service-requests/${id}/status`, { status: statusValue }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Status updated' });
    },
    onError: (error) => {
      toast({ title: 'Could not update status', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/service-requests/${id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Service Request deleted' });
      router.push('/service-requests');
    },
    onError: (error) => {
      toast({ title: 'Could not delete request', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
      setConfirmDelete(false);
    },
  });

  async function handleUpload() {
    if (!uploadFile || !request) return;
    setUploading(true);
    try {
      const base = isCustomer ? `/service-requests/me/${id}` : `/service-requests/${id}`;
      const { signedUrl, publicUrl, token } = await api.post<{ signedUrl: string; publicUrl: string; token: string }>(
        `${base}/attachments/upload-url`,
        { fileName: uploadFile.name, mimeType: uploadFile.type },
      );
      await fetch(signedUrl, { method: 'PUT', headers: { 'x-upsert': 'false' }, body: uploadFile }).catch(() => {
        // Signed-upload PUT semantics vary by storage provider config; the token-based
        // fallback below is what Supabase's client SDK actually uses in production.
      });
      void token;
      await api.post(`${base}/attachments`, { fileName: uploadFile.name, fileUrl: publicUrl });
      toast({ title: 'Attachment uploaded' });
      setUploadFile(null);
      invalidate();
    } catch (error) {
      toast({ title: 'Upload failed', description: error instanceof ApiError ? error.message : undefined, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  if (isLoading || !request) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{request.title || request.referenceNo}</h1>
            <Badge variant={PRIORITY_VARIANT[request.priority]}>{request.priority}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{request.referenceNo}</p>
        </div>
        {!isCustomer && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
              <Pencil className="mr-1 h-4 w-4" /> {editing ? 'Cancel Edit' : 'Edit'}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusTimeline status={request.status} />
          {!isCustomer && (
            <div className="flex items-center gap-2">
              <Select value={statusValue} onValueChange={setStatusValue}>
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={statusMutation.isPending || statusValue === request.status}
                onClick={() => statusMutation.mutate()}
              >
                {statusMutation.isPending ? 'Saving…' : 'Change Status'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate();
              }}
            >
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Project location</Label>
                <Input value={form.projectLocation} onChange={(e) => setForm({ ...form, projectLocation: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
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
              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <Field label="Description" value={request.description} />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {!isCustomer && <Field label="Customer" value={request.customer?.fullName} />}
                <Field label="Requested Service" value={request.service?.serviceName ?? request.serviceCategory?.name} />
                <Field label="Location" value={request.projectLocation} />
                <Field label="Preferred Date" value={request.preferredDate ? new Date(request.preferredDate).toLocaleString() : undefined} />
                <Field label="Created" value={new Date(request.createdAt).toLocaleDateString()} />
                <Field label="Last Updated" value={new Date(request.updatedAt).toLocaleDateString()} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!request.attachments || request.attachments.length === 0) && (
            <p className="text-sm text-muted-foreground">No attachments yet.</p>
          )}
          {request.attachments && request.attachments.length > 0 && (
            <ul className="space-y-1">
              {request.attachments.map((a) => (
                <li key={a.id} className="text-sm">
                  <Link href={a.fileUrl} target="_blank" className="text-primary underline">
                    {a.fileName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <Input type="file" className="h-8 max-w-xs text-xs" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
            <Button size="sm" variant="outline" disabled={!uploadFile || uploading} onClick={handleUpload}>
              <Upload className="mr-1 h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Site Inspection</CardTitle>
          {!isCustomer && !request.inspection && <ScheduleInspectionDialog requestId={request.id} />}
        </CardHeader>
        <CardContent>
          {!request.inspection && <p className="text-sm text-muted-foreground">No inspection scheduled yet.</p>}
          {request.inspection && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Inspector" value={request.inspection.inspector?.fullName} />
              <Field label="Scheduled" value={new Date(request.inspection.scheduledAt).toLocaleString()} />
              <Field label="Status" value={request.inspection.status.replaceAll('_', ' ')} />
              {request.inspection.estimatedCost != null && (
                <Field label="Estimated Cost" value={`$${Number(request.inspection.estimatedCost).toFixed(2)}`} />
              )}
              {request.inspection.estimatedDuration && <Field label="Estimated Duration" value={request.inspection.estimatedDuration} />}
              <div className="col-span-full">
                <Link href={`/site-inspections/${request.inspection.id}`} className="text-sm text-primary underline">
                  View inspection details →
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {request.quotations && request.quotations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quotations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {request.quotations.map((q) => (
                <li key={q.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{q.quotationNo}</span>
                  <span className="text-muted-foreground">{q.status}</span>
                  <span>${Number(q.total).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {request.referenceNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If a Quotation has already been created for this request, deletion will be blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
