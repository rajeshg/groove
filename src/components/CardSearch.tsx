"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "~/components/ui/input";

export interface CardSearchProps {
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

export function CardSearch({
  onSearchChange,
  placeholder = "Search cards...",
}: CardSearchProps) {
  const [query, setQuery] = useState("");

  const handleChange = (value: string) => {
    setQuery(value);
    onSearchChange(value);
  };

  const handleClear = () => {
    setQuery("");
    onSearchChange("");
  };

  return (
    <div className="relative w-full max-w-full">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex-shrink-0"
        size={18}
      />
      <Input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 flex-shrink-0"
          title="Clear search"
          aria-label="Clear search"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
