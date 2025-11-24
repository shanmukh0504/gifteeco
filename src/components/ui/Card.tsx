'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  hover = false,
  padding = 'md'
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-neutral-200',
        paddingClasses[padding],
        hover && 'hover:shadow-md hover:border-[#FF9AA2]/30 transition-all duration-200',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;

