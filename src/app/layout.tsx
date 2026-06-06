import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
  title: "شركة الأماني - نظام GPS",
  description: "نظام إدارة خدمات GPS - شركة الأماني",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
