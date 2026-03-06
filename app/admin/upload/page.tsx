'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, CheckCircle, XCircle, FileText } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

function MFUploadCard({
  title,
  description,
  accept,
}: {
  title: string;
  description: string;
  accept: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(CURRENT_YEAR - 1);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
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
      formData.append('year', String(year));
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      setResult({ success: res.ok, message: data.message || data.error || '不明なエラー' });
      if (res.ok) setFile(null);
    } catch {
      setResult({ success: false, message: 'ネットワークエラーが発生しました' });
    } finally {
      setUploading(false);
    }
  };

  const inputId = `upload-${title}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start gap-3 mb-4">
        <FileText className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>

      {/* 年度選択 */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">データの年度:</label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">※ファイル名の日付ではなくデータが含まれる年を選択</span>
      </div>

      {/* ファイル選択 */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center mb-4">
        <Upload className="mx-auto h-8 w-8 text-gray-300 mb-2" />
        <label
          htmlFor={inputId}
          className="cursor-pointer inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
        >
          CSVファイルを選択
          <input
            id={inputId}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            選択中: <span className="font-medium">{file.name}</span>
          </p>
        )}
      </div>

      {/* アップロードボタン */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full flex justify-center items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              インポート中...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {year}年データをインポート
            </>
          )}
        </button>
      )}

      {/* 結果 */}
      {result && (
        <div className={`flex items-start gap-2 mt-4 p-4 rounded-xl text-sm ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {result.success
            ? <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            : <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-5 w-5 mr-1" />
            戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">CSVアップロード</h1>
          <p className="mt-1 text-sm text-gray-500">マネーフォワードからエクスポートしたCSVをアップロードしてデータを更新します</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <MFUploadCard
          title="損益計算書（月次推移）"
          description="マネーフォワード → レポート → 損益計算書 → 月次推移 でエクスポートしたCSV"
          accept=".csv"
        />

        <MFUploadCard
          title="貸借対照表（月次推移）"
          description="マネーフォワード → レポート → 貸借対照表 → 月次推移 でエクスポートしたCSV"
          accept=".csv"
        />

        {/* 注意事項 */}
        <div className="bg-blue-50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ご注意</h3>
          <ul className="text-sm text-blue-800 space-y-1.5">
            <li>• ファイル名の日付（例: 20260306）はエクスポート日時です。データが含まれる年度を年度欄で指定してください</li>
            <li>• 同じ年度を再アップロードすると既存データが上書きされます</li>
            <li>• 限界利益は「売上総利益 ＋ 労務費 ＋ 労務費賞与」で自動計算されます</li>
            <li>• 予算・目標値は予算設定ウィザードで別途入力してください</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
