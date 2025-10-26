import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StepperProps {
  currentStep: number;
  steps: string[];
}

export const Stepper = ({ currentStep, steps }: StepperProps) => {
  return (
    <nav aria-label="Signup progress" className="w-full">
      <ol className="flex items-center justify-center space-x-2 sm:space-x-4" role="list">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isFuture = index > currentStep;

          return (
            <li key={step} className="flex items-center">
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                {/* Step circle */}
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                    isCompleted &&
                      'border-primary bg-primary text-primary-foreground',
                    isCurrent && 'border-primary bg-background text-primary',
                    isFuture && 'border-slate-300 bg-background text-slate-400'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Step ${stepNumber}: ${step}`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-label="Completed" />
                  ) : (
                    stepNumber
                  )}
                </div>

                {/* Step label - visible on all screen sizes, smaller on mobile */}
                <span
                  className={cn(
                    'text-xs sm:text-sm font-medium',
                    isCompleted && 'text-primary',
                    isCurrent && 'text-primary',
                    isFuture && 'text-slate-400'
                  )}
                  aria-hidden="true"
                >
                  {step}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'ml-2 sm:ml-4 h-0.5 w-8 sm:w-12 transition-colors',
                    isCompleted ? 'bg-primary' : 'bg-slate-300'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
