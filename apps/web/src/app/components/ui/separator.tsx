import { cn } from '../../lib/utils';

export const Separator = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('h-px w-full bg-slate-200', className)} {...props} />
);
