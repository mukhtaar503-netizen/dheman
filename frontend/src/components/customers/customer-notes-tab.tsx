'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pin, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/empty-state';
import type { CustomerNote } from '@/types';

export function CustomerNotesTab({ customerId, notes }: { customerId: string; notes: CustomerNote[] }) {
  const [note, setNote] = React.useState('');
  const [isPinned, setIsPinned] = React.useState(false);
  const [visibility, setVisibility] = React.useState<'INTERNAL' | 'PUBLIC'>('INTERNAL');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customer', customerId] });

  const addMutation = useMutation({
    mutationFn: () => api.post(`/customers/${customerId}/notes`, { note, isPinned, visibility }),
    onSuccess: () => {
      setNote('');
      setIsPinned(false);
      invalidate();
      toast({ title: 'Note added' });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ noteId, pinned }: { noteId: string; pinned: boolean }) =>
      api.patch(`/customers/${customerId}/notes/${noteId}`, { isPinned: pinned }),
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => api.del(`/customers/${customerId}/notes/${noteId}`),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Note deleted' });
    },
  });

  return (
    <div className="space-y-4">
      <form
        className="space-y-2 rounded-lg border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (note.trim()) addMutation.mutate();
        }}
      >
        <Textarea placeholder="Add a note about this customer…" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isPinned} onCheckedChange={(c) => setIsPinned(c === true)} />
              Pin this note
            </label>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-normal">Visibility</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as 'INTERNAL' | 'PUBLIC')}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" size="sm" disabled={addMutation.isPending || !note.trim()}>
            {addMutation.isPending ? 'Adding…' : 'Add note'}
          </Button>
        </div>
      </form>

      {notes.length === 0 && <EmptyState title="No notes yet" />}
      <div className="space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg border border-border p-3">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {n.isPinned && <Badge variant="secondary">Pinned</Badge>}
                <Badge variant="outline">{n.visibility}</Badge>
                <span>{n.author?.fullName ?? 'System'}</span>
                <span>· {new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => togglePinMutation.mutate({ noteId: n.id, pinned: !n.isPinned })}>
                  <Pin className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(n.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm">{n.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
