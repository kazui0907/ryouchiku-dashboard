"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicForm } from "@/components/forms/dynamic-form";
import { useToast } from "@/hooks/use-toast";

interface Field {
  id: string;
  apiName: string;
  label: string;
  dataType: string;
  isRequired: boolean;
  isUnique: boolean;
  defaultValue: string | null;
  length: number | null;
  precision: number | null;
  scale: number | null;
  picklistValues: any[] | null;
  referenceObjectId: string | null;
  referenceObject?: {
    id: string;
    apiName: string;
    label: string;
  } | null;
  description: string | null;
  helpText: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface ObjectDefinition {
  id: string;
  apiName: string;
  label: string;
  pluralLabel: string;
  fields: Field[];
}

interface CustomRecord {
  id: string;
  name: string;
  data: Record<string, any>;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  object: ObjectDefinition;
  createdAt: string;
  updatedAt: string;
}

export default function EditCustomRecordPage({
  params,
}: {
  params: Promise<{ objectId: string; recordId: string }>;
}) {
  const { objectId, recordId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [record, setRecord] = useState<CustomRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRecord();
  }, [objectId, recordId]);

  const fetchRecord = async () => {
    try {
      const res = await fetch(`/api/records/${objectId}/${recordId}`);
      if (res.ok) {
        const data = await res.json();
        setRecord(data);
      } else {
        toast({
          title: "エラー",
          description: "レコードの取得に失敗しました",
          variant: "destructive",
        });
        router.push(`/custom/${objectId}`);
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "レコードの取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: Record<string, any>) => {
    setSaving(true);

    try {
      const res = await fetch(`/api/records/${objectId}/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({
          title: "成功",
          description: `${record?.object.label}を更新しました`,
        });
        router.push(`/custom/${objectId}/${recordId}`);
      } else {
        const data = await res.json();
        toast({
          title: "エラー",
          description: data.error || "更新に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!record) {
    return null;
  }

  // 初期データを作成（Nameフィールドも含める）
  const initialData: Record<string, any> = {
    Name: record.name,
    ...record.data,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/custom/${objectId}/${recordId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {record.name}を編集
          </h1>
          <p className="text-muted-foreground">{record.object.label}</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{record.object.label}情報</CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicForm
            fields={record.object.fields}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/custom/${objectId}/${recordId}`)}
            loading={saving}
            submitLabel="変更を保存"
          />
        </CardContent>
      </Card>
    </div>
  );
}
