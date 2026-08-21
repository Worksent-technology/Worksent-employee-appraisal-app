import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Best Employee Recognition & Performance Excellence",
  description:
    "Standardized, fair, and transparent framework for employee recognition, performance rewards, increment discussions, and promotion readiness.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex bg-white text-black">
        <Nav />
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <main className="flex-1">{children}</main>
          <footer className="border-t border-black/10 py-6 text-center text-xs text-neutral-500">
            Best Employee Recognition &amp; Performance Excellence Process ·
            Version 1.0 · Owner: HR Department
          </footer>
        </div>
      </body>
    </html>
  );
}