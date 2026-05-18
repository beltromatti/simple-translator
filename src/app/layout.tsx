import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simple Translator",
  description: "A focused Italian-Spanish translator with idioms, tone, and practical context.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
