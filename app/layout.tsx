import type { Metadata, Viewport } from "next";
import { AppFooter } from "../components/AppFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto AAC",
  description: "Generation text to teacher-reviewed AAC storyboard cards",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#245fc9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
