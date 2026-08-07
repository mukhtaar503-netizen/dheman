'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import type { PaginatedResult } from '@/types';

interface ProjectRow {
  id: string;
  projectNo: string;
  status: string;
  completionPercent: string | number;
  customer: { fullName: string };
  projectManager?: { fullName: string } | null;
}

function ProjectsList() {
  const router = useRouter();
  const status = useSearchParams().get('status') ?? undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['projects', status],
    queryFn: () => api.get<PaginatedResult<ProjectRow>>(`/projects?page=1&pageSize=20${status ? `&status=${status}` : ''}`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {data ? `${data.total} projects` : 'Projects'}
          {status ? ` — ${status.replaceAll('_', ' ')}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {data && data.items.length === 0 && <EmptyState title="No projects found" />}
        {data && data.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                  <TableCell className="font-medium">{p.projectNo}</TableCell>
                  <TableCell>{p.customer.fullName}</TableCell>
                  <TableCell>{p.projectManager?.fullName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.status.replaceAll('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>{Number(p.completionPercent)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProjectsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Projects</h1>
      <React.Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <ProjectsList />
      </React.Suspense>
    </div>
  );
}
