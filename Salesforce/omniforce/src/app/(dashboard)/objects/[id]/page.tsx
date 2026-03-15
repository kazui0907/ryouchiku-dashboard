"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  isRequired: boolean;
  isUnique: boolean;
  sortOrder: number;
  description: string | null;
  referenceObject?: {
    id: string;
    apiName: string;
    label: string;
  } | null;
}

interface ObjectDefinition {
  id: string;
  apiName: string;
  label: string;
  pluralLabel: string;
  description: string | null;
  iconName: string | null;
  isCustom: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fields: Field[];
  _count: {
    records: number;
  };
}

interface DataType {
  value: string;
  label: string;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  Text: "テキスト",
  TextArea: "テキストエリア",
  RichText: "リッチテキスト",
  Number: "数値",
  Currency: "通貨",
  Percent: "パーセント",
  Date: "日付",
  DateTime: "日時",
  Checkbox: "チェックボックス",
  Picklist: "選択リスト",
  MultiPicklist: "複数選択リスト",
  Email: "メール",
  Phone: "電話",
  URL: "URL",
  Lookup: "参照関係",
};

export default function ObjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [object, setObject] = useState<ObjectDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchObject();
  }, [id]);

  const fetchObject = async () => {
    try {
      const res = await fetch(`/api/objects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setObject(data);
      } else {
        toast({
          title: "エラー",
          description: "オブジェクトの取得に失敗しました",
          variant: "destructive",
        });
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

  const handleDeleteField = async () => {
    if (!deleteFieldId) return;

    try {
      const res = await fetch(`/api/objects/${id}/fields/${deleteFieldId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({
          title: "成功",
          description: "フィールドを削除しました",
        });
        fetchObject();
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
      setDeleteFieldId(null);
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
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">オブジェクトが見つかりません</p>
        <Link href="/objects">
          <Button>オブジェクト一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/objects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{object.label}</h1>
              <Badge variant={object.isActive ? "default" : "secondary"}>
                {object.isActive ? "有効" : "無効"}
              </Badge>
              {!object.isCustom && <Badge variant="outline">標準</Badge>}
            </div>
            <p className="text-muted-foreground font-mono text-sm">
              {object.apiName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {object.isCustom && (
            <Link href={`/objects/${id}/edit`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                編集
              </Button>
            </Link>
          )}
          <Link href={`/custom/${id}`}>
            <Button>レコードを表示</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields">フィールド</TabsTrigger>
          <TabsTrigger value="details">詳細</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {object.fields.length} 件のフィールド
            </p>
            <Link href={`/objects/${id}/fields/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規フィールド
              </Button>
            </Link>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>表示ラベル</TableHead>
                  <TableHead>API名</TableHead>
                  <TableHead>データ型</TableHead>
                  <TableHead>必須</TableHead>
                  <TableHead>一意</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {object.fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell className="font-mono text-sm">{field.apiName}</TableCell>
                    <TableCell>
                      {DATA_TYPE_LABELS[field.dataType] || field.dataType}
                      {field.referenceObject && (
                        <span className="text-muted-foreground ml-1">
                          → {field.referenceObject.label}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {field.isRequired && <Badge variant="secondary">必須</Badge>}
                    </TableCell>
                    <TableCell>
                      {field.isUnique && <Badge variant="outline">一意</Badge>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/objects/${id}/fields/${field.id}`)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            編集
                          </DropdownMenuItem>
                          {field.apiName !== "Name" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteFieldId(field.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              削除
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>オブジェクト詳細</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">表示ラベル</p>
                  <p>{object.label}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">複数形ラベル</p>
                  <p>{object.pluralLabel}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">API名</p>
                  <p className="font-mono">{object.apiName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">レコード数</p>
                  <p>{object._count.records}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">説明</p>
                  <p>{object.description || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">作成日時</p>
                  <p>{new Date(object.createdAt).toLocaleString("ja-JP")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">更新日時</p>
                  <p>{new Date(object.updatedAt).toLocaleString("ja-JP")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteFieldId} onOpenChange={() => setDeleteFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>フィールドを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。フィールドとそのデータが削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteField} className="bg-destructive text-destructive-foreground">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
