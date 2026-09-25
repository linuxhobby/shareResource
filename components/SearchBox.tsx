"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  defaultValue?: string;
  hotKeywords?: string[];
  autoFocusHotKey?: boolean;
}

export default function SearchBox({ defaultValue = "", hotKeywords = [], autoFocusHotKey = false }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [keyword, setKeyword] = useState(defaultValue);

  useEffect(() => {
    if (!autoFocusHotKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [autoFocusHotKey]);

  const submit = (value: string) => {
    const q = value.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(keyword);
        }}
        className="group relative flex items-center gap-2 rounded-2xl border border-white/10 bg-space-900/70 p-2 pl-4 shadow-card backdrop-blur-md transition focus-within:border-star/60 focus-within:shadow-glow sm:gap-3 sm:p-2.5 sm:pl-5"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-star-light">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.6-3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索电影、软件、模板、电子书、AI 资源…"
          aria-label="搜索资源"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-white outline-none placeholder:text-slate-500 sm:text-lg"
        />
        {autoFocusHotKey && (
          <kbd className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400 sm:block">
            ⌘K
          </kbd>
        )}
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-gradient-to-r from-star to-baidu px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-star/25 transition hover:brightness-110 active:scale-[.98] sm:px-6"
        >
          搜索
        </button>
      </form>

      {hotKeywords.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-slate-500">热门：</span>
          {hotKeywords.map((word) => (
            <button
              key={word}
              onClick={() => submit(word)}
              className="chip hover:border-star/50 hover:text-white"
            >
              {word}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
