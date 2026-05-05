import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 ml-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            w-full px-6 py-4 bg-white/5 border-2 rounded-2xl text-white placeholder-white/20
            transition-all duration-300
            focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500/50 ring-red-500/10' : 'border-white/5 hover:bg-white/10'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';