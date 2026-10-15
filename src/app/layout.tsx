import type { Metadata } from "next";
import "./globals.css";
import { UserActivityTracker } from "@/components/layout/UserActivityTracker";

export const metadata: Metadata = {
  title: "S.STROKE",
  description: "S.STROKE",
  openGraph: {
    title: "S.STROKE",
    description: "S.STROKE",
    siteName: "S.STROKE",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        suppressHydrationWarning={true}
      >
        {children}
        <UserActivityTracker />
      </body>
    </html>
  );
}