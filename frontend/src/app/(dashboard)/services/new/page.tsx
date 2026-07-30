import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceForm } from '@/components/services/service-form';

export default function NewServicePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New Service</h1>
      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm />
        </CardContent>
      </Card>
    </div>
  );
}
