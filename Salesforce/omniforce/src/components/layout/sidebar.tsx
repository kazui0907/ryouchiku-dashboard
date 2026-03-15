"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  TrendingUp,
  UserPlus,
  Headphones,
  LayoutDashboard,
  Settings,
  FileBarChart,
  Database,
  Workflow,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "ホーム", href: "/", icon: LayoutDashboard },
  { name: "取引先", href: "/accounts", icon: Building2 },
  { name: "取引先責任者", href: "/contacts", icon: Users },
  { name: "商談", href: "/opportunities", icon: TrendingUp },
  { name: "リード", href: "/leads", icon: UserPlus },
  { name: "ケース", href: "/cases", icon: Headphones },
];

const setupNavigation = [
  { name: "レポート", href: "/reports", icon: FileBarChart },
  { name: "オブジェクト管理", href: "/objects", icon: Database },
  { name: "自動化", href: "/automation", icon: Workflow },
  { name: "設定", href: "/setup", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-slate-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-800">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-sm">O</span>
        </div>
        {!collapsed && (
          <span className="ml-3 font-semibold text-lg">OmniForce</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="ml-3">{item.name}</span>}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-4 border-t border-slate-800" />

        {/* Setup Navigation */}
        {setupNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="ml-3">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-2 border-t border-slate-800">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-slate-300 hover:text-white hover:bg-slate-800"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span>折りたたむ</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
