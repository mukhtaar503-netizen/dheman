'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';

interface TechnicianRow {
  id: string;
  skills: string[];
  status: string;
  currentWorkload: number;
  user: { id: string; fullName: string; email: string; phone?: string | null };
}

export default function TechniciansPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => api.get<TechnicianRow[]>('/technicians'),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Technicians</h1>
      <Card>
        <CardHeader>
          <CardTitle>{data ? `${data.length} technicians` : 'Technicians'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-40 w-full" />}
          {data && data.length === 0 && <EmptyState title="No technicians found" />}
          {data && data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Workload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.user.fullName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {t.skills.length === 0 ? <span className="text-muted-foreground">—</span> : t.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'ACTIVE' ? 'success' : 'secondary'}>{t.status.replaceAll('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>{t.currentWorkload}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
