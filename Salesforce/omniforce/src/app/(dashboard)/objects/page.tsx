"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Settings, Database, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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
  _count: {
    fields: number;
    records: number;
  };
}

export default function ObjectsPage() {
  const router = useRouter();
  const [objects, setObjects] = useState<ObjectDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchObjects();
  }, []);

  const fetchObjects = async () => {
    try {
      const res = await fetch("/api/objects?includeStandard=true&limit=100");
      if (res.ok) {
        const data = await res.json();
        setObjects(data.data);
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

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/objects/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast({
          title: "成功",
          description: "オブジェクトを削除しました",
        });
        fetchObjects();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const customObjects = objects.filter((o) => o.isCustom);
  const standardObjects = objects.filter((o) => !o.isCustom);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">オブジェクトマネージャー</h1>
          <p className="text-muted-foreground">
            カスタムオブジェクトとフィールドを管理します
          </p>
        </div>
        <Link href="/objects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規オブジェクト
          </Button>
        </Link>
      </div>

      {/* カスタムオブジェクト */}
      <div>
        <h2 className="text-xl font-semibold mb-4">カスタムオブジェクト</h2>
        {customObjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                カスタムオブジェクトがまだありません
              </p>
              <Link href="/objects/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  最初のオブジェクトを作成
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customObjects.map((obj) => (
              <Card key={obj.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{obj.label}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {obj.apiName}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/objects/${obj.id}`)}>
                        <Settings className="mr-2 h-4 w-4" />
                        設定
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/objects/${obj.id}/edit`)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        編集
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(obj.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {obj.description || "説明なし"}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="font-medium">{obj._count.fields}</span>
                      <span className="text-muted-foreground ml-1">フィールド</span>
                    </div>
                    <div>
                      <span className="font-medium">{obj._count.records}</span>
                      <span className="text-muted-foreground ml-1">レコード</span>
                    </div>
                    <Badge variant={obj.isActive ? "default" : "secondary"}>
                      {obj.isActive ? "有効" : "無効"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 標準オブジェクト */}
      {standardObjects.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">標準オブジェクト</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {standardObjects.map((obj) => (
              <Card key={obj.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{obj.label}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {obj.apiName}
                    </CardDescription>
                  </div>
                  <Link href={`/objects/${obj.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {obj.description || "説明なし"}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="font-medium">{obj._count.fields}</span>
                      <span className="text-muted-foreground ml-1">フィールド</span>
                    </div>
                    <div>
                      <span className="font-medium">{obj._count.records}</span>
                      <span className="text-muted-foreground ml-1">レコード</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>オブジェクトを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。オブジェクトと関連するすべてのフィールド、レコードが削除されます。
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
