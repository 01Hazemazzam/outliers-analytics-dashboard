"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel?: string;
}

export function FilterSelect({ label, value, onChange, options, allLabel = "All" }: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
        <SelectTrigger size="sm" className="w-full min-w-[140px]">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
