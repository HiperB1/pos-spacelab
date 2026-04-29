import { ButtonHTMLAttributes, forwardRef, ElementType } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  as?: ElementType;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, disabled, as: Component = 'button', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-sm';

    const variants = {
      primary: 'bg-gradient-to-r from-primary to-blue-600 text-white hover:brightness-110 hover:shadow-xl hover:shadow-primary/20',
      secondary: 'bg-white/5 text-white hover:bg-white/10 hover:shadow-xl hover:shadow-black/20 border border-white/10',
      danger: 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-xl hover:shadow-red-500/20 border border-red-500/20',
      ghost: 'bg-transparent text-text-secondary hover:text-white hover:bg-white/5',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <Component
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </Component>
    );
  }
);

Button.displayName = 'Button';