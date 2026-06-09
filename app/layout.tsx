import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto AAC",
  description: "Generation text to teacher-reviewed AAC storyboard cards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
