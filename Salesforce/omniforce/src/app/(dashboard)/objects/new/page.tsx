"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function NewObjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    pluralLabel: "",
    apiName: "",
    description: "",
    iconName: "database",
  });

  const generateApiName = (label: string) => {
    // 日本語をローマ字に変換する簡易関数（実際はより高度な変換が必要）
    const romanized = label
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    return romanized ? `${romanized}__c` : "";
  };

  const handleLabelChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      label: value,
      apiName: prev.apiName || generateApiName(value),
      pluralLabel: prev.pluralLabel || value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "成功",
          description: "オブジェクトを作成しました",
        });
        router.push(`/objects/${data.id}`);
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
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/objects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">新規カスタムオブジェクト</h1>
          <p className="text-muted-foreground">
            新しいカスタムオブジェクトを作成します
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>オブジェクト情報</CardTitle>
          <CardDescription>
            オブジェクトの基本情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="label">表示ラベル *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="例: プロジェクト"
                required
              />
              <p className="text-xs text-muted-foreground">
                ユーザーに表示される名前です
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pluralLabel">複数形ラベル *</Label>
              <Input
                id="pluralLabel"
                value={formData.pluralLabel}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, pluralLabel: e.target.value }))
                }
                placeholder="例: プロジェクト"
                required
              />
              <p className="text-xs text-muted-foreground">
                タブやリストで使用される複数形の名前です
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiName">API名 *</Label>
              <Input
                id="apiName"
                value={formData.apiName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, apiName: e.target.value }))
                }
                placeholder="例: Project__c"
                pattern="^[A-Za-z][A-Za-z0-9_]*__c$"
                required
              />
              <p className="text-xs text-muted-foreground">
                英字で始まり、__c で終わる必要があります（例: Project__c）
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="このオブジェクトの用途を説明してください"
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? "作成中..." : "オブジェクトを作成"}
              </Button>
              <Link href="/objects">
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
