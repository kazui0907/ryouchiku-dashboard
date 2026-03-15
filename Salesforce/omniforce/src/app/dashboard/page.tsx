"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  TrendingUp,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

// サマリーカードデータ
interface SummaryData {
  accounts: number;
  contacts: number;
  opportunities: number;
  leads: number;
  totalRevenue: number;
  conversionRate: number;
}

// パイプラインデータ
const pipelineData = [
  { name: "見込み", value: 12, amount: 4500000 },
  { name: "提案中", value: 8, amount: 3200000 },
  { name: "交渉中", value: 5, amount: 2800000 },
  { name: "受注", value: 15, amount: 8500000 },
];

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

// 月次推移データ
const monthlyData = [
  { month: "1月", revenue: 2400000, deals: 8 },
  { month: "2月", revenue: 1398000, deals: 5 },
  { month: "3月", revenue: 3800000, deals: 12 },
  { month: "4月", revenue: 3908000, deals: 11 },
  { month: "5月", revenue: 4800000, deals: 15 },
  { month: "6月", revenue: 3800000, deals: 10 },
];

// 最近の活動
const recentActivities = [
  { id: 1, type: "opportunity", action: "受注", name: "株式会社ABC - 新規導入", time: "2時間前" },
  { id: 2, type: "lead", action: "コンバート", name: "山田太郎", time: "3時間前" },
  { id: 3, type: "account", action: "更新", name: "株式会社XYZ", time: "5時間前" },
  { id: 4, type: "contact", action: "作成", name: "鈴木一郎", time: "昨日" },
  { id: 5, type: "opportunity", action: "フェーズ更新", name: "DEF株式会社 - アップグレード", time: "昨日" },
];

export default function DashboardPage() {
  const [summary, setSummary] = useState<SummaryData>({
    accounts: 0,
    contacts: 0,
    opportunities: 0,
    leads: 0,
    totalRevenue: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      // 各エンドポイントからデータを取得
      const [accountsRes, contactsRes, opportunitiesRes] = await Promise.all([
        fetch("/api/accounts?limit=1"),
        fetch("/api/contacts?limit=1"),
        fetch("/api/opportunities?limit=1"),
      ]);

      const accountsData = accountsRes.ok ? await accountsRes.json() : { pagination: { total: 0 } };
      const contactsData = contactsRes.ok ? await contactsRes.json() : { pagination: { total: 0 } };
      const opportunitiesData = opportunitiesRes.ok ? await opportunitiesRes.json() : { pagination: { total: 0 } };

      setSummary({
        accounts: accountsData.pagination?.total || 0,
        contacts: contactsData.pagination?.total || 0,
        opportunities: opportunitiesData.pagination?.total || 0,
        leads: 24,
        totalRevenue: 19000000,
        conversionRate: 23.5,
      });
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const summaryCards = [
    {
      title: "取引先",
      value: summary.accounts,
      change: "+12%",
      positive: true,
      icon: Building2,
      href: "/accounts",
    },
    {
      title: "取引先責任者",
      value: summary.contacts,
      change: "+8%",
      positive: true,
      icon: Users,
      href: "/contacts",
    },
    {
      title: "商談",
      value: summary.opportunities,
      change: "-3%",
      positive: false,
      icon: TrendingUp,
      href: "/opportunities",
    },
    {
      title: "リード",
      value: summary.leads,
      change: "+18%",
      positive: true,
      icon: UserPlus,
      href: "/leads",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-muted-foreground">
          ビジネスの概要と主要指標を確認できます
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
                <p className={`text-xs flex items-center ${card.positive ? "text-green-600" : "text-red-600"}`}>
                  {card.positive ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  {card.change} 前月比
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 売上と指標 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{summary.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-green-600 flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +15% 前月比
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">コンバージョン率</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.conversionRate}%</div>
            <p className="text-xs text-green-600 flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +2.3% 前月比
            </p>
          </CardContent>
        </Card>
      </div>

      {/* チャート */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 月次売上推移 */}
        <Card>
          <CardHeader>
            <CardTitle>月次売上推移</CardTitle>
            <CardDescription>過去6ヶ月間の売上推移</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `¥${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(value) => [`¥${Number(value).toLocaleString()}`, "売上"]}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* パイプライン */}
        <Card>
          <CardHeader>
            <CardTitle>パイプライン</CardTitle>
            <CardDescription>フェーズ別商談状況</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value}件 (¥${(props as any).payload.amount.toLocaleString()})`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 商談件数推移 */}
      <Card>
        <CardHeader>
          <CardTitle>商談件数推移</CardTitle>
          <CardDescription>過去6ヶ月間の成約件数</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="deals"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 最近の活動 */}
      <Card>
        <CardHeader>
          <CardTitle>最近の活動</CardTitle>
          <CardDescription>直近のレコード更新履歴</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.type === "opportunity"
                        ? "bg-blue-500"
                        : activity.type === "lead"
                        ? "bg-green-500"
                        : activity.type === "account"
                        ? "bg-purple-500"
                        : "bg-orange-500"
                    }`}
                  />
                  <div>
                    <p className="font-medium">{activity.name}</p>
                    <p className="text-sm text-muted-foreground">{activity.action}</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
