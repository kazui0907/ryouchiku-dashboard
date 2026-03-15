"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data/data-table";
import { Plus, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Account {
  id: string;
  name: string;
  industry: string | null;
  type: string | null;
  phone: string | null;
  website: string | null;
  owner: { id: string; name: string | null; email: string };
  _count: { contacts: number; opportunities: number };
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pagination, setPagination] = useState<Pagination | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchAccounts = useCallback(async (page = 1) => {
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

      const response = await fetch(`/api/accounts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, sortColumn, sortOrder]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const columns: Column<Account>[] = [
    {
      key: "name",
      label: "取引先名",
      sortable: true,
      render: (value, row) => (
        <div className="font-medium text-blue-600 hover:underline cursor-pointer">
          {value}
        </div>
      ),
    },
    {
      key: "industry",
      label: "業種",
      sortable: true,
      render: (value) => value || "-",
    },
    {
      key: "type",
      label: "種別",
      sortable: true,
      render: (value) =>
        value ? <Badge variant="outline">{value}</Badge> : "-",
    },
    {
      key: "phone",
      label: "電話番号",
      render: (value) => value || "-",
    },
    {
      key: "_count",
      label: "関連数",
      render: (value) => (
        <div className="text-sm text-muted-foreground">
          責任者: {value?.contacts || 0} / 商談: {value?.opportunities || 0}
        </div>
      ),
    },
    {
      key: "owner",
      label: "所有者",
      render: (value) => value?.name || value?.email || "-",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">取引先</h1>
            <p className="text-muted-foreground">取引先の管理</p>
          </div>
        </div>
        <Button onClick={() => router.push("/accounts/new")}>
          <Plus className="w-4 h-4 mr-2" />
          新規作成
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>取引先一覧</CardTitle>
          <CardDescription>
            {pagination?.total || 0}件の取引先が登録されています
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={accounts}
            pagination={pagination}
            onPageChange={(page) => fetchAccounts(page)}
            onSearch={(search) => {
              setSearchQuery(search);
            }}
            onSort={(column, order) => {
              setSortColumn(column);
              setSortOrder(order);
            }}
            onRowClick={(row) => router.push(`/accounts/${row.id}`)}
            searchPlaceholder="取引先名、電話番号、Webサイトで検索..."
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
