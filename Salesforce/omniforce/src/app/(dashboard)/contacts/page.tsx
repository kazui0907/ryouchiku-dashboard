"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data/data-table";
import { Plus, Users } from "lucide-react";
import Link from "next/link";

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
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

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<Pagination | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchContacts = useCallback(async (page = 1) => {
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

      const response = await fetch(`/api/contacts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, sortColumn, sortOrder]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const columns: Column<Contact>[] = [
    {
      key: "name",
      label: "氏名",
      sortable: true,
      render: (_, row) => (
        <div className="font-medium text-blue-600 hover:underline cursor-pointer">
          {row.lastName} {row.firstName}
        </div>
      ),
    },
    {
      key: "title",
      label: "役職",
      sortable: true,
      render: (value) => value || "-",
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
      key: "email",
      label: "メールアドレス",
      render: (value) => value || "-",
    },
    {
      key: "phone",
      label: "電話番号",
      render: (value) => value || "-",
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
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">取引先責任者</h1>
            <p className="text-muted-foreground">担当者の管理</p>
          </div>
        </div>
        <Button onClick={() => router.push("/contacts/new")}>
          <Plus className="w-4 h-4 mr-2" />
          新規作成
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>取引先責任者一覧</CardTitle>
          <CardDescription>
            {pagination?.total || 0}件の取引先責任者が登録されています
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={contacts}
            pagination={pagination}
            onPageChange={(page) => fetchContacts(page)}
            onSearch={(search) => {
              setSearchQuery(search);
            }}
            onSort={(column, order) => {
              setSortColumn(column);
              setSortOrder(order);
            }}
            onRowClick={(row) => router.push(`/contacts/${row.id}`)}
            searchPlaceholder="氏名、メールアドレスで検索..."
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
