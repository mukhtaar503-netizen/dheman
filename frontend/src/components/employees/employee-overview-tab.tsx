'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmployeeDetail } from '@/types';

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

function initials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function EmployeeOverviewTab({ employee }: { employee: EmployeeDetail }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      try {
        const { signedUrl, publicUrl } = await api.post<{ signedUrl: string; publicUrl: string; path: string }>(
          `/users/${employee.id}/documents/upload-url`,
          { fileName: file.name, mimeType: file.type },
        );
        const putRes = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        if (!putRes.ok) throw new Error('Upload to storage failed');
        return api.patch(`/users/${employee.id}`, { photoUrl: publicUrl });
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employee.id] });
      toast({ title: 'Profile photo updated' });
    },
    onError: (e) => {
      const message =
        e instanceof ApiError && e.message.includes('storage is not configured')
          ? 'Direct storage upload isn’t configured on this server (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).'
          : e instanceof Error
            ? e.message
            : undefined;
      toast({ title: 'Could not update photo', description: message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="relative">
            {employee.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={employee.photoUrl} alt={employee.fullName} loading="lazy" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
                {initials(employee.fullName)}
              </div>
            )}
            <button
              type="button"
              className="absolute -bottom-1 -right-1 rounded-full border border-border bg-card p-1.5 shadow-sm hover:bg-muted"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Change photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) photoMutation.mutate(file);
                e.target.value = '';
              }}
            />
          </div>
          <div>
            <p className="font-medium">{employee.fullName}</p>
            <p className="text-sm text-muted-foreground">{employee.jobTitle ?? employee.role.replaceAll('_', ' ')}</p>
            {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Employee ID" value={employee.employeeId} />
          <Field label="Job Title" value={employee.jobTitle} />
          <Field label="Department" value={employee.department} />
          <Field label="Role" value={employee.role.replaceAll('_', ' ')} />
          <Field label="Phone" value={employee.phone} />
          <Field label="Email" value={employee.email} />
          <Field label="Hire Date" value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : undefined} />
          <Field label="Address" value={employee.address} />
          {employee.technicianProfile && (
            <Field label="Skills" value={employee.technicianProfile.skills.join(', ') || undefined} />
          )}
        </CardContent>
      </Card>

      {!employee.photoUrl && (
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Camera className="mr-1 h-4 w-4" /> Upload Profile Photo
        </Button>
      )}
    </div>
  );
}
