"use client";

import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

interface TodoFiltersProps {
  activeFilter: "all" | "active" | "completed";
  onFilterChange: (filter: "all" | "active" | "completed") => void;
}

export function TodoFilters({
  activeFilter,
  onFilterChange,
}: TodoFiltersProps) {
  const filters: Array<{
    value: "all" | "active" | "completed";
    label: string;
  }> = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            variant={activeFilter === filter.value ? "default" : "outline"}
            onClick={() => onFilterChange(filter.value)}
            className="flex-1"
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
