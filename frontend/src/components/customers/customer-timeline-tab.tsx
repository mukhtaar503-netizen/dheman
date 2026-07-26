import { EmptyState } from '@/components/empty-state';
import type { CustomerTimelineEvent } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  CUSTOMER_REGISTERED: 'Customer Registered',
  ADDRESS_ADDED: 'Address Added',
  SERVICE_REQUEST_CREATED: 'Service Request Created',
  QUOTATION_CREATED: 'Quotation Created',
  PROJECT_CREATED: 'Project Created',
  INVOICE_GENERATED: 'Invoice Generated',
  PAYMENT_RECEIVED: 'Payment Received',
  DOCUMENT_UPLOADED: 'Document Uploaded',
  NOTE_ADDED: 'Note Added',
  PROFILE_UPDATE: 'Profile Updated',
  PROFILE_DEACTIVATE: 'Customer Deactivated',
  PROFILE_DELETE: 'Customer Deleted',
  PROFILE_RESTORE: 'Customer Restored',
  LOGIN_ACTIVITY: 'Portal Login',
};

export function CustomerTimelineTab({ events }: { events: CustomerTimelineEvent[] }) {
  if (events.length === 0) return <EmptyState title="No activity yet" />;

  return (
    <ol className="relative space-y-4 border-l border-border pl-4">
      {events.map((event, i) => (
        <li key={`${event.type}-${event.at}-${i}`} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
          <p className="text-sm font-medium">{TYPE_LABELS[event.type] ?? event.type}</p>
          <p className="text-xs text-muted-foreground">{event.message}</p>
          <p className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString()}</p>
        </li>
      ))}
    </ol>
  );
}
