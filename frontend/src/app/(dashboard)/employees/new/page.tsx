import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployeeForm } from '@/components/employees/employee-form';

export default function NewEmployeePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">New Employee</h1>
      <Card>
        <CardHeader>
          <CardTitle>Employee Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeForm />
        </CardContent>
      </Card>
    </div>
  );
}
