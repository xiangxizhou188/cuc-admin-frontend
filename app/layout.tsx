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
  title: "CUC Supply 管理后台",
  description: "CUC Supply 商品、库存与页面内容管理系统。",
  icons: {
    icon: [{ url: "/cuc-supply-mark.png?v=2", type: "image/png", sizes: "256x256" }],
    shortcut: "/cuc-supply-mark.png?v=2",
    apple: "/cuc-supply-mark.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
