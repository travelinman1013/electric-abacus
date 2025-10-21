import * as React from 'react';
import { cn } from '../../lib/utils';

interface ColumnResizeHandleProps {
  onResize: (newWidth: number) => void;
  onResizeEnd?: () => void;
  currentWidth: number;
  isLocked?: boolean;
  isResizing?: boolean;
}

export const ColumnResizeHandle = ({
  onResize,
  onResizeEnd,
  currentWidth,
  isLocked,
  isResizing
}: ColumnResizeHandleProps) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = currentWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = startWidth + deltaX;
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onResizeEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      className={cn(
        'absolute right-0 top-0 h-full w-2 -mr-1 cursor-col-resize group hover:bg-blue-200/50',
        isLocked && 'cursor-not-allowed opacity-50 hover:bg-transparent',
      )}
      onMouseDown={handleMouseDown}
      style={{ zIndex: 10 }}
    >
      <div
        className={cn(
          'absolute right-0 top-0 h-full w-0.5 bg-slate-300 transition-all',
          !isLocked && 'group-hover:w-1 group-hover:bg-blue-500',
          isResizing && 'w-1 bg-blue-500',
        )}
      />
    </div>
  );
};
