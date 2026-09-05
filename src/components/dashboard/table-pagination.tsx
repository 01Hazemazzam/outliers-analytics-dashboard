"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({ page, pageSize, total, onPageChange }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <span>{formatNumber(total)} results</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
