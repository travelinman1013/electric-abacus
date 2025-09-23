import * as React from 'react';

import { cn } from '../../lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  requiredIndicator?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, requiredIndicator = false, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium text-slate-700 flex items-center gap-1', className)}
      {...props}
    >
      {children}
      {requiredIndicator ? <span className="text-destructive">*</span> : null}
    </label>
  )
);

Label.displayName = 'Label';
