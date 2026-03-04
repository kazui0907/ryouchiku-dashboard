'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, CheckCircle, XCircle } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
        setFile(null);
      } else {
        setResult({ success: false, message: data.error || 'アップロードに失敗しました' });
      }
    } catch (error) {
      setResult({ success: false, message: 'エラーが発生しました' });
    } finally {
      setUploading(false);
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
          <h1 className="text-3xl font-bold text-gray-900">CSV アップロード</h1>
          <p className="mt-1 text-sm text-gray-500">会計データをアップロードして更新します</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>ファイルアップロード</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* ファイル選択 */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  ファイルを選択
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {file && (
                  <div className="mt-4 text-sm text-gray-600">
                    選択されたファイル: <span className="font-medium">{file.name}</span>
                  </div>
                )}
              </div>

              {/* アップロードボタン */}
              {file && (
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? (
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
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      アップロード
                    </>
                  )}
                </button>
              )}

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
                <h3 className="text-sm font-medium text-blue-900 mb-2">アップロード方法</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Google Sheetsから「ファイル → ダウンロード → CSV」でエクスポート</li>
                  <li>• CSVファイルを選択してアップロード</li>
                  <li>• データベースに自動的にインポートされます</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
