import { ReactNode } from 'react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  emptyMessage?: string;
}

export function Table<T extends Record<string, any>>({ 
  columns, 
  data, 
  keyField, 
  emptyMessage = 'No hay datos' 
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-white/[0.02]">
            {columns.map((col) => (
              <th 
                key={String(col.key)} 
                className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-widest border-b border-white/5"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center text-text-secondary italic">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr 
                key={String(item[keyField])} 
                className="hover:bg-white/[0.03] transition-all duration-200 group"
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-6 py-4 text-sm text-white/90 group-hover:text-white">
                    {col.render ? col.render(item) : String(item[col.key] ?? '')}
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

interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export function PaginationInfo({ currentPage, totalPages, totalItems, itemsPerPage }: PaginationInfoProps) {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  
  return (
    <p className="text-sm text-text-secondary">
      Mostrando {start}-{end} de {totalItems} resultados
      {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
    </p>
  );
}