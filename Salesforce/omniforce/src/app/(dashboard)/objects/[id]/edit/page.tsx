"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
}

export default function EditObjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    pluralLabel: "",
    description: "",
    iconName: "",
    isActive: true,
  });

  useEffect(() => {
    fetchObject();
  }, [id]);

  const fetchObject = async () => {
    try {
      const res = await fetch(`/api/objects/${id}`);
      if (res.ok) {
        const data: ObjectDefinition = await res.json();
        setFormData({
          label: data.label,
          pluralLabel: data.pluralLabel,
          description: data.description || "",
          iconName: data.iconName || "",
          isActive: data.isActive,
        });
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
      router.push("/objects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/objects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({
          title: "成功",
          description: "オブジェクトを更新しました",
        });
        router.push(`/objects/${id}`);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/objects/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">オブジェクトを編集</h1>
          <p className="text-muted-foreground">
            オブジェクトの設定を変更します
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>オブジェクト情報</CardTitle>
          <CardDescription>
            オブジェクトの基本情報を編集してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="label">表示ラベル *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, label: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pluralLabel">複数形ラベル *</Label>
              <Input
                id="pluralLabel"
                value={formData.pluralLabel}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, pluralLabel: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">有効</Label>
                <p className="text-xs text-muted-foreground">
                  無効にするとオブジェクトが使用できなくなります
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? "保存中..." : "変更を保存"}
              </Button>
              <Link href={`/objects/${id}`}>
                <Button type="button" variant="outline">
                  キャンセル
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
