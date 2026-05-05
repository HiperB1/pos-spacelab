import { ReactNode, useState, useMemo, useEffect } from 'react';
import { Database, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

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
  pageSizeOptions?: number[];
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
  pageSizeOptions = [10, 25, 50, 100],
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
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters, currentPageSize]);

  useEffect(() => {
    if (onSelect) {
      onSelect(Array.from(selectedIds));
    }
  }, [selectedIds, onSelect]);

  useEffect(() => {
    // Reset selection when page size changes
    setSelectedIds(new Set());
    setCurrentPage(1);
  }, [currentPageSize]);

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
    const start = (currentPage - 1) * currentPageSize;
    return sortedData.slice(start, start + currentPageSize);
  }, [sortedData, paginated, currentPage, currentPageSize]);

  const totalPages = Math.ceil(sortedData.length / currentPageSize);

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

      {paginated && (
        <div className="data-table-pagination" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: 16, 
          padding: '12px 16px', 
          flexWrap: 'wrap', 
          gap: 16,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              padding: '6px 12px',
              background: 'rgba(0, 212, 255, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(0, 212, 255, 0.2)'
            }}>
              <Database size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                {sortedData.length <= currentPageSize 
                  ? `${sortedData.length} resultado${sortedData.length !== 1 ? 's' : ''}`
                  : `Mostrando ${((currentPage - 1) * currentPageSize) + 1}-${Math.min(currentPage * currentPageSize, sortedData.length)} de ${sortedData.length}`
                }
              </span>
            </div>
            {sortedData.length > currentPageSize && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={14} style={{ color: 'var(--text-secondary)' }} />
                <select
                  value={currentPageSize}
                  onChange={e => setCurrentPageSize(Number(e.target.value))}
                  style={{
                    padding: '5px 8px',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {pageSizeOptions.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: currentPage === 1 ? 'transparent' : 'var(--surface)',
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <ChevronLeft size={16} />
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 32,
                    height: 32,
                    padding: '0 8px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: currentPage === pageNum ? 'var(--primary)' : 'transparent',
                    color: currentPage === pageNum ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: currentPage === pageNum ? 600 : 400,
                    transition: 'all 0.2s ease'
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: currentPage === totalPages ? 'transparent' : 'var(--surface)',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          )}
        </div>
      )}
    </div>
  );
}