import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";

/**
 * Modern, dynamic pagination component matching MISXMATCH design system.
 * Works seamlessly with Spring Boot Pageable (0-indexed) or client arrays.
 */
export default function Pagination({
  page = 0,
  totalPages = 1,
  totalElements = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  loading = false,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = "records",
  showPageSize = true,
  className = "",
}) {
  // If no records at all, don't show pagination clutter
  if (totalElements === 0 && totalPages <= 1) {
    return null;
  }

  const currentPage = Math.max(0, Number(page) || 0);
  const total = Math.max(1, Number(totalPages) || 1);
  const effectiveSize = Math.max(1, Number(pageSize) || 10);
  const fromRecord = totalElements === 0 ? 0 : currentPage * effectiveSize + 1;
  const toRecord = Math.min(totalElements, (currentPage + 1) * effectiveSize);

  // Generate page numbers with smart ellipsis:
  // e.g. 1 2 3 4 5 6 7
  // or 1 2 3 ... 16
  // or 1 ... 7 8 9 ... 16
  const getPageNumbers = () => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i);
    }

    const pages = [];
    const current = currentPage;

    if (current <= 3) {
      // Near start: 0, 1, 2, 3, 4, 'ellipsis', total - 1
      for (let i = 0; i <= 4; i++) pages.push(i);
      pages.push("ellipsis-right");
      pages.push(total - 1);
    } else if (current >= total - 4) {
      // Near end: 0, 'ellipsis', total - 5, total - 4, total - 3, total - 2, total - 1
      pages.push(0);
      pages.push("ellipsis-left");
      for (let i = total - 5; i < total; i++) pages.push(i);
    } else {
      // Middle: 0, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total - 1
      pages.push(0);
      pages.push("ellipsis-left");
      pages.push(current - 1);
      pages.push(current);
      pages.push(current + 1);
      pages.push("ellipsis-right");
      pages.push(total - 1);
    }

    return pages;
  };

  const handlePageClick = (p) => {
    if (loading || p === currentPage || p < 0 || p >= total) return;
    if (onPageChange) onPageChange(p);
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-4 bg-surface/80 backdrop-blur-xs rounded-2xl border border-app shadow-xs ${className}`}
    >
      {/* Left: Summary Counter & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <div>
          Showing <strong className="text-app font-semibold">{fromRecord}</strong> to{" "}
          <strong className="text-app font-semibold">{toRecord}</strong> of{" "}
          <strong className="text-app font-bold">{totalElements.toLocaleString()}</strong> {itemLabel}
        </div>

        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-app/60">
            <span className="text-[11px] text-muted">Per page:</span>
            <select
              value={effectiveSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={loading}
              className="bg-surface-2 border border-app text-app rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-navy-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" /> Fetching...
          </div>
        )}
      </div>

      {/* Right: Dynamic Pagination Controls */}
      <div className="flex items-center gap-1 select-none">
        {/* Fast jump: First page */}
        <button
          type="button"
          onClick={() => handlePageClick(0)}
          disabled={loading || currentPage === 0}
          title="First Page"
          className="p-1.5 rounded-lg border border-app/60 hover:bg-surface-2 text-muted hover:text-app disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={loading || currentPage === 0}
          title="Previous Page"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-app/60 hover:bg-surface-2 text-muted hover:text-app disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Dynamic Page Numbers */}
        <div className="flex items-center gap-1 px-1">
          {pageNumbers.map((p, idx) => {
            if (typeof p === "string") {
              return (
                <span key={`ell-${idx}`} className="px-1 text-xs text-muted/60 select-none">
                  •••
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePageClick(p)}
                disabled={loading}
                className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-navy-600 dark:bg-teal-600 text-white shadow-xs font-bold ring-1 ring-navy-400/30"
                    : "border border-transparent hover:border-app hover:bg-surface-2 text-muted hover:text-app"
                }`}
              >
                {p + 1}
              </button>
            );
          })}
        </div>

        {/* Next page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={loading || currentPage >= total - 1}
          title="Next Page"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-app/60 hover:bg-surface-2 text-muted hover:text-app disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Fast jump: Last page */}
        <button
          type="button"
          onClick={() => handlePageClick(total - 1)}
          disabled={loading || currentPage >= total - 1}
          title="Last Page"
          className="p-1.5 rounded-lg border border-app/60 hover:bg-surface-2 text-muted hover:text-app disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
