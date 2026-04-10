import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DPS45",
  description: "Народная карта постов ДПС"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
