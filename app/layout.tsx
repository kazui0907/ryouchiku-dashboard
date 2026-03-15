import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LTS 経営ダッシュボード",
  description: "ライフタイムサポート グループ 経営管理会計システム",
};

const VERSION = 'v1.1.1';
const BUILD_TIME = '2026/03/16 01:30';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <div className="fixed bottom-2 right-3 text-xs text-gray-400 pointer-events-none select-none">
          Build: {BUILD_TIME} | {VERSION}
        </div>
      </body>
    </html>
  );
}
