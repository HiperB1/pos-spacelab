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
    const baseStyles = 'inline-flex items-center justify-center font-extrabold rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] tracking-widest uppercase';

    const variants = {
      primary: 'bg-primary text-primary-foreground hover:brightness-110 hover:shadow-lg hover:shadow-primary/30',
      secondary: 'bg-white/5 text-primary hover:bg-white/10 hover:shadow-lg hover:shadow-black/20 border-2 border-primary/20',
      danger: 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border-2 border-red-500/20',
      ghost: 'bg-transparent text-white/40 hover:text-primary hover:bg-white/5',
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