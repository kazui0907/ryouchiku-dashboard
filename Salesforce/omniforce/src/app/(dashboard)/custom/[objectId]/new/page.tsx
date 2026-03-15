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

export default function NewCustomRecordPage({
  params,
}: {
  params: Promise<{ objectId: string }>;
}) {
  const { objectId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [object, setObject] = useState<ObjectDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchObject();
  }, [objectId]);

  const fetchObject = async () => {
    try {
      const res = await fetch(`/api/objects/${objectId}`);
      if (res.ok) {
        const data = await res.json();
        setObject(data);
      } else {
        toast({
          title: "エラー",
          description: "オブジェクトの取得に失敗しました",
          variant: "destructive",
        });
        router.push("/objects");
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "オブジェクトの取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: Record<string, any>) => {
    setSaving(true);

    try {
      const res = await fetch(`/api/records/${objectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "成功",
          description: `${object?.label}を作成しました`,
        });
        router.push(`/custom/${objectId}/${data.id}`);
      } else {
        const data = await res.json();
        toast({
          title: "エラー",
          description: data.error || "作成に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "作成に失敗しました",
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

  if (!object) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/custom/${objectId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            新規{object.label}
          </h1>
          <p className="text-muted-foreground">
            {object.label}の新しいレコードを作成します
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{object.label}情報</CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicForm
            fields={object.fields}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/custom/${objectId}`)}
            loading={saving}
            submitLabel={`${object.label}を作成`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
