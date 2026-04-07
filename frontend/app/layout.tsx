import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { AppShell } from "@/components/layout/AppShell";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
