import { ReactNode } from 'react';

import { Label } from '../ui/label';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  description?: ReactNode;
  error?: string;
  children: ReactNode;
}

export const FormField = ({ label, htmlFor, required, description, error, children }: FormFieldProps) => (
  <div className="space-y-1">
    <Label htmlFor={htmlFor} requiredIndicator={required}>
      {label}
    </Label>
    {children}
    {description ? <p className="text-xs text-slate-500">{description}</p> : null}
    {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
  </div>
);
