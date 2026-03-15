"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Field {
  id: string;
  apiName: string;
  label: string;
  dataType: string;
  sortOrder: number;
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
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function CustomRecordsPage({
  params,
}: {
  params: Promise<{ objectId: string }>;
}) {
  const { objectId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [object, setObject] = useState<ObjectDefinition | null>(null);
  const [records, setRecords] = useState<CustomRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [objectId, search]);

  const fetchRecords = async () => {
    try {
      const params = new URLSearchParams({
        limit: "20",
        search,
      });
      const res = await fetch(`/api/records/${objectId}?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.data);
        setObject(data.object);
        setPagination(data.pagination);
      } else {
        toast({
          title: "エラー",
          description: "レコードの取得に失敗しました",
          variant: "destructive",
        });
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
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/records/${objectId}/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({
          title: "成功",
          description: "レコードを削除しました",
        });
        fetchRecords();
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
      setDeleteId(null);
    }
  };

  const formatValue = (value: any, dataType: string) => {
    if (value === null || value === undefined) return "-";
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

  // 表示するフィールド（最初の5つまで）
  const displayFields = object.fields
    .filter((f) => f.apiName !== "Name")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{object.pluralLabel}</h1>
          <p className="text-muted-foreground">
            {pagination?.total || 0} 件のレコード
          </p>
        </div>
        <Link href={`/custom/${objectId}/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規{object.label}
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              {displayFields.map((field) => (
                <TableHead key={field.id}>{field.label}</TableHead>
              ))}
              <TableHead>所有者</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={displayFields.length + 3}
                  className="text-center h-24 text-muted-foreground"
                >
                  レコードがありません
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <Link
                      href={`/custom/${objectId}/${record.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {record.name}
                    </Link>
                  </TableCell>
                  {displayFields.map((field) => (
                    <TableCell key={field.id}>
                      {formatValue(record.data[field.apiName], field.dataType)}
                    </TableCell>
                  ))}
                  <TableCell>{record.owner.name}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/custom/${objectId}/${record.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          表示
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/custom/${objectId}/${record.id}/edit`)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(record.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ページネーション */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => {
              /* TODO: implement pagination */
            }}
          >
            前へ
          </Button>
          <span className="text-sm">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => {
              /* TODO: implement pagination */
            }}
          >
            次へ
          </Button>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>レコードを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。
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
