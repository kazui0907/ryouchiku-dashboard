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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ObjectDefinition {
  id: string;
  apiName: string;
  label: string;
}

interface PicklistValue {
  value: string;
  label: string;
  isDefault: boolean;
}

const DATA_TYPES = [
  { value: "Text", label: "テキスト", hasLength: true },
  { value: "TextArea", label: "テキストエリア", hasLength: true },
  { value: "RichText", label: "リッチテキスト" },
  { value: "Number", label: "数値", hasPrecision: true },
  { value: "Currency", label: "通貨", hasPrecision: true },
  { value: "Percent", label: "パーセント", hasPrecision: true },
  { value: "Date", label: "日付" },
  { value: "DateTime", label: "日時" },
  { value: "Checkbox", label: "チェックボックス" },
  { value: "Picklist", label: "選択リスト", hasPicklist: true },
  { value: "MultiPicklist", label: "複数選択リスト", hasPicklist: true },
  { value: "Email", label: "メール" },
  { value: "Phone", label: "電話" },
  { value: "URL", label: "URL" },
  { value: "Lookup", label: "参照関係", hasReference: true },
];

export default function NewFieldPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [object, setObject] = useState<ObjectDefinition | null>(null);
  const [objects, setObjects] = useState<ObjectDefinition[]>([]);
  const [formData, setFormData] = useState({
    apiName: "",
    label: "",
    dataType: "Text",
    isRequired: false,
    isUnique: false,
    defaultValue: "",
    length: 255,
    precision: 18,
    scale: 2,
    picklistValues: [] as PicklistValue[],
    referenceObjectId: "",
    description: "",
    helpText: "",
  });
  const [picklistText, setPicklistText] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [objRes, objectsRes] = await Promise.all([
        fetch(`/api/objects/${id}`),
        fetch("/api/objects?includeStandard=true&limit=100"),
      ]);

      if (objRes.ok) {
        const data = await objRes.json();
        setObject(data);
      }

      if (objectsRes.ok) {
        const data = await objectsRes.json();
        setObjects(data.data);
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "データの取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateApiName = (label: string) => {
    const romanized = label
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    return romanized || "";
  };

  const handleLabelChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      label: value,
      apiName: prev.apiName || generateApiName(value),
    }));
  };

  const parsePicklistValues = (text: string): PicklistValue[] => {
    return text
      .split("\n")
      .filter((line) => line.trim())
      .map((line, index) => ({
        value: line.trim(),
        label: line.trim(),
        isDefault: index === 0,
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const selectedType = DATA_TYPES.find((t) => t.value === formData.dataType);
    const payload: any = {
      apiName: formData.apiName,
      label: formData.label,
      dataType: formData.dataType,
      isRequired: formData.isRequired,
      isUnique: formData.isUnique,
      description: formData.description || undefined,
      helpText: formData.helpText || undefined,
    };

    if (selectedType?.hasLength) {
      payload.length = formData.length;
    }
    if (selectedType?.hasPrecision) {
      payload.precision = formData.precision;
      payload.scale = formData.scale;
    }
    if (selectedType?.hasPicklist) {
      payload.picklistValues = parsePicklistValues(picklistText);
    }
    if (selectedType?.hasReference) {
      payload.referenceObjectId = formData.referenceObjectId;
    }
    if (formData.defaultValue) {
      payload.defaultValue = formData.defaultValue;
    }

    try {
      const res = await fetch(`/api/objects/${id}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: "成功",
          description: "フィールドを作成しました",
        });
        router.push(`/objects/${id}`);
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

  const selectedType = DATA_TYPES.find((t) => t.value === formData.dataType);

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
          <h1 className="text-3xl font-bold tracking-tight">新規フィールド</h1>
          <p className="text-muted-foreground">
            {object?.label} に新しいフィールドを追加します
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>フィールドの基本設定を入力してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">表示ラベル *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="例: ステータス"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiName">API名 *</Label>
              <Input
                id="apiName"
                value={formData.apiName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, apiName: e.target.value }))
                }
                placeholder="例: Status__c"
                pattern="^[A-Za-z][A-Za-z0-9_]*(__c)?$"
                required
              />
              <p className="text-xs text-muted-foreground">
                英字で始まる必要があります
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataType">データ型 *</Label>
              <Select
                value={formData.dataType}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, dataType: value || "Text" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="このフィールドの用途を説明してください"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* データ型固有の設定 */}
        {selectedType?.hasLength && (
          <Card>
            <CardHeader>
              <CardTitle>テキスト設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="length">最大文字数</Label>
                <Input
                  id="length"
                  type="number"
                  value={formData.length}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, length: parseInt(e.target.value) || 255 }))
                  }
                  min={1}
                  max={32000}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {selectedType?.hasPrecision && (
          <Card>
            <CardHeader>
              <CardTitle>数値設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="precision">桁数（精度）</Label>
                <Input
                  id="precision"
                  type="number"
                  value={formData.precision}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, precision: parseInt(e.target.value) || 18 }))
                  }
                  min={1}
                  max={18}
                />
                <p className="text-xs text-muted-foreground">
                  小数点を含む全体の桁数
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scale">小数点以下桁数</Label>
                <Input
                  id="scale"
                  type="number"
                  value={formData.scale}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, scale: parseInt(e.target.value) || 0 }))
                  }
                  min={0}
                  max={17}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {selectedType?.hasPicklist && (
          <Card>
            <CardHeader>
              <CardTitle>選択肢設定</CardTitle>
              <CardDescription>
                1行に1つの選択肢を入力してください。最初の選択肢がデフォルトになります。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={picklistText}
                onChange={(e) => setPicklistText(e.target.value)}
                placeholder="新規&#10;進行中&#10;完了&#10;中止"
                rows={6}
              />
            </CardContent>
          </Card>
        )}

        {selectedType?.hasReference && (
          <Card>
            <CardHeader>
              <CardTitle>参照設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="referenceObjectId">参照先オブジェクト</Label>
                <Select
                  value={formData.referenceObjectId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, referenceObjectId: value || "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="オブジェクトを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {objects.map((obj) => (
                      <SelectItem key={obj.id} value={obj.id}>
                        {obj.label} ({obj.apiName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>制約設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isRequired">必須</Label>
                <p className="text-xs text-muted-foreground">
                  このフィールドの入力を必須にします
                </p>
              </div>
              <Switch
                id="isRequired"
                checked={formData.isRequired}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isRequired: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isUnique">一意</Label>
                <p className="text-xs text-muted-foreground">
                  重複する値を許可しません
                </p>
              </div>
              <Switch
                id="isUnique"
                checked={formData.isUnique}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isUnique: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultValue">デフォルト値</Label>
              <Input
                id="defaultValue"
                value={formData.defaultValue}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, defaultValue: e.target.value }))
                }
                placeholder="デフォルト値を入力"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? "作成中..." : "フィールドを作成"}
          </Button>
          <Link href={`/objects/${id}`}>
            <Button type="button" variant="outline">
              キャンセル
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
