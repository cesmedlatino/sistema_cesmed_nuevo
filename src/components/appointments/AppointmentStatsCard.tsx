
import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';

interface AppointmentStatsCardProps {
  specialistName: string;
  specialistColor: string;
  totalToday: number;
  completedToday: number;
  scheduledToday: number;
  cancelledToday: number;
  unscheduledToday: number;
  isSelected?: boolean;
  onClick?: () => void;
}

export function AppointmentStatsCard({
  specialistName,
  specialistColor,
  totalToday,
  completedToday,
  scheduledToday,
  cancelledToday,
  unscheduledToday,
  isSelected = false,
  onClick
}: AppointmentStatsCardProps) {
  return (
    <Card 
      className={`p-3 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-md' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
          style={{ backgroundColor: specialistColor }}
        />
        <span className="text-sm font-medium text-foreground truncate">{specialistName}</span>
        {isSelected && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-auto flex-shrink-0">
            Filtrado
          </span>
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-foreground">{totalToday}</span>
          <span className="text-muted-foreground">total</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5" title="Completadas">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span className="text-green-600 font-medium">{completedToday}</span>
          </div>
          
          <div className="flex items-center gap-0.5" title="Programadas">
            <Clock className="h-3 w-3 text-primary" />
            <span className="text-primary font-medium">{scheduledToday}</span>
          </div>
          
          {unscheduledToday > 0 && (
            <div className="flex items-center gap-0.5" title="Sin Programar">
              <AlertTriangle className="h-3 w-3 text-orange-500" />
              <span className="text-orange-500 font-medium">{unscheduledToday}</span>
            </div>
          )}
          
          {cancelledToday > 0 && (
            <div className="flex items-center gap-0.5" title="Anuladas">
              <X className="h-3 w-3 text-destructive" />
              <span className="text-destructive font-medium">{cancelledToday}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
