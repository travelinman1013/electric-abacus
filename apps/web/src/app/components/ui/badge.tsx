import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'secondary';
}

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => {
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-slate-200 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    secondary: 'bg-slate-900 text-white'
  };

  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)}
      {...props}
    />
  );
};
