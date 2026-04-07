import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Save, Clock } from "lucide-react";
import { useOpeningHours } from "@/hooks/useOpeningHours";
export function OpeningHours() {
  const {
    openingHours,
    loading,
    updateOpeningHours,
    dayNames
  } = useOpeningHours();
  const [localHours, setLocalHours] = useState(openingHours);

  // Update local state when data is loaded
  useEffect(() => {
    setLocalHours(openingHours);
  }, [openingHours]);
  const handleDayToggle = (index: number) => {
    const updated = [...localHours];
    updated[index] = {
      ...updated[index],
      is_open: !updated[index].is_open,
      opening_time: updated[index].is_open ? undefined : '08:00',
      closing_time: updated[index].is_open ? undefined : '18:00'
    };
    setLocalHours(updated);
  };
  const handleTimeChange = (index: number, field: 'opening_time' | 'closing_time', value: string) => {
    const updated = [...localHours];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setLocalHours(updated);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOpeningHours(localHours);
  };
  if (loading) {
    return <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Horario de Atención de la Clínica</h1>
        </div>
        <Card className="border-purple-200">
          <CardContent className="p-6">
            <div className="text-center">Cargando horarios...</div>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">Horario de Atención de la Clínica</h1>
      </div>

      <Card className="border-purple-200 px-0">
        <CardHeader style={{
        backgroundColor: "#5c1c8c"
      }}>
          <CardTitle className="text-white text-lg">Configurar Días y Horarios de Atención</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {localHours.map((hour, index) => <div key={hour.id} className="p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox id={`day-${hour.day_of_week}`} checked={hour.is_open} onCheckedChange={() => handleDayToggle(index)} />
                      <Label htmlFor={`day-${hour.day_of_week}`} className={`cursor-pointer font-medium text-lg ${hour.is_open ? 'text-purple-900' : 'text-gray-400'}`}>
                        {dayNames[hour.day_of_week]}
                      </Label>
                    </div>
                    
                    {hour.is_open && <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <Label className="text-sm text-purple-700">Apertura:</Label>
                          <Input type="time" value={hour.opening_time || '08:00'} onChange={e => handleTimeChange(index, 'opening_time', e.target.value)} className="w-32" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-purple-700">Cierre:</Label>
                          <Input type="time" value={hour.closing_time || '18:00'} onChange={e => handleTimeChange(index, 'closing_time', e.target.value)} className="w-32" />
                        </div>
                      </div>}
                  </div>
                </div>)}
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-900 mb-2">Resumen de Horarios:</h3>
              <div className="text-green-700 space-y-1">
                {localHours.filter(hour => hour.is_open).map(hour => <div key={hour.id} className="flex justify-between">
                    <span className="font-medium">{dayNames[hour.day_of_week]}:</span>
                    <span>{hour.opening_time} - {hour.closing_time}</span>
                  </div>)}
                {localHours.filter(hour => hour.is_open).length === 0 && <p>No hay días de atención seleccionados</p>}
              </div>
            </div>

            <Button type="submit" className="w-full text-white bg-purple-600 hover:bg-purple-700" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Horario de Atención'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>;
}