
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScheduleDetail {
  day_of_week: number;
  start_time: string;
  end_time: string;
  shift_name: string;
  horario_name: string;
}

interface SpecialistScheduleDetailsProps {
  specialistId: string;
  schedules: ScheduleDetail[];
  isVisible: boolean;
  onToggle: () => void;
}

export function SpecialistScheduleDetails({
  specialistId,
  schedules,
  isVisible,
  onToggle
}: SpecialistScheduleDetailsProps) {
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
  
  // Agrupar horarios por día de la semana
  const schedulesByDay = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.day_of_week]) {
      acc[schedule.day_of_week] = [];
    }
    acc[schedule.day_of_week].push(schedule);
    return acc;
  }, {} as Record<number, ScheduleDetail[]>);

  // Obtener el número máximo de turnos en cualquier día para determinar las filas
  const maxShiftsPerDay = Math.max(
    ...Object.values(schedulesByDay).map(daySchedules => daySchedules.length),
    1
  );

  if (!specialistId) {
    return null;
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 hover:bg-gray-100"
      >
        <span className="font-medium">Mostrar detalles del especialista</span>
        {isVisible ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {isVisible && (
        <div className="mt-4">
          {schedules.length > 0 && schedules[0].horario_name && (
            <div className="mb-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
              <h4 className="text-sm font-medium text-blue-800">
                Horario Activo: {schedules[0].horario_name}
              </h4>
            </div>
          )}
          <h4 className="text-sm font-medium mb-3 text-gray-700">
            Días y turnos asignados
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                {dayNames.map((day, index) => (
                  <TableHead key={index} className="text-center text-xs font-semibold">
                    {day}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: maxShiftsPerDay }, (_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {dayNames.map((_, dayIndex) => {
                    const daySchedules = schedulesByDay[dayIndex] || [];
                    const schedule = daySchedules[rowIndex];
                    
                    return (
                      <TableCell key={dayIndex} className="text-center text-xs p-2">
                        {schedule ? (
                          <div className="space-y-1">
                            <div className="font-medium text-blue-600">
                              {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                            </div>
                            {schedule.shift_name && (
                              <div className="text-gray-500 text-xs">
                                {schedule.shift_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {schedules.length === 0 && (
            <p className="text-center text-gray-500 text-sm mt-4">
              No hay horarios configurados para este especialista
            </p>
          )}
        </div>
      )}
    </div>
  );
}
