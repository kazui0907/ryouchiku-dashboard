"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AccountForm } from "@/components/forms/account-form";
import { toast } from "sonner";

export default function EditAccountPage() {
  const router = useRouter();
  const params = useParams();
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await fetch(`/api/accounts/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setAccount(data);
        } else {
          toast.error("取引先が見つかりません");
          router.push("/accounts");
        }
      } catch (error) {
        toast.error("エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchAccount();
    }
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!account) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">取引先の編集</h1>
        <p className="text-muted-foreground">{account.name}</p>
      </div>
      <AccountForm initialData={account} />
    </div>
  );
}
