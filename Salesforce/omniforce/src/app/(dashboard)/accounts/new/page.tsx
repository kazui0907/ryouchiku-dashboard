import { AccountForm } from "@/components/forms/account-form";

export default function NewAccountPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">取引先の新規作成</h1>
        <p className="text-muted-foreground">新しい取引先を作成します</p>
      </div>
      <AccountForm />
    </div>
  );
}
