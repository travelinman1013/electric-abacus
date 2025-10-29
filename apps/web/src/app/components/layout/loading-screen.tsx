import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  label?: string;
}

export const LoadingScreen = ({ label = 'Loading...' }: LoadingScreenProps) => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground" role="status" aria-live="polite">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  </div>
);
