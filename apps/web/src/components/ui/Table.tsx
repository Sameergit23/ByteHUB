import React from "react";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  caption?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  caption,
  className = "",
}: TableProps<T>) {
  return (
    <div className={`w-full ${className}`}>
      {/* Desktop & Tablet Table view (hidden on small mobile) */}
      <div className="hidden md:block overflow-x-auto border border-editorial-border bg-white">
        <table className="w-full text-left border-collapse">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-editorial-border bg-editorial-surface text-xs font-mono text-editorial-muted">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`py-3.5 px-4 font-bold tracking-wider ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left"
                  } ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-editorial-line text-sm font-sans">
            {data.map((item) => (
              <tr key={keyExtractor(item)} className="hover:bg-canvas transition-colors">
                {columns.map((col, cIdx) => (
                  <td
                    key={cIdx}
                    className={`py-4 px-4 ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${col.className || ""}`}
                  >
                    {col.cell
                      ? col.cell(item)
                      : col.accessorKey
                      ? String(item[col.accessorKey])
                      : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards view (visible on < md / 768px, perfect for 360px viewport) */}
      <div className="md:hidden space-y-4">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            className="border border-editorial-border bg-white p-4 space-y-3"
          >
            {columns.map((col, cIdx) => (
              <div
                key={cIdx}
                className="flex items-center justify-between gap-2 border-b border-editorial-line last:border-b-0 pb-2 last:pb-0"
              >
                <span className="text-xs font-mono text-editorial-muted">{col.header}</span>
                <div className="text-sm text-ink text-right">
                  {col.cell
                    ? col.cell(item)
                    : col.accessorKey
                    ? String(item[col.accessorKey])
                    : null}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
