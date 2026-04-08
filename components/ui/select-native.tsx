import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SelectNativeProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
SelectNative.displayName = 'SelectNative';
