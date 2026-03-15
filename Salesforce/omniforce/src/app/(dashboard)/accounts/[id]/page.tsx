"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Edit,
  Trash2,
  Phone,
  Globe,
  Mail,
  MapPin,
  Users,
  TrendingUp,
  Headphones,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await fetch(`/api/accounts/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setAccount(data);
        } else {
          toast.error("取引先が見つかりません");
          router.push("/accounts");
        }
      } catch (error) {
        toast.error("エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchAccount();
    }
  }, [params.id, router]);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/accounts/${params.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("取引先を削除しました");
        router.push("/accounts");
      } else {
        const error = await response.json();
        toast.error(error.error || "削除に失敗しました");
      }
    } catch (error) {
      toast.error("エラーが発生しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!account) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{account.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {account.type && <Badge variant="outline">{account.type}</Badge>}
              {account.industry && (
                <Badge variant="secondary">{account.industry}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/accounts/${params.id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            編集
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            削除
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">詳細</TabsTrigger>
          <TabsTrigger value="contacts">取引先責任者 ({account.contacts?.length || 0})</TabsTrigger>
          <TabsTrigger value="opportunities">商談 ({account.opportunities?.length || 0})</TabsTrigger>
          <TabsTrigger value="cases">ケース ({account.cases?.length || 0})</TabsTrigger>
          <TabsTrigger value="activities">活動履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 基本情報 */}
            <Card>
              <CardHeader>
                <CardTitle>基本情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">取引先名</div>
                    <div className="font-medium">{account.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">所有者</div>
                    <div className="font-medium">{account.owner?.name || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">業種</div>
                    <div className="font-medium">{account.industry || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">種別</div>
                    <div className="font-medium">{account.type || "-"}</div>
                  </div>
                </div>
                {account.description && (
                  <div>
                    <div className="text-sm text-muted-foreground">説明</div>
                    <div className="font-medium whitespace-pre-wrap">
                      {account.description}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 連絡先情報 */}
            <Card>
              <CardHeader>
                <CardTitle>連絡先情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {account.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{account.phone}</span>
                  </div>
                )}
                {account.fax && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>FAX: {account.fax}</span>
                  </div>
                )}
                {account.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={account.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {account.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 請求先住所 */}
            <Card>
              <CardHeader>
                <CardTitle>請求先住所</CardTitle>
              </CardHeader>
              <CardContent>
                {account.billingStreet ||
                account.billingCity ||
                account.billingState ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      {account.billingPostalCode && (
                        <div>〒{account.billingPostalCode}</div>
                      )}
                      {account.billingState && <span>{account.billingState} </span>}
                      {account.billingCity && <span>{account.billingCity}</span>}
                      {account.billingStreet && <div>{account.billingStreet}</div>}
                      {account.billingCountry && <div>{account.billingCountry}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">-</div>
                )}
              </CardContent>
            </Card>

            {/* 追加情報 */}
            <Card>
              <CardHeader>
                <CardTitle>追加情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">年間売上高</div>
                    <div className="font-medium">
                      {account.annualRevenue
                        ? `¥${account.annualRevenue.toLocaleString()}`
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">従業員数</div>
                    <div className="font-medium">
                      {account.numberOfEmployees?.toLocaleString() || "-"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* システム情報 */}
          <Card>
            <CardHeader>
              <CardTitle>システム情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">作成者</div>
                  <div>{account.createdBy?.name || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">作成日時</div>
                  <div>{new Date(account.createdAt).toLocaleString("ja-JP")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">最終更新者</div>
                  <div>{account.updatedBy?.name || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">最終更新日時</div>
                  <div>{new Date(account.updatedAt).toLocaleString("ja-JP")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>取引先責任者</CardTitle>
                <CardDescription>この取引先に関連する担当者</CardDescription>
              </div>
              <Button size="sm" onClick={() => router.push(`/contacts/new?accountId=${params.id}`)}>
                新規作成
              </Button>
            </CardHeader>
            <CardContent>
              {account.contacts?.length > 0 ? (
                <div className="space-y-2">
                  {account.contacts.map((contact: any) => (
                    <Link
                      key={contact.id}
                      href={`/contacts/${contact.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {contact.lastName} {contact.firstName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {contact.title || "-"} {contact.email && `/ ${contact.email}`}
                          </div>
                        </div>
                      </div>
                      {contact.phone && (
                        <div className="text-sm text-muted-foreground">
                          {contact.phone}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  取引先責任者がありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>商談</CardTitle>
                <CardDescription>この取引先に関連する商談</CardDescription>
              </div>
              <Button size="sm" onClick={() => router.push(`/opportunities/new?accountId=${params.id}`)}>
                新規作成
              </Button>
            </CardHeader>
            <CardContent>
              {account.opportunities?.length > 0 ? (
                <div className="space-y-2">
                  {account.opportunities.map((opp: any) => (
                    <Link
                      key={opp.id}
                      href={`/opportunities/${opp.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{opp.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {opp.stage}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {opp.amount && (
                          <div className="font-medium">
                            ¥{opp.amount.toLocaleString()}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {new Date(opp.closeDate).toLocaleDateString("ja-JP")}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  商談がありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>ケース</CardTitle>
                <CardDescription>この取引先に関連する問い合わせ</CardDescription>
              </div>
              <Button size="sm" onClick={() => router.push(`/cases/new?accountId=${params.id}`)}>
                新規作成
              </Button>
            </CardHeader>
            <CardContent>
              {account.cases?.length > 0 ? (
                <div className="space-y-2">
                  {account.cases.map((caseItem: any) => (
                    <Link
                      key={caseItem.id}
                      href={`/cases/${caseItem.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Headphones className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{caseItem.subject}</div>
                          <div className="text-sm text-muted-foreground">
                            {caseItem.caseNumber}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{caseItem.status}</Badge>
                        <Badge
                          variant={
                            caseItem.priority === "High"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {caseItem.priority}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  ケースがありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>活動履歴</CardTitle>
              <CardDescription>この取引先に関連する活動</CardDescription>
            </CardHeader>
            <CardContent>
              {account.activities?.length > 0 ? (
                <div className="space-y-4">
                  {account.activities.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{activity.subject}</div>
                          <Badge variant="outline">{activity.type}</Badge>
                        </div>
                        {activity.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          {new Date(activity.activityDate).toLocaleString("ja-JP")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  活動履歴がありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>取引先の削除</DialogTitle>
            <DialogDescription>
              「{account.name}」を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
