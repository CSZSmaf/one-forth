import Link from "next/link";
import { createIndexHref, type IndexSearchParams, type PaginatedResult } from "@/lib/index-query";

interface IndexPaginationProps {
  readonly pathname: string;
  readonly searchParams: IndexSearchParams;
  readonly pagination: Pick<
    PaginatedResult<unknown>,
    "page" | "totalPages" | "totalItems" | "offset" | "items"
  >;
  readonly itemLabel: string;
}

export function IndexPagination({
  pathname,
  searchParams,
  pagination,
  itemLabel,
}: IndexPaginationProps) {
  const firstVisible = pagination.totalItems === 0 ? 0 : pagination.offset + 1;
  const lastVisible = pagination.offset + pagination.items.length;
  return (
    <nav className="index-pagination" aria-label={`${itemLabel}分页`}>
      <div>
        {pagination.page > 1 ? (
          <Link
            rel="prev"
            href={createIndexHref(pathname, searchParams, {
              page: pagination.page - 1 === 1 ? null : pagination.page - 1,
            })}
          >
            上一页
          </Link>
        ) : (
          <span aria-disabled="true">上一页</span>
        )}
        <p aria-live="polite">
          第 {pagination.page} / {pagination.totalPages} 页 · 显示 {firstVisible}–{lastVisible}，共{" "}
          {pagination.totalItems} {itemLabel}
        </p>
        {pagination.page < pagination.totalPages ? (
          <Link
            rel="next"
            href={createIndexHref(pathname, searchParams, { page: pagination.page + 1 })}
          >
            下一页
          </Link>
        ) : (
          <span aria-disabled="true">下一页</span>
        )}
      </div>
    </nav>
  );
}
