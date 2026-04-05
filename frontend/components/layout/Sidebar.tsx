"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Compass, GitBranch, Info, Map, Network } from "lucide-react";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/explore", label: "Narrative Explorer", icon: Compass },
  { href: "/landscape", label: "Topic Landscape", icon: Map },
  { href: "/network", label: "Community Network", icon: Network },
];

const repoUrl = process.env.NEXT_PUBLIC_REPO_URL?.trim();

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-[#e5e7eb] bg-white lg:flex">
        <div className="p-6">
          <div className="rounded-3xl border border-[#e5e7eb] bg-[#f8f9fa] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-[#c0522b]">SimPPL</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#1a1a3e]">NarrativeScope</h1>
            <p className="mt-2 text-sm text-[#6b7280]">
              Investigative intelligence for Reddit political discourse.
            </p>
          </div>
        </div>
 
        <nav className="flex flex-1 flex-col gap-2 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#3730a3] text-white"
                    : "text-[#374151] hover:bg-[#f3f4f6] hover:text-[#111827]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <Separator className="my-4" />

          {repoUrl ? (
            <Link
              href={repoUrl}
              target="_blank"
              className="flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium text-[#374151] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
            >
              <GitBranch className="h-4 w-4" />
              <span>GitHub</span>
            </Link>
          ) : null}

          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button className="mt-auto mb-4 flex items-center gap-3 rounded-full px-4 py-3 text-left text-sm font-medium text-[#374151] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]">
                  <Info className="h-4 w-4" />
                  <span>Dataset Context</span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  className="max-w-xs rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-xs text-[#374151] shadow-lg"
                >
                  Reddit political discourse from the SimPPL assignment dataset, validated locally and
                  ready for hosted analysis.
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </nav>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e5e7eb] bg-white/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-3 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition-colors",
                  active
                    ? "bg-[#3730a3] text-white"
                    : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
