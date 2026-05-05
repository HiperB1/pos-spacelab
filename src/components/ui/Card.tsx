import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
}

export function Card({ children, className = '', header }: CardProps) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      {header && (
        <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between bg-white/[0.02]">
          {typeof header === 'string' ? (
            <h3 className="text-xl font-black text-primary uppercase tracking-tighter">{header}</h3>
          ) : header}
        </div>
      )}
      <div className="p-8">
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