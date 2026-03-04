'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function SyncPage() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
      } else {
        setResult({ success: false, message: data.error || '同期に失敗しました' });
      }
    } catch (error) {
      setResult({ success: false, message: 'エラーが発生しました' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Google Sheets 同期</h1>
          <p className="mt-1 text-sm text-gray-500">
            スプレッドシートからデータを自動的に取得して更新します
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>データ同期</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 同期ボタン */}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {syncing ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    同期中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    今すぐ同期
                  </>
                )}
              </button>

              {/* 結果表示 */}
              {result && (
                <div
                  className={`flex items-center p-4 rounded-lg ${
                    result.success
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 mr-3" />
                  ) : (
                    <XCircle className="h-5 w-5 mr-3" />
                  )}
                  <span>{result.message}</span>
                </div>
              )}

              {/* 説明 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">同期について</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Google Sheetsから最新のデータを取得します</li>
                  <li>• データベースに自動的に反映されます</li>
                  <li>• 既存のデータは上書きされます</li>
                </ul>
              </div>

              {/* 設定情報 */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">接続設定</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>スプレッドシートID: 1nHRns9I_Vj_7JRVWq45CZwhFQrCfzpSqMJv8IzZrSq0</div>
                  <div>シート名: mf資料</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
