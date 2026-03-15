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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ObjectDefinition {
  id: string;
  apiName: string;
  label: string;
}

interface PicklistValue {
  value: string;
  label: string;
  isDefault?: boolean;
}

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
  picklistValues: PicklistValue[] | null;
  referenceObjectId: string | null;
  description: string | null;
  helpText: string | null;
  sortOrder: number;
  isActive: boolean;
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

const DATA_TYPE_CONFIG: Record<string, { hasLength?: boolean; hasPrecision?: boolean; hasPicklist?: boolean; hasReference?: boolean }> = {
  Text: { hasLength: true },
  TextArea: { hasLength: true },
  Number: { hasPrecision: true },
  Currency: { hasPrecision: true },
  Percent: { hasPrecision: true },
  Picklist: { hasPicklist: true },
  MultiPicklist: { hasPicklist: true },
  Lookup: { hasReference: true },
};

export default function EditFieldPage({
  params,
}: {
  params: Promise<{ id: string; fieldId: string }>;
}) {
  const { id, fieldId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [field, setField] = useState<Field | null>(null);
  const [objects, setObjects] = useState<ObjectDefinition[]>([]);
  const [formData, setFormData] = useState({
    label: "",
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
    isActive: true,
  });
  const [picklistText, setPicklistText] = useState("");

  useEffect(() => {
    fetchData();
  }, [id, fieldId]);

  const fetchData = async () => {
    try {
      const [fieldRes, objectsRes] = await Promise.all([
        fetch(`/api/objects/${id}/fields/${fieldId}`),
        fetch("/api/objects?includeStandard=true&limit=100"),
      ]);

      if (fieldRes.ok) {
        const data: Field = await fieldRes.json();
        setField(data);
        setFormData({
          label: data.label,
          isRequired: data.isRequired,
          isUnique: data.isUnique,
          defaultValue: data.defaultValue || "",
          length: data.length || 255,
          precision: data.precision || 18,
          scale: data.scale || 2,
          picklistValues: data.picklistValues || [],
          referenceObjectId: data.referenceObjectId || "",
          description: data.description || "",
          helpText: data.helpText || "",
          isActive: data.isActive,
        });
        if (data.picklistValues) {
          setPicklistText(data.picklistValues.map((v) => v.label).join("\n"));
        }
      } else {
        toast({
          title: "エラー",
          description: "フィールドの取得に失敗しました",
          variant: "destructive",
        });
        router.push(`/objects/${id}`);
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
    if (!field) return;
    setSaving(true);

    const typeConfig = DATA_TYPE_CONFIG[field.dataType] || {};
    const payload: any = {
      label: formData.label,
      description: formData.description || undefined,
      helpText: formData.helpText || undefined,
      isActive: formData.isActive,
    };

    // Nameフィールド以外は追加の属性を更新可能
    if (field.apiName !== "Name") {
      payload.isRequired = formData.isRequired;
      payload.isUnique = formData.isUnique;
      if (formData.defaultValue) {
        payload.defaultValue = formData.defaultValue;
      }
      if (typeConfig.hasLength) {
        payload.length = formData.length;
      }
      if (typeConfig.hasPrecision) {
        payload.precision = formData.precision;
        payload.scale = formData.scale;
      }
      if (typeConfig.hasPicklist) {
        payload.picklistValues = parsePicklistValues(picklistText);
      }
      if (typeConfig.hasReference) {
        payload.referenceObjectId = formData.referenceObjectId;
      }
    }

    try {
      const res = await fetch(`/api/objects/${id}/fields/${fieldId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: "成功",
          description: "フィールドを更新しました",
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

  if (!field) {
    return null;
  }

  const typeConfig = DATA_TYPE_CONFIG[field.dataType] || {};
  const isNameField = field.apiName === "Name";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/objects/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">フィールドを編集</h1>
            {isNameField && <Badge>システムフィールド</Badge>}
          </div>
          <p className="text-muted-foreground font-mono text-sm">
            {field.apiName}
          </p>
        </div>
      </div>

      {isNameField && (
        <div className="bg-muted p-4 rounded-lg text-sm">
          名前フィールドはシステムフィールドのため、表示ラベル、説明、ヘルプテキストのみ編集できます。
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>データ型</Label>
              <p className="text-sm">{DATA_TYPE_LABELS[field.dataType] || field.dataType}</p>
            </div>

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
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="helpText">ヘルプテキスト</Label>
              <Textarea
                id="helpText"
                value={formData.helpText}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, helpText: e.target.value }))
                }
                placeholder="入力時に表示されるヒント"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* データ型固有の設定 */}
        {typeConfig.hasLength && !isNameField && (
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

        {typeConfig.hasPrecision && !isNameField && (
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

        {typeConfig.hasPicklist && !isNameField && (
          <Card>
            <CardHeader>
              <CardTitle>選択肢設定</CardTitle>
              <CardDescription>
                1行に1つの選択肢を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={picklistText}
                onChange={(e) => setPicklistText(e.target.value)}
                rows={6}
              />
            </CardContent>
          </Card>
        )}

        {typeConfig.hasReference && !isNameField && (
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

        {!isNameField && (
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
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">有効</Label>
                  <p className="text-xs text-muted-foreground">
                    無効にするとフィールドが非表示になります
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
            </CardContent>
          </Card>
        )}

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
    </div>
  );
}
