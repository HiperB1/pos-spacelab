import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
}

export function Card({ children, className = '', header }: CardProps) {
  return (
    <div className={`bg-surface rounded-lg shadow-lg border border-border ${className}`}>
      {header && (
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          {typeof header === 'string' ? (
            <h3 className="text-lg font-semibold text-white">{header}</h3>
          ) : header}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  action?: ReactNode;
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {action}
    </div>
  );
}