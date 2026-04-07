
import React from 'react';
import { cn } from '@/lib/utils';

interface TimeSlotProps {
  hour: number;
  date: Date;
  onSlotClick?: (date: Date, hour: number) => void;
  className?: string;
}

export function TimeSlot({ hour, date, onSlotClick, className }: TimeSlotProps) {
  const handleClick = () => {
    if (onSlotClick) {
      onSlotClick(date, hour);
    }
  };

  return (
    <div
      className={cn(
        "h-[80px] border-b border-gray-100 cursor-pointer transition-colors duration-200",
        "hover:bg-blue-50 hover:border-blue-200",
        "group relative",
        className
      )}
      onClick={handleClick}
    >
      {/* Hover effect overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-full h-full bg-blue-100/50 border-2 border-blue-300 border-dashed rounded flex items-center justify-center">
          <span className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Crear cita {hour}:00
          </span>
        </div>
      </div>
    </div>
  );
}
