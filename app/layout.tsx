import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Type & Learn",
  description: "英単語と短文をタイピングしながら学ぶMVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
