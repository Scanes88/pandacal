import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EFPT Portal",
  description: "Elite Formula Performance Training — coaching portal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
