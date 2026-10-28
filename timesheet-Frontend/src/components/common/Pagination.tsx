import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 25, 50],
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  if (totalItems === 0) {
    return null;
  }

  const startItem = (safeCurrentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis (e.g. 1 ... 4 5 6 ... 10)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (safeCurrentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={`px-4 py-3 border-t border-border bg-surface-subtle/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-medium select-none ${className}`}
    >
      {/* Showing entries info */}
      <div className="flex items-center gap-2">
        <span>
          Showing <strong className="font-extrabold text-foreground">{startItem}</strong> to{' '}
          <strong className="font-extrabold text-foreground">{endItem}</strong> of{' '}
          <strong className="font-extrabold text-foreground">{totalItems}</strong> entries
        </span>
      </div>

      <div className="flex items-center gap-4 flex-wrap justify-end">
        {/* Page size dropdown if supported */}
        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onItemsPerPageChange(newSize);
                onPageChange(1);
              }}
              className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
            title="First Page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-muted-foreground font-bold">
                    …
                  </span>
                );
              }
              const isCurrent = p === safeCurrentPage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(Number(p))}
                  className={`min-w-[28px] h-7 px-2 rounded-lg font-bold text-xs transition-all ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/25'
                      : 'bg-card border border-border text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safeCurrentPage === totalPages}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
            title="Last Page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
