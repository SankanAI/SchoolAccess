import type { Metadata } from "next";
import "./globals.css";
import { DM_Sans } from 'next/font/google'; // Import DM Sans font
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap' });
import AppAppBar from "@/components/ui/AppAppBar";

export const metadata: Metadata = {
  title: "Sankan AI",
  description: "Sankan AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
    <body className={dmSans.className}>
      <AppAppBar/>
        {children}
      </body>
    </html>
  );
}
