import { ReactNode, useState, useMemo, useEffect } from 'react';

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: { value: string; label: string }[];
  searchable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyField: keyof T;
  searchable?: boolean;
  searchPlaceholder?: string;
  filterable?: boolean;
  sortable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  selectable?: boolean;
  onSelect?: (selectedIds: (string | number)[]) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  filterable = false,
  sortable = false,
  paginated = false,
  pageSize = 10,
  selectable = false,
  onSelect,
  emptyMessage = 'No hay datos'
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters]);

  useEffect(() => {
    if (onSelect) {
      onSelect(Array.from(selectedIds));
    }
  }, [selectedIds, onSelect]);

  const filteredData = useMemo(() => {
    let result = [...data];

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      const searchableColumns = columns.filter(col => col.searchable !== false);
      
      if (searchableColumns.length > 0) {
        result = result.filter(item =>
          searchableColumns.some(col => {
            const value = item[col.key];
            return value && String(value).toLowerCase().includes(searchLower);
          })
        );
      }
    }

    if (filterable) {
      Object.entries(filters).forEach(([key, filterValue]) => {
        if (filterValue) {
          result = result.filter(item => {
            const value = item[key];
            return String(value) === filterValue;
          });
        }
      });
    }

    return result;
  }, [data, debouncedSearch, filters, columns, filterable]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    if (!paginated) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, paginated, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const uniqueFilterOptions = useMemo(() => {
    if (!filterable) return {};
    const options: Record<string, { value: string; label: string }[]> = {};
    
    columns.forEach(col => {
      if (col.filterable) {
        const values = [...new Set(data.map(item => String(item[col.key])))].filter(Boolean).sort();
        options[col.key as string] = values.map(v => ({ value: v, label: v }));
      }
    });
    
    return options;
  }, [columns, data, filterable]);

  const handleSort = (columnKey: string) => {
    if (!sortable) return;
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedData.map(item => item[keyField])));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string | number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const allSelected = paginatedData.length > 0 && paginatedData.every(item => selectedIds.has(item[keyField]));

  return (
    <div className="data-table">
      {(searchable || filterable) && (
        <div className="data-table-toolbar" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {searchable && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                minWidth: 200
              }}
            />
          )}
          
          {filterable && columns.map(col => {
            const options = col.filterOptions || uniqueFilterOptions[col.key as string];
            if (!col.filterable || !options?.length) return null;
            
            return (
              <select
                key={col.key as string}
                value={filters[col.key as string] || ''}
                onChange={e => handleFilterChange(col.key as string, e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  minWidth: 150
                }}
              >
                <option value="">{col.header} (Todos)</option>
                {options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            );
          })}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {selectable && (
                <th style={{ width: 40, padding: '12px 8px' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={e => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {col.header}
                    {sortable && col.sortable && sortColumn === col.key && (
                      <span style={{ fontSize: 10 }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr
                  key={String(item[keyField])}
                  className="hover:bg-surface-hover transition-colors"
                  style={{ backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                >
                  {selectable && (
                    <td style={{ padding: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item[keyField])}
                        onChange={e => handleSelectRow(item[keyField], e.target.checked)}
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={String(col.key)} style={{ padding: '12px 8px', fontSize: 14, color: 'var(--text-primary)' }}>
                      {col.render ? col.render(item) : String(item[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paginated && totalPages > 1 && (
        <div className="data-table-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '8px 0' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length} resultados
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: currentPage === 1 ? 'var(--surface)' : 'var(--primary)',
                color: currentPage === 1 ? 'var(--text-secondary)' : 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: 13
              }}
            >
              Anterior
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    background: currentPage === pageNum ? 'var(--primary)' : 'var(--surface)',
                    color: currentPage === pageNum ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: currentPage === totalPages ? 'var(--surface)' : 'var(--primary)',
                color: currentPage === totalPages ? 'var(--text-secondary)' : 'white',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: 13
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}