import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input = ({ label, icon: Icon, ...props }: any) => {
  return (
    <div className="flex flex-col gap-2 w-full group">
      {label && <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1 transition-colors group-focus-within:text-accent-orange">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-accent-orange transition-colors" />}
        <input
          {...props}
          className={`w-full ${Icon ? 'pl-12' : 'px-4'} py-3.5 rounded-xl bg-white/5 border border-white/10 text-white outline-hidden focus:border-accent-orange/50 focus:ring-4 focus:ring-accent-orange/10 transition-all placeholder:text-text-muted/50 ${props.className || ''}`}
        />
      </div>
    </div>
  );
};

export const Button = ({ children, className = '', variant = 'primary', loading = false, size = 'md', ...props }: any) => {
  const baseClasses = "relative overflow-hidden transition-all duration-300 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const sizeClasses: any = {
    sm: "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg",
    md: "px-8 py-3.5 text-sm font-black uppercase tracking-widest rounded-xl",
    lg: "px-10 py-4 text-base font-black uppercase tracking-widest rounded-2xl"
  };

  const variants: any = {
    primary: "bg-linear-to-r from-accent-orange to-accent-magenta text-white shadow-lg shadow-accent-magenta/20 hover:shadow-accent-magenta/40",
    secondary: "bg-white/5 text-white border border-white/10 hover:bg-white/10",
    danger: "bg-danger/20 text-danger border border-danger/30 hover:bg-danger/40",
    ghost: "bg-transparent text-text-secondary hover:text-white hover:bg-white/5"
  };
  
  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : children}
    </button>
  );
};

export const Card = ({ children, className = '', hover = false }: { children: React.ReactNode, className?: string, hover?: boolean }) => {
  return (
    <div className={`glass p-8 rounded-[2rem] border-white/10 ${hover ? 'hover:border-white/20 hover:bg-white/5 transition-all duration-500' : ''} ${className}`}>
      {children}
    </div>
  );
};

