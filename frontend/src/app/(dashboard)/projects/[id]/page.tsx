'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { PaginatedResult, Project, ProjectStaffAssignment, ProjectStatus, StaffResponsibility, StaffUser } from '@/types';

const STATUS_VARIANT: Record<ProjectStatus, 'secondary' | 'default' | 'outline' | 'success' | 'destructive'> = {
  PLANNING: 'outline',
  SCHEDULED: 'secondary',
  IN_PROGRESS: 'default',
  ON_HOLD: 'destructive',
  COMPLETED: 'success',
  CLOSED: 'secondary',
  CANCELLED: 'destructive',
};

const RESPONSIBILITIES: StaffResponsibility[] = [
  'SUPERVISOR',
  'TECHNICIAN',
  'INSTALLER',
  'ELECTRICIAN',
  'CARPENTER',
  'PLUMBER',
  'PAINTER',
  'DRIVER',
  'HELPER',
  'OTHER',
];

function responsibilityLabel(r: string) {
  return r.charAt(0) + r.slice(1).toLowerCase();
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

function AssignStaffDialog({ projectId, alreadyAssignedUserIds }: { projectId: string; alreadyAssignedUserIds: string[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [responsibility, setResponsibility] = React.useState<StaffResponsibility | ''>('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const { data: staff } = useQuery({
    queryKey: ['staff-picker', search],
    queryFn: () => api.get<PaginatedResult<StaffUser>>(`/users?pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    enabled: open,
  });

  const availableStaff = (staff?.items ?? []).filter((u) => u.role !== 'CUSTOMER' && !alreadyAssignedUserIds.includes(u.id));

  function reset() {
    setSelectedUserIds([]);
    setResponsibility('');
    setStartDate('');
    setEndDate('');
    setNotes('');
    setSearch('');
  }

  const assignMutation = useMutation({
    mutationFn: () =>
      api.post<ProjectStaffAssignment[]>(`/projects/${projectId}/staff`, {
        userIds: selectedUserIds,
        responsibility,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({ title: 'Staff assigned to Project' });
      reset();
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Could not assign staff',
        description: error instanceof ApiError ? error.message : undefined,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" /> Assign Staff
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Staff to Project</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label>Staff Members</Label>
            <Input placeholder="Search staff by name, email, or Employee ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {availableStaff.length === 0 && <p className="p-2 text-sm text-muted-foreground">No available staff found.</p>}
              {availableStaff.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60">
                  <Checkbox
                    checked={selectedUserIds.includes(u.id)}
                    onCheckedChange={(checked) =>
                      setSelectedUserIds((prev) => (checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)))
                    }
                  />
                  <span className="flex-1">{u.fullName}</span>
                  <span className="text-xs text-muted-foreground">{u.role.replaceAll('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Responsibility</Label>
            <Select value={responsibility} onValueChange={(v) => setResponsibility(v as StaffResponsibility)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a responsibility" />
              </SelectTrigger>
              <SelectContent>
                {RESPONSIBILITIES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {responsibilityLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={selectedUserIds.length === 0 || !responsibility || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            <Plus className="mr-2 h-4 w-4" /> Assign {selectedUserIds.length > 1 ? `${selectedUserIds.length} Staff` : 'Staff'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditStaffAssignmentDialog({
  projectId,
  assignment,
  open,
  onOpenChange,
}: {
  projectId: string;
  assignment: ProjectStaffAssignment;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [responsibility, setResponsibility] = React.useState<StaffResponsibility>(assignment.responsibility);
  const [startDate, setStartDate] = React.useState(assignment.startDate?.slice(0, 10) ?? '');
  const [endDate, setEndDate] = React.useState(assignment.endDate?.slice(0, 10) ?? '');
  const [notes, setNotes] = React.useState(assignment.notes ?? '');

  React.useEffect(() => {
    setResponsibility(assignment.responsibility);
    setStartDate(assignment.startDate?.slice(0, 10) ?? '');
    setEndDate(assignment.endDate?.slice(0, 10) ?? '');
    setNotes(assignment.notes ?? '');
  }, [assignment]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/projects/${projectId}/staff/${assignment.id}`, {
        responsibility,
        startDate: startDate || null,
        endDate: endDate || null,
        notes: notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({ title: 'Staff assignment updated' });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Could not update assignment',
        description: error instanceof ApiError ? error.message : undefined,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Staff Assignment — {assignment.user.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Responsibility</Label>
            <Select value={responsibility} onValueChange={(v) => setResponsibility(v as StaffResponsibility)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESPONSIBILITIES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {responsibilityLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignedStaffCard({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingAssignment, setEditingAssignment] = React.useState<ProjectStaffAssignment | null>(null);
  const [removingAssignment, setRemovingAssignment] = React.useState<ProjectStaffAssignment | null>(null);

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) => api.del(`/projects/${project.id}/staff/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      toast({ title: 'Staff removed from Project' });
      setRemovingAssignment(null);
    },
    onError: (error) => {
      toast({
        title: 'Could not remove staff',
        description: error instanceof ApiError ? error.message : undefined,
        variant: 'destructive',
      });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Assigned Staff</CardTitle>
        <AssignStaffDialog projectId={project.id} alreadyAssignedUserIds={project.staffAssignments.map((a) => a.userId)} />
      </CardHeader>
      <CardContent>
        {project.staffAssignments.length === 0 ? (
          <EmptyState title="No staff assigned yet" description="Use Assign Staff to add technicians, supervisors, or other crew to this Project." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Responsibility</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Start — End</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.staffAssignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.user.fullName}</TableCell>
                  <TableCell>{a.user.employeeId ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{responsibilityLabel(a.responsibility)}</Badge>
                  </TableCell>
                  <TableCell>{a.user.phone ?? '—'}</TableCell>
                  <TableCell>{a.user.department ?? '—'}</TableCell>
                  <TableCell>
                    {a.startDate ? new Date(a.startDate).toLocaleDateString() : '—'}
                    {' — '}
                    {a.endDate ? new Date(a.endDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" title="Edit" onClick={() => setEditingAssignment(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Remove" onClick={() => setRemovingAssignment(a)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {editingAssignment && (
        <EditStaffAssignmentDialog
          projectId={project.id}
          assignment={editingAssignment}
          open={!!editingAssignment}
          onOpenChange={(v) => !v && setEditingAssignment(null)}
        />
      )}

      <AlertDialog open={!!removingAssignment} onOpenChange={(v) => !v && setRemovingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removingAssignment?.user.fullName} from this Project?</AlertDialogTitle>
            <AlertDialogDescription>This staff member will no longer be assigned to this Project. You can re-assign them later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => removingAssignment && removeMutation.mutate(removingAssignment.id)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<Project>(`/projects/${id}`),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!project) return <EmptyState title="Project not found" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project.projectNo}</h1>
          <p className="text-sm text-muted-foreground">{project.customer.fullName}</p>
        </div>
        <Badge variant={STATUS_VARIANT[project.status]} className="text-sm">
          {project.status.replaceAll('_', ' ')}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Customer" value={project.customer.fullName} />
          <Field label="Project Manager" value={project.projectManager?.fullName} />
          <Field label="Completion" value={`${Number(project.completionPercent)}%`} />
          <Field label="Start Date" value={project.startDate ? new Date(project.startDate).toLocaleDateString() : undefined} />
          <Field label="Target End Date" value={project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString() : undefined} />
          <Field label="Actual End Date" value={project.actualEndDate ? new Date(project.actualEndDate).toLocaleDateString() : undefined} />
        </CardContent>
      </Card>

      <AssignedStaffCard project={project} />
    </div>
  );
}
