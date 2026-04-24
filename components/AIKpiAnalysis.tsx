'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, RefreshCw, AlertCircle, Settings, X, Wand2 } from 'lucide-react';
import { DEFAULT_PROMPT_INSTRUCTIONS } from '@/lib/ai-prompt';

interface Props {
  year: number;
  month: number;
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-base font-bold text-gray-800 mt-5 mb-2 pb-1 border-b border-gray-200">
          {line.slice(3)}
        </h2>
      );
    } else if (line.match(/^[・\-\*] /)) {
      const content = line.replace(/^[・\-\*] /, '');
      elements.push(
        <li key={key++} className="ml-4 text-sm text-gray-700 leading-relaxed list-disc">
          {renderInline(content)}
        </li>
      );
    } else if (line.match(/^\d+\. /)) {
      const content = line.replace(/^\d+\. /, '');
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={key++} className="flex gap-2 ml-2 text-sm text-gray-700 leading-relaxed">
          <span className="font-bold text-blue-600 shrink-0">{num}.</span>
          <span>{renderInline(content)}</span>
        </div>
      );
    } else if (line.trim() === '' || line === '---') {
      elements.push(<div key={key++} className="h-1" />);
    } else {
      elements.push(
        <p key={key++} className="text-sm text-gray-700 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  }
  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
      : part
  );
}

export function AIKpiAnalysis({ year, month }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // プロンプト編集パネル
  const [showEditor, setShowEditor] = useState(false);
  const [promptInstructions, setPromptInstructions] = useState(DEFAULT_PROMPT_INSTRUCTIONS);
  const [editRequest, setEditRequest] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const isCustomPrompt = promptInstructions !== DEFAULT_PROMPT_INSTRUCTIONS;

  async function runAnalysis(instructions: string) {
    setLoading(true);
    setError(null);
    setShowEditor(false);
    try {
      const res = await fetch('/api/ai-kpi-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, promptInstructions: instructions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI分析に失敗しました');
      setAnalysis(data.analysis);
      setGeneratedAt(data.generatedAt);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function requestPromptEdit() {
    if (!editRequest.trim()) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch('/api/ai-edit-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentInstructions: promptInstructions, editRequest }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'プロンプト修正に失敗しました');
      setPromptInstructions(data.newInstructions);
      setEditRequest('');
    } catch (err) {
      setEditError(String(err));
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-blue-500" />
            AI経営分析（KPI推移フィードバック）
            {isCustomPrompt && (
              <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                カスタムプロンプト適用中
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditor(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                showEditor
                  ? 'bg-gray-100 border-gray-300 text-gray-700'
                  : 'border-gray-200 text-gray-900 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <Settings className="h-4 w-4" />
              プロンプトを編集
            </button>
            <button
              onClick={() => runAnalysis(promptInstructions)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '分析中...' : analysis ? '再分析' : 'KPI推移を分析する'}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-900 mt-1">
          過去3ヶ月の週次KPI・現場KPIの推移をGemini AIが分析し、経営的フィードバックを提供します
        </p>
      </CardHeader>

      <CardContent>
        {/* プロンプト編集パネル */}
        {showEditor && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Settings className="h-4 w-4" />
                分析指示文の編集
              </h3>
              <button onClick={() => setShowEditor(false)} className="text-gray-900 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 現在のプロンプト */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                現在の分析指示文（直接編集できます）
              </label>
              <textarea
                value={promptInstructions}
                onChange={e => setPromptInstructions(e.target.value)}
                rows={10}
                className="w-full text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
              />
              {isCustomPrompt && (
                <button
                  onClick={() => setPromptInstructions(DEFAULT_PROMPT_INSTRUCTIONS)}
                  className="mt-1 text-xs text-gray-900 hover:text-gray-600 underline"
                >
                  デフォルトに戻す
                </button>
              )}
            </div>

            {/* AI修正依頼 */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                AIに修正を依頼する（変更したい内容を日本語で書いてください）
              </label>
              <textarea
                value={editRequest}
                onChange={e => setEditRequest(e.target.value)}
                placeholder="例：受注件数と受注率をより重視してほしい。また、改善すべき点は2項目に絞ってほしい。"
                rows={3}
                className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
              {editError && (
                <p className="text-xs text-red-500 mt-1">{editError}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={requestPromptEdit}
                  disabled={editLoading || !editRequest.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Wand2 className={`h-4 w-4 ${editLoading ? 'animate-spin' : ''}`} />
                  {editLoading ? 'AIが修正中...' : 'AIに修正してもらう'}
                </button>
                <span className="text-xs text-gray-900">修正後は上の指示文に反映されます</span>
              </div>
            </div>

            {/* この内容で分析する */}
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => runAnalysis(promptInstructions)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                この指示文で分析する
              </button>
            </div>
          </div>
        )}

        {/* 分析結果エリア */}
        {!analysis && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-900">
            <Sparkles className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">「KPI推移を分析する」ボタンを押すと、AIによるフィードバックが表示されます</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-900">
            <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Gemini AIがKPIデータを分析しています...</p>
            <p className="text-xs text-gray-900 mt-1">通常10〜20秒かかります</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-50 rounded-lg text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">エラーが発生しました</p>
              <p className="text-xs mt-1 text-red-500">{error}</p>
            </div>
          </div>
        )}

        {analysis && !loading && (
          <div className="space-y-1">
            <div className="prose prose-sm max-w-none">
              {renderMarkdown(analysis)}
            </div>
            {generatedAt && (
              <p className="text-xs text-gray-900 text-right mt-4 pt-3 border-t border-gray-100">
                生成日時: {new Date(generatedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
