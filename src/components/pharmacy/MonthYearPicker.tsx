import React, { useState, useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface MonthYearPickerProps {
  value: string; // formato YYYY-MM
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function MonthYearPicker({ value, onChange, disabled, className }: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  
  // Parse current value directly from string to avoid timezone issues
  const parseValue = (val: string) => {
    if (!val) {
      return { year: new Date().getFullYear(), month: new Date().getMonth() };
    }
    const [yearStr, monthStr] = val.split('-');
    return {
      year: parseInt(yearStr),
      month: parseInt(monthStr) - 1 // Convert 1-12 to 0-11
    };
  };
  
  const parsed = parseValue(value);
  const [selectedYear, setSelectedYear] = useState(parsed.year);
  const [selectedMonth, setSelectedMonth] = useState(parsed.month);

  // Update state when value changes
  useEffect(() => {
    const newParsed = parseValue(value);
    setSelectedYear(newParsed.year);
    setSelectedMonth(newParsed.month);
  }, [value]);

  // Generate years (current year to +10 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear + i);

  // Months array
  const months = [
    { value: 0, label: "Enero" },
    { value: 1, label: "Febrero" },
    { value: 2, label: "Marzo" },
    { value: 3, label: "Abril" },
    { value: 4, label: "Mayo" },
    { value: 5, label: "Junio" },
    { value: 6, label: "Julio" },
    { value: 7, label: "Agosto" },
    { value: 8, label: "Septiembre" },
    { value: 9, label: "Octubre" },
    { value: 10, label: "Noviembre" },
    { value: 11, label: "Diciembre" },
  ];

  const handleApply = () => {
    const formattedValue = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}`;
    onChange(formattedValue);
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return "";
    try {
      const [yearStr, monthStr] = value.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1; // Convert to 0-indexed
      
      const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      return `${months[month]} ${year}`;
    } catch {
      return "";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-7 text-xs px-2",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-3 w-3" />
          {value ? getDisplayValue() : "Seleccionar..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 pointer-events-auto" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Año</label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger>
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Mes</label>
            <div className="grid grid-cols-3 gap-2">
              {months.map((month) => (
                <Button
                  key={month.value}
                  type="button"
                  variant={selectedMonth === month.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMonth(month.value)}
                  className="text-xs"
                >
                  {month.label.substring(0, 3)}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
