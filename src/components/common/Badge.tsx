import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert, Info } from 'lucide-react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'held'
  | 'neutral'
  | 'accent'
  | 'secondary'
  | 'danger'
  | 'outline'
  | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  icon = true,
  className = '',
  size = 'md',
}) => {
  const normalizedVariant =
    variant === 'secondary' || variant === 'outline'
      ? 'neutral'
      : variant === 'danger'
      ? 'error'
      : variant === 'info'
      ? 'accent'
      : variant;

  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    error: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    held: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    accent: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  }[normalizedVariant];

  const sizeStyles = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  const defaultIcons = {
    success: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    warning: <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    error: <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    held: <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    neutral: null,
    accent: <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  }[normalizedVariant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-md whitespace-nowrap ${variantStyles} ${sizeStyles} ${className}`}
    >
      {icon && defaultIcons}
      <span>{children}</span>
    </span>
  );
};
