import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from './button';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  value?: number;
  onChange?: (value: number) => void;
  increment?: number;
  min?: number;
  max?: number;
  inputClassName?: string;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({
    className,
    inputClassName,
    value,
    onChange,
    increment = 0.25,
    min = 0,
    max,
    disabled,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [draftValue, setDraftValue] = React.useState('');

    const formattedValue = React.useMemo(() => {
      if (value === undefined || value === null) return '';
      return value.toFixed(2);
    }, [value]);

    const displayValue = isFocused ? draftValue : formattedValue;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      setDraftValue(inputValue);

      if (inputValue === '' || inputValue === '-') {
        return;
      }

      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        onChange?.(numValue);
      }
    };

    const handleIncrement = () => {
      const currentValue = value || 0;
      const newValue = Math.round((currentValue + increment) * 100) / 100;
      const clampedValue = max !== undefined ? Math.min(newValue, max) : newValue;
      onChange?.(clampedValue);
      setDraftValue(clampedValue.toString());
    };

    const handleDecrement = () => {
      const currentValue = value || 0;
      const newValue = Math.round((currentValue - increment) * 100) / 100;
      const clampedValue = Math.max(newValue, min);
      onChange?.(clampedValue);
      setDraftValue(clampedValue.toString());
    };

    const handleBlur = () => {
      setIsFocused(false);

      if (draftValue === '' || draftValue === '-') {
        onChange?.(0);
        setDraftValue('0');
        return;
      }

      const parsedValue = parseFloat(draftValue);
      if (isNaN(parsedValue)) {
        setDraftValue(formattedValue);
        return;
      }

      const clampedValue = Math.max(min, max !== undefined ? Math.min(parsedValue, max) : parsedValue);
      const roundedValue = Math.round(clampedValue * 100) / 100;

      onChange?.(roundedValue);
      setDraftValue(roundedValue.toString());
    };

    const handleFocus = () => {
      setIsFocused(true);
      if (value === undefined || value === null) {
        setDraftValue('');
      } else {
        setDraftValue(value.toString());
      }
    };

    return (
      <div
        className={cn(
          'flex h-10 w-full max-w-[5rem] items-stretch rounded-md border border-input bg-white shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0',
          disabled ? 'cursor-not-allowed bg-muted' : 'cursor-text',
          className,
        )}
      >
        <input
          ref={ref}
          type="number"
          className={cn(
            'flex-1 rounded-l-md border-0 bg-transparent px-3 py-2 text-right text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none disabled:cursor-not-allowed',
            // Hide default number input spinners
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            inputClassName,
          )}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          min={min}
          max={max}
          step={increment}
          {...props}
        />
        <div className="flex h-full w-7 flex-col border-l border-input">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 rounded-none rounded-tr-md p-0 hover:bg-muted"
            onClick={handleIncrement}
            disabled={disabled || (max !== undefined && (value || 0) >= max)}
            tabIndex={-1}
          >
            <svg
              className="h-2.5 w-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 rounded-none rounded-br-md p-0 hover:bg-slate-100"
            onClick={handleDecrement}
            disabled={disabled || (value || 0) <= min}
            tabIndex={-1}
          >
            <svg
              className="h-2.5 w-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </div>
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';
