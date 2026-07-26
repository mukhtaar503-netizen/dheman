import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';

interface ProjectRow {
  id: string;
  projectNo: string;
  status: string;
  completionPercent: number;
  createdAt: string;
}

function ProjectsTable({ title, projects }: { title: string; projects: ProjectRow[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        {title} ({projects.length})
      </h3>
      {projects.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} projects`} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Completion</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/projects/${p.id}`} className="hover:underline">
                    {p.projectNo}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{p.status}</Badge>
                </TableCell>
                <TableCell>{Number(p.completionPercent)}%</TableCell>
                <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export function CustomerProjectsTab({
  current,
  completed,
  cancelled,
}: {
  current: ProjectRow[];
  completed: ProjectRow[];
  cancelled: ProjectRow[];
}) {
  return (
    <div className="space-y-6">
      <ProjectsTable title="Current" projects={current} />
      <ProjectsTable title="Completed" projects={completed} />
      <ProjectsTable title="Cancelled" projects={cancelled} />
    </div>
  );
}
