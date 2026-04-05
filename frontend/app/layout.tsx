import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NarrativeScope",
  description: "Reddit Political Discourse Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var theme=localStorage.getItem('narrativescope-theme');if(theme==='dark'){document.documentElement.classList.add('theme-dark');document.documentElement.dataset.theme='dark';}else{document.documentElement.dataset.theme='light';}}catch(e){document.documentElement.dataset.theme='light';}})();",
          }}
        />
        <div className="app-theme-content flex min-h-screen bg-grid-fade">
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col">
            <TopBar />
            <main className="flex-1 px-4 py-4 pb-24 lg:px-12 lg:py-8 lg:pb-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
