import type { CustomerDetail } from '@/types';

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

export function CustomerOverviewTab({ customer }: { customer: CustomerDetail }) {
  const defaultAddress = customer.siteAddresses?.find((a) => a.isDefault) ?? customer.siteAddresses?.[0];
  const primaryContact = customer.contacts.find((c) => c.isPrimary) ?? customer.contacts[0];

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium">Personal / Business Information</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Customer type" value={customer.type === 'CORPORATE' ? 'Business' : 'Individual'} />
          <Field label="Company" value={customer.companyName} />
          <Field label="National ID / Tax ID" value={customer.nationalId} />
          <Field label="Gender" value={customer.gender} />
          <Field label="Date of birth" value={customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString() : undefined} />
          <Field label="Source" value={customer.source} />
          <Field label="Assigned technician" value={customer.assignedTechnician?.fullName} />
          <Field label="Registered" value={new Date(customer.createdAt).toLocaleDateString()} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium">Contact Information</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" value={customer.phone} />
          <Field label="Alternative phone" value={customer.alternatePhone} />
          <Field label="Email" value={customer.email} />
          <Field label="Preferred contact method" value={customer.preferredContactMethod} />
          <Field label="Primary contact" value={primaryContact?.name} />
          <Field label="Primary contact phone" value={primaryContact?.phone} />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4 sm:col-span-2">
        <h3 className="text-sm font-medium">Default Address</h3>
        {defaultAddress ? (
          <p className="text-sm">
            {defaultAddress.label} — {defaultAddress.addressLine}
            {[defaultAddress.city, defaultAddress.region, defaultAddress.country].filter(Boolean).length > 0 &&
              `, ${[defaultAddress.city, defaultAddress.region, defaultAddress.country].filter(Boolean).join(', ')}`}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No address on file</p>
        )}
      </section>

      <section className="grid grid-cols-3 gap-3 sm:col-span-2">
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-semibold">{customer.stats.projectsCurrentCount}</p>
          <p className="text-xs text-muted-foreground">Active Projects</p>
        </div>
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-semibold">{customer.stats.projectsCompletedCount}</p>
          <p className="text-xs text-muted-foreground">Completed Projects</p>
        </div>
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-semibold">{customer.quotations.length}</p>
          <p className="text-xs text-muted-foreground">Quotations</p>
        </div>
      </section>
    </div>
  );
}
