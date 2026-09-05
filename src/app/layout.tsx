import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardProvider } from "@/components/dashboard/dashboard-provider";
import { Sidebar } from "@/components/dashboard/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Outliers Analytics",
  description: "Business intelligence dashboard across sales, customers, marketing, inventory, banking and HR data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <DashboardProvider>
          <TooltipProvider>
            <Sidebar />
            <div className="flex min-h-screen flex-col md:pl-64">{children}</div>
          </TooltipProvider>
        </DashboardProvider>
      </body>
    </html>
  );
}
