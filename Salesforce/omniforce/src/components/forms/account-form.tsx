"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const INDUSTRIES = [
  "農業",
  "建設",
  "製造業",
  "情報通信",
  "運輸・郵便",
  "卸売・小売",
  "金融・保険",
  "不動産",
  "専門・技術サービス",
  "教育",
  "医療・福祉",
  "サービス業",
  "その他",
];

const ACCOUNT_TYPES = [
  "見込み客",
  "顧客",
  "パートナー",
  "競合",
  "その他",
];

interface AccountFormProps {
  initialData?: any;
  onSuccess?: () => void;
}

export function AccountForm({ initialData, onSuccess }: AccountFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    industry: initialData?.industry || "",
    type: initialData?.type || "",
    phone: initialData?.phone || "",
    fax: initialData?.fax || "",
    website: initialData?.website || "",
    description: initialData?.description || "",
    billingStreet: initialData?.billingStreet || "",
    billingCity: initialData?.billingCity || "",
    billingState: initialData?.billingState || "",
    billingPostalCode: initialData?.billingPostalCode || "",
    billingCountry: initialData?.billingCountry || "",
    shippingStreet: initialData?.shippingStreet || "",
    shippingCity: initialData?.shippingCity || "",
    shippingState: initialData?.shippingState || "",
    shippingPostalCode: initialData?.shippingPostalCode || "",
    shippingCountry: initialData?.shippingCountry || "",
    annualRevenue: initialData?.annualRevenue || "",
    numberOfEmployees: initialData?.numberOfEmployees || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = initialData
        ? `/api/accounts/${initialData.id}`
        : "/api/accounts";
      const method = initialData ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : undefined,
          numberOfEmployees: formData.numberOfEmployees ? parseInt(formData.numberOfEmployees) : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "エラーが発生しました");
      }

      toast.success(initialData ? "取引先を更新しました" : "取引先を作成しました");
      onSuccess?.();
      router.push("/accounts");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">基本情報</TabsTrigger>
          <TabsTrigger value="address">住所情報</TabsTrigger>
          <TabsTrigger value="additional">追加情報</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">取引先名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">業種</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => handleChange("industry", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">種別</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleChange("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">電話番号</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fax">FAX</Label>
                  <Input
                    id="fax"
                    value={formData.fax}
                    onChange={(e) => handleChange("fax", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Webサイト</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>請求先住所</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="billingStreet">番地</Label>
                  <Input
                    id="billingStreet"
                    value={formData.billingStreet}
                    onChange={(e) => handleChange("billingStreet", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billingCity">市区町村</Label>
                    <Input
                      id="billingCity"
                      value={formData.billingCity}
                      onChange={(e) => handleChange("billingCity", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingState">都道府県</Label>
                    <Input
                      id="billingState"
                      value={formData.billingState}
                      onChange={(e) => handleChange("billingState", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billingPostalCode">郵便番号</Label>
                    <Input
                      id="billingPostalCode"
                      value={formData.billingPostalCode}
                      onChange={(e) => handleChange("billingPostalCode", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingCountry">国</Label>
                    <Input
                      id="billingCountry"
                      value={formData.billingCountry}
                      onChange={(e) => handleChange("billingCountry", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>納入先住所</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shippingStreet">番地</Label>
                  <Input
                    id="shippingStreet"
                    value={formData.shippingStreet}
                    onChange={(e) => handleChange("shippingStreet", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shippingCity">市区町村</Label>
                    <Input
                      id="shippingCity"
                      value={formData.shippingCity}
                      onChange={(e) => handleChange("shippingCity", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingState">都道府県</Label>
                    <Input
                      id="shippingState"
                      value={formData.shippingState}
                      onChange={(e) => handleChange("shippingState", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shippingPostalCode">郵便番号</Label>
                    <Input
                      id="shippingPostalCode"
                      value={formData.shippingPostalCode}
                      onChange={(e) => handleChange("shippingPostalCode", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingCountry">国</Label>
                    <Input
                      id="shippingCountry"
                      value={formData.shippingCountry}
                      onChange={(e) => handleChange("shippingCountry", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="additional">
          <Card>
            <CardHeader>
              <CardTitle>追加情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualRevenue">年間売上高</Label>
                  <Input
                    id="annualRevenue"
                    type="number"
                    value={formData.annualRevenue}
                    onChange={(e) => handleChange("annualRevenue", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfEmployees">従業員数</Label>
                  <Input
                    id="numberOfEmployees"
                    type="number"
                    value={formData.numberOfEmployees}
                    onChange={(e) => handleChange("numberOfEmployees", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 mt-6">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "更新" : "作成"}
        </Button>
      </div>
    </form>
  );
}
