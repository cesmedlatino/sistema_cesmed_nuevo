import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, FileText, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MedicalRecord {
  id: string;
  hms: string;
  visit_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  form_data: any;
  especialidad: string;
  medical_record_templates: {
    id: string;
    name: string;
    title: string;
    header_config: any;
    body_config: any[];
    footer_config: any;
    logo_url: string;
  };
}

interface MedicalHistoryCalendarSidebarProps {
  records: MedicalRecord[];
  currentIndex: number;
  onSelectRecord: (index: number) => void;
  onCreateNewFolio: () => void;
  onDeleteRecord?: (recordId: string, hms: string) => void;
  patientName: string;
}

// Helper to parse date strings as local dates (avoids UTC timezone shift)
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function MedicalHistoryCalendarSidebar({
  records,
  currentIndex,
  onSelectRecord,
  onCreateNewFolio,
  onDeleteRecord,
  patientName,
}: MedicalHistoryCalendarSidebarProps) {
  // Current viewed month in calendar
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (records.length > 0) {
      return startOfMonth(parseLocalDate(records[0].visit_date));
    }
    return startOfMonth(new Date());
  });

  // Create a set of dates that have records for quick lookup
  const recordDates = useMemo(() => {
    const dates: { date: Date; records: { index: number; record: MedicalRecord }[] }[] = [];
    
    records.forEach((record, index) => {
      const date = parseLocalDate(record.visit_date);
      const existing = dates.find(d => isSameDay(d.date, date));
      if (existing) {
        existing.records.push({ index, record });
      } else {
        dates.push({ date, records: [{ index, record }] });
      }
    });
    
    return dates;
  }, [records]);

  // Get records for the selected date
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (records.length > 0) {
      return parseLocalDate(records[currentIndex]?.visit_date);
    }
    return undefined;
  });

  const recordsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return recordDates.find(d => isSameDay(d.date, selectedDate))?.records || [];
  }, [selectedDate, recordDates]);

  // Manejar la selección de fecha
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    
    // Auto-select the first record for this date if exists
    const dateRecords = recordDates.find(d => isSameDay(d.date, date));
    if (dateRecords && dateRecords.records.length > 0) {
      onSelectRecord(dateRecords.records[0].index);
    }
  };

  // Custom day content to show indicators
  const modifiers = useMemo(() => {
    return {
      hasRecord: recordDates.map(d => d.date),
      selected: records[currentIndex] ? parseLocalDate(records[currentIndex].visit_date) : undefined,
    };
  }, [recordDates, records, currentIndex]);

  // Navigation functions
  const goToPrevMonth = () => setViewMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setViewMonth(prev => addMonths(prev, 1));

  // Generate year options (last 10 years to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 10 + i);

  // Generate month options
  const months = [
    { value: 0, label: 'Enero' },
    { value: 1, label: 'Febrero' },
    { value: 2, label: 'Marzo' },
    { value: 3, label: 'Abril' },
    { value: 4, label: 'Mayo' },
    { value: 5, label: 'Junio' },
    { value: 6, label: 'Julio' },
    { value: 7, label: 'Agosto' },
    { value: 8, label: 'Septiembre' },
    { value: 9, label: 'Octubre' },
    { value: 10, label: 'Noviembre' },
    { value: 11, label: 'Diciembre' },
  ];

  const handleMonthChange = (monthValue: string) => {
    const newMonth = parseInt(monthValue, 10);
    setViewMonth(new Date(viewMonth.getFullYear(), newMonth, 1));
  };

  const handleYearChange = (yearValue: string) => {
    const newYear = parseInt(yearValue, 10);
    setViewMonth(new Date(newYear, viewMonth.getMonth(), 1));
  };

  return (
    <div className="w-80 border-r bg-muted/30 flex flex-col h-full print:hidden">
      {/* Header con botón Nuevo Folio */}
      <div className="p-4 border-b bg-background space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Historias Clínicas
          </h3>
          <Badge variant="secondary">{records.length}</Badge>
        </div>
        <Button 
          onClick={onCreateNewFolio}
          className="w-full bg-primary hover:bg-primary/90"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Folio
        </Button>
      </div>

      {/* Navegación Mes/Año */}
      <div className="px-4 py-3 border-b bg-background/50">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex gap-2">
            <Select value={viewMonth.getMonth().toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={viewMonth.getFullYear().toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="h-8 text-xs w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendario */}
      <div className="px-2 py-2 border-b">
        <CalendarComponent
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          month={viewMonth}
          onMonthChange={setViewMonth}
          locale={es}
          className="rounded-md w-full"
          classNames={{
            months: "flex flex-col",
            month: "space-y-2",
            caption: "hidden", // Ocultamos el caption porque ya tenemos nuestra propia navegación
            nav: "hidden", // Ocultamos la navegación interna
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex-1 text-center",
            row: "flex w-full mt-1",
            cell: cn(
              "relative p-0 text-center text-sm flex-1 focus-within:relative focus-within:z-20",
              "[&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50",
              "[&:has([aria-selected].day-range-end)]:rounded-r-md"
            ),
            day: cn(
              "h-9 w-9 mx-auto p-0 font-normal aria-selected:opacity-100 rounded-md",
              "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            ),
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "day-outside text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
          modifiers={{
            hasRecord: modifiers.hasRecord,
          }}
          modifiersClassNames={{
            hasRecord: "bg-primary/20 font-bold text-primary ring-2 ring-primary/30 ring-inset",
          }}
        />
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/20 ring-1 ring-primary/30"></div>
            <span>Con historia</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary"></div>
            <span>Seleccionado</span>
          </div>
        </div>
      </div>

      {/* Lista de registros de la fecha seleccionada */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-2 bg-muted/50 border-b">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {selectedDate ? (
              <>Historias del {format(selectedDate, "dd MMM yyyy", { locale: es })}</>
            ) : (
              <>Seleccione una fecha</>
            )}
          </h4>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {recordsForSelectedDate.length > 0 ? (
              recordsForSelectedDate.map(({ index, record }) => (
                <button
                  key={record.id}
                  onClick={() => onSelectRecord(index)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all",
                    currentIndex === index
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-muted bg-background border"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className={cn(
                      "h-4 w-4",
                      currentIndex === index ? "text-primary-foreground" : "text-primary"
                    )} />
                    <span className="font-mono text-sm font-bold">{record.hms}</span>
                  </div>
                  <div className={cn(
                    "text-xs",
                    currentIndex === index ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {record.especialidad}
                  </div>
                  <div className={cn(
                    "text-xs mt-1",
                    currentIndex === index ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {record.medical_record_templates?.name}
                  </div>
                </button>
              ))
            ) : selectedDate ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay historias para esta fecha</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Seleccione una fecha en el calendario</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Resumen de todas las historias */}
      <div className="p-3 border-t bg-muted/50">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Todas las Historias
        </h4>
        <ScrollArea className="h-32">
          <div className="space-y-1">
            <TooltipProvider>
              {records.map((record, index) => (
                <div
                  key={record.id}
                  className={cn(
                    "w-full flex items-center gap-1 rounded text-xs transition-all group",
                    currentIndex === index
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  )}
                >
                  <button
                    onClick={() => {
                      setSelectedDate(parseLocalDate(record.visit_date));
                      onSelectRecord(index);
                    }}
                    className="flex-1 text-left px-2 py-1.5 flex items-center justify-between"
                  >
                    <span className="font-mono">{record.hms}</span>
                    <span className="text-muted-foreground">
                      {format(parseLocalDate(record.visit_date), "dd/MM/yy")}
                    </span>
                  </button>
                  {onDeleteRecord && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRecord(record.id, record.hms);
                          }}
                          className="p-1.5 mr-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Eliminar folio</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ))}
            </TooltipProvider>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
