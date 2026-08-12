import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "人生 Online｜把日子過成自己的故事",
  description: "一款文字人生模擬遊戲。工作、學習、生活，在同一座城市寫下不同的人生。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
