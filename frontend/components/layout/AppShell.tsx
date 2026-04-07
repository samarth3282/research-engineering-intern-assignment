"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

// Register here so the shell can sync it globally
gsap.registerPlugin(ScrollTrigger);

type AppShellProps = {
  children: ReactNode;
};

// Global scroll observer to hook Lenis into GSAP
function GsapTickerSync() {
  useLenis(ScrollTrigger.update);
  return null;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLandingRoute = pathname === "/";

  useEffect(() => {
    // Prevent GSAP's built-in lag smoothing from fighting Lenis
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.lagSmoothing(500);
    };
  }, []);

  if (isLandingRoute) {
    return (
      <ReactLenis root>
        <GsapTickerSync />
        <div className="app-theme-content min-h-screen bg-grid-fade">
          <main className="min-h-screen">{children}</main>
        </div>
      </ReactLenis>
    );
  }

  return (
    <ReactLenis root>
      <GsapTickerSync />
      <div className="app-theme-content flex min-h-screen bg-grid-fade">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-4 pb-24 lg:px-12 lg:py-8 lg:pb-8">{children}</main>
        </div>
      </div>
    </ReactLenis>
  );
}
