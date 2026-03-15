"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data/data-table";
import { Plus, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Opportunity {
  id: string;
  name: string;
  amount: number | null;
  stage: string;
  probability: number | null;
  closeDate: string;
  isClosed: boolean;
  isWon: boolean;
  account: { id: string; name: string } | null;
  owner: { id: string; name: string | null; email: string };
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STAGE_COLORS: Record<string, string> = {
  "Prospecting": "bg-gray-100 text-gray-800",
  "Qualification": "bg-blue-100 text-blue-800",
  "Needs Analysis": "bg-indigo-100 text-indigo-800",
  "Value Proposition": "bg-purple-100 text-purple-800",
  "Proposal/Price Quote": "bg-yellow-100 text-yellow-800",
  "Negotiation/Review": "bg-orange-100 text-orange-800",
  "Closed Won": "bg-green-100 text-green-800",
  "Closed Lost": "bg-red-100 text-red-800",
};

export default function OpportunitiesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [pagination, setPagination] = useState<Pagination | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchOpportunities = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sortBy: sortColumn,
        sortOrder,
      });
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const response = await fetch(`/api/opportunities?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, sortColumn, sortOrder]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const columns: Column<Opportunity>[] = [
    {
      key: "name",
      label: "商談名",
      sortable: true,
      render: (value) => (
        <div className="font-medium text-blue-600 hover:underline cursor-pointer">
          {value}
        </div>
      ),
    },
    {
      key: "account",
      label: "取引先",
      render: (value) =>
        value ? (
          <Link
            href={`/accounts/${value.id}`}
            className="text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {value.name}
          </Link>
        ) : (
          "-"
        ),
    },
    {
      key: "stage",
      label: "フェーズ",
      sortable: true,
      render: (value) => (
        <Badge className={STAGE_COLORS[value] || "bg-gray-100"}>
          {value}
        </Badge>
      ),
    },
    {
      key: "amount",
      label: "金額",
      sortable: true,
      render: (value) =>
        value ? `¥${value.toLocaleString()}` : "-",
    },
    {
      key: "probability",
      label: "確度",
      sortable: true,
      render: (value) => (value !== null ? `${value}%` : "-"),
    },
    {
      key: "closeDate",
      label: "完了予定日",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString("ja-JP"),
    },
    {
      key: "owner",
      label: "所有者",
      render: (value) => value?.name || value?.email || "-",
    },
  ];

  // パイプライン合計を計算
  const pipelineTotal = opportunities
    .filter((opp) => !opp.isClosed)
    .reduce((sum, opp) => sum + (opp.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">商談</h1>
            <p className="text-muted-foreground">商談の管理</p>
          </div>
        </div>
        <Button onClick={() => router.push("/opportunities/new")}>
          <Plus className="w-4 h-4 mr-2" />
          新規作成
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              パイプライン合計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{pipelineTotal.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              進行中の商談
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {opportunities.filter((opp) => !opp.isClosed).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              成約済み
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {opportunities.filter((opp) => opp.isWon).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>商談一覧</CardTitle>
          <CardDescription>
            {pagination?.total || 0}件の商談が登録されています
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={opportunities}
            pagination={pagination}
            onPageChange={(page) => fetchOpportunities(page)}
            onSearch={(search) => {
              setSearchQuery(search);
            }}
            onSort={(column, order) => {
              setSortColumn(column);
              setSortOrder(order);
            }}
            onRowClick={(row) => router.push(`/opportunities/${row.id}`)}
            searchPlaceholder="商談名で検索..."
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
