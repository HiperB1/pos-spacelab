import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ show, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [show, onClose]);

  if (!show) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const content = (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className={`w-full ${sizes[size]} mx-4 bg-background border border-white/5 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 overflow-hidden`}>
        {title && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}