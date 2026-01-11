'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      {label && (
        <motion.label
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {label}
        </motion.label>
      )}
      <input
        className={cn(
          'w-full px-4 py-2.5 border rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[#FF9AA2] focus:border-transparent focus:scale-[1.01]',
          error
            ? 'border-[#EF4444] focus:ring-[#EF4444]'
            : 'border-neutral-300 hover:border-[#FF9AA2]/50',
          'placeholder:text-neutral-400',
          className
        )}
        {...props}
      />
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-sm text-[#EF4444]"
        >
          {error}
        </motion.p>
      )}
      {helperText && !error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mt-1 text-sm text-neutral-500"
        >
          {helperText}
        </motion.p>
      )}
    </motion.div>
  );
};

export default Input;

