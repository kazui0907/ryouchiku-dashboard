'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Home, FileText, BarChart3, Upload, RefreshCw, Download, Target, Wand2, BookOpen, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navigation = [
    { name: 'ダッシュボード', href: '/', icon: Home },
    { name: '月次会計一覧', href: '/accounting', icon: FileText },
    { name: '年次サマリー', href: '/reports/annual', icon: BarChart3 },
    { name: '貸借対照表', href: '/balance-sheet', icon: BookOpen },
    { name: '年次KPIレポート', href: '/reports/kpi-annual', icon: BarChart3 },
  ];

  const adminNavigation = [
    { name: '予算設定ウィザード', href: '/admin/budget-wizard', icon: Wand2 },
    { name: '目標設定', href: '/admin/target-settings', icon: Target },
    { name: 'CSVアップロード', href: '/admin/upload', icon: Upload },
    { name: '週次KPI入力', href: '/admin/weekly-kpi', icon: FileText },
    { name: '現場KPI入力', href: '/admin/weekly-site-kpi', icon: FileText },
    { name: 'データ同期', href: '/admin/sync', icon: RefreshCw },
  ];

  const handleExportExcel = () => {
    window.open('/api/export/excel?year=2026', '_blank');
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const month = new Date().getMonth() + 1;
    window.open(`/api/export/pdf?year=2026&month=${month}`, '_blank');
    setShowExportMenu(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-base sm:text-xl font-bold text-gray-900">
                LTS経営ダッシュボード
              </span>
            </div>
            {/* デスクトップナビ */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          {/* デスクトップ右側ボタン */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => { setShowAdminMenu(!showAdminMenu); setShowExportMenu(false); }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                データ管理
              </button>
              {showAdminMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    {adminNavigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setShowAdminMenu(false)}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => { setShowExportMenu(!showExportMenu); setShowAdminMenu(false); }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                エクスポート
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <button
                      onClick={handleExportExcel}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Excel (年間データ)
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      PDF (今月レポート)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* モバイルハンバーガーボタン */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* モバイルメニュー */}
      {showMobileMenu && (
        <div className="sm:hidden border-t border-gray-200 bg-white">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center px-4 py-3 text-base font-medium ${
                    isActive
                      ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-gray-200 pt-2 pb-3">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">データ管理</div>
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center px-4 py-3 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-gray-200 pt-2 pb-3">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">エクスポート</div>
            <button
              onClick={() => { handleExportExcel(); setShowMobileMenu(false); }}
              className="flex items-center w-full px-4 py-3 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <Download className="h-5 w-5 mr-3" />
              Excel (年間データ)
            </button>
            <button
              onClick={() => { handleExportPDF(); setShowMobileMenu(false); }}
              className="flex items-center w-full px-4 py-3 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <Download className="h-5 w-5 mr-3" />
              PDF (今月レポート)
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
