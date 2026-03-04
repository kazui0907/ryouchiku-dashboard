import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 金額をフォーマット
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount)
}

// パーセントをフォーマット
export function formatPercent(rate: number, decimals: number = 1): string {
  return `${(rate * 100).toFixed(decimals)}%`
}

// 大きな数値を省略形で表示 (例: 44,248,011 → ¥44.2M)
export function formatCompactCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `¥${(amount / 1_000_000_000).toFixed(1)}B`
  } else if (amount >= 1_000_000) {
    return `¥${(amount / 1_000_000).toFixed(1)}M`
  } else if (amount >= 1_000) {
    return `¥${(amount / 1_000).toFixed(0)}K`
  }
  return formatCurrency(amount)
}

// 達成率に応じた色を返す
export function getAchievementColor(rate: number): string {
  if (rate >= 1.0) return 'text-green-600'
  if (rate >= 0.8) return 'text-yellow-600'
  return 'text-red-600'
}

// 達成率のバッジ背景色
export function getAchievementBgColor(rate: number): string {
  if (rate >= 1.0) return 'bg-green-100 text-green-800'
  if (rate >= 0.8) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}
