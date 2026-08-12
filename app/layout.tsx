import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "人生 Online｜多人生活模擬遊戲",
  description: "登入保存人生進度，和其他玩家一起探索城市、工作、學習與成長。",
  openGraph: {
    title: "人生 Online｜你的多人生活模擬遊戲",
    description: "每個選擇，都在改變你的人生。和其他玩家一起探索城市、工作、學習與成長。",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
