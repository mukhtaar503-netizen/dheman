'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, History, Trash2, Upload } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import type { CustomerDocument, CustomerDocumentCategory } from '@/types';

const CATEGORIES: CustomerDocumentCategory[] = ['CONTRACT', 'INVOICE', 'PHOTO', 'DRAWING', 'RECEIPT', 'WARRANTY', 'IDENTITY', 'OTHER'];

export function CustomerDocumentsTab({ customerId, documents }: { customerId: string; documents: CustomerDocument[] }) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [category, setCategory] = React.useState<CustomerDocumentCategory>('OTHER');
  const [manualUrl, setManualUrl] = React.useState('');
  const [storageUnavailable, setStorageUnavailable] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customer', customerId] });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (manualUrl) {
        return api.post(`/customers/${customerId}/documents`, { category, fileName: manualUrl.split('/').pop() ?? 'document', fileUrl: manualUrl });
      }
      if (!file) throw new Error('Choose a file first');

      setUploading(true);
      try {
        const { signedUrl, publicUrl, path } = await api.post<{ signedUrl: string; publicUrl: string; path: string }>(
          `/customers/${customerId}/documents/upload-url`,
          { fileName: file.name, mimeType: file.type },
        );
        const putRes = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        if (!putRes.ok) throw new Error('Upload to storage failed');
        return api.post(`/customers/${customerId}/documents`, {
          category,
          fileName: file.name,
          fileUrl: publicUrl,
          fileSize: file.size,
          mimeType: file.type,
        });
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setFile(null);
      setManualUrl('');
      toast({ title: 'Document uploaded' });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 400 && e.message.includes('storage is not configured')) {
        setStorageUnavailable(true);
        return;
      }
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => api.del(`/customers/${customerId}/documents/${documentId}`),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Document deleted' });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload className="mr-1 h-4 w-4" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                uploadMutation.mutate();
              }}
            >
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as CustomerDocumentCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0) + c.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!storageUnavailable ? (
                <div className="space-y-1">
                  <Label>File</Label>
                  <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <p className="text-xs text-muted-foreground">Up to 10MB. Uploaded directly to Supabase Storage.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>File URL</Label>
                  <Input
                    placeholder="https://…"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Direct storage upload isn&apos;t configured on this server (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY) — paste a file URL instead.
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={uploadMutation.isPending || uploading}>
                  {uploading ? 'Uploading…' : 'Save document'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 && <EmptyState title="No documents uploaded" />}
      {documents.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.fileName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{doc.category}</Badge>
                </TableCell>
                <TableCell>v{doc.version}{doc.replacesId && <History className="ml-1 inline h-3 w-3 text-muted-foreground" />}</TableCell>
                <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(doc.id)}>
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
