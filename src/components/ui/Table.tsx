'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
}

export const Table: React.FC<TableProps> = ({ children, className }) => {
  return (
    <div className="overflow-x-auto">
      <table className={cn('min-w-full divide-y divide-neutral-200', className)}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => {
  return (
    <thead className={cn('bg-[#FFE5E7]/50', className)}>
      {children}
    </thead>
  );
};

export const TableRow: React.FC<TableRowProps> = ({ children, className, hover = true }) => {
  return (
    <tr
      className={cn(
        'border-b border-neutral-200',
        hover && 'hover:bg-[#FFE5E7]/30 transition-colors',
        className
      )}
    >
      {children}
    </tr>
  );
};

export const TableCell: React.FC<TableCellProps> = ({ children, className, align = 'left', colSpan }) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td colSpan={colSpan} className={cn('px-6 py-4 whitespace-nowrap', alignClasses[align], className)}>
      {children}
    </td>
  );
};

export const TableHead: React.FC<TableCellProps> = ({ children, className, align = 'left' }) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <th className={cn('px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider', alignClasses[align], className)}>
      {children}
    </th>
  );
};

