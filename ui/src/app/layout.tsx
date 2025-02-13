import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "kagents | Solo.io",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <html lang="en">
        <body className={geistSans.className}>
          <main className="bg-[#1A1A1A]">{children}</main>
        </body>
      </html>
    </TooltipProvider>
  );
}
