interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  rows: any[];
  emptyText?: string;
}

export default function DataTable({ columns, rows, emptyText }: DataTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]/80 backdrop-blur">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-black/3 dark:bg-white/5">
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left text-[11px] uppercase text-[var(--text-soft)]">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!rows?.length ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-xs text-[var(--text-soft)]"
              >
                {emptyText ?? "데이터 없음"}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[var(--border)]/50 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2 align-middle">
                    {c.render ? c.render(row) : (row[c.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
