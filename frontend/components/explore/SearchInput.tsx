"use client";

import { useEffect, useState } from "react";
import { Languages, Search } from "lucide-react";
import { franc } from "franc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const languageNames: Record<string, string> = {
  ara: "Arabic",
  cmn: "Chinese",
  eng: "English",
  fra: "French",
  deu: "German",
  rus: "Russian",
  spa: "Spanish",
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  validationMessage: string | null;
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  loading,
  validationMessage,
}: Props) {
  const [language, setLanguage] = useState("Multilingual search active");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const code = value.trim().length >= 3 ? franc(value.trim(), { minLength: 3 }) : "und";
      if (code === "und") {
        setLanguage("Multilingual search active");
      } else {
        setLanguage(`Searching in ${languageNames[code] ?? code.toUpperCase()}`);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [value]);

  return (
    <div className="glass-panel rounded-[2rem] p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
            <Input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSubmit();
                }
              }}
              placeholder="Ask about narratives, communities, or specific actors..."
              className="h-14 rounded-3xl pl-11 text-base"
            />
          </div>
          <Button onClick={onSubmit} disabled={loading} className="h-14 rounded-3xl px-6">
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge className="gap-2 border-[#f3c6b6] bg-[#fff3ef] text-[#c0522b]">
            <Languages className="h-3.5 w-3.5" />
            <span>{language}</span>
          </Badge>
          {validationMessage ? (
            <p className="text-sm text-[#6b2d50]">{validationMessage}</p>
          ) : (
            <p className="text-sm text-[#6b7280]">
              Semantic retrieval plus grounded answers over the dataset.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

