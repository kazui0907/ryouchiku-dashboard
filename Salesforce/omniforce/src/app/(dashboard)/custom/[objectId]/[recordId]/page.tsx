"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Field {
  id: string;
  apiName: string;
  label: string;
  dataType: string;
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

export default function CustomRecordDetailPage({
  params,
}: {
  params: Promise<{ objectId: string; recordId: string }>;
}) {
  const { objectId, recordId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [record, setRecord] = useState<CustomRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);

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

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/records/${objectId}/${recordId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({
          title: "成功",
          description: "レコードを削除しました",
        });
        router.push(`/custom/${objectId}`);
      } else {
        const data = await res.json();
        toast({
          title: "エラー",
          description: data.error || "削除に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setShowDelete(false);
    }
  };

  const formatValue = (value: any, dataType: string) => {
    if (value === null || value === undefined || value === "") return "-";
    switch (dataType) {
      case "Date":
        return new Date(value).toLocaleDateString("ja-JP");
      case "DateTime":
        return new Date(value).toLocaleString("ja-JP");
      case "Checkbox":
        return value ? "はい" : "いいえ";
      case "Currency":
        return `¥${Number(value).toLocaleString()}`;
      case "Percent":
        return `${value}%`;
      case "MultiPicklist":
        return value.split(";").join(", ");
      default:
        return String(value);
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

  const activeFields = record.object.fields
    .filter((f) => f.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/custom/${objectId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{record.name}</h1>
            </div>
            <p className="text-muted-foreground">{record.object.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/custom/${objectId}/${recordId}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              編集
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setShowDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            削除
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>詳細</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeFields.map((field) => {
              const value = field.apiName === "Name" ? record.name : record.data[field.apiName];
              return (
                <div key={field.id}>
                  <p className="text-sm font-medium text-muted-foreground">
                    {field.label}
                  </p>
                  <p className="mt-1">{formatValue(value, field.dataType)}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>システム情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">所有者</p>
              <p className="mt-1">{record.owner.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">作成日時</p>
              <p className="mt-1">{new Date(record.createdAt).toLocaleString("ja-JP")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">更新日時</p>
              <p className="mt-1">{new Date(record.updatedAt).toLocaleString("ja-JP")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>レコードを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{record.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
