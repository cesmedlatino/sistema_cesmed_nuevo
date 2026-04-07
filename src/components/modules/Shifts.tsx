
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clock, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useTurnos, type TurnoInput } from "@/hooks/useTurnos";

export function Shifts() {
  const {
    turnos,
    shiftTypes,
    loading,
    createTurno,
    updateTurno,
    deleteTurno
  } = useTurnos();

  const [isEditing, setIsEditing] = useState(false);
  const [editingTurno, setEditingTurno] = useState<string | null>(null);
  const [scheduleType, setScheduleType] = useState<'semanal' | 'personalizado'>('semanal');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [formData, setFormData] = useState<TurnoInput>({
    name: "",
    shift_type_id: "",
    start_time: "",
    end_time: "",
    is_custom: false,
    dias_laborables: [1, 2, 3, 4, 5, 6]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedShiftType = shiftTypes.find(st => st.id === formData.shift_type_id);
    const isCustomType = selectedShiftType?.name === 'personalizado';
    
    const diasLaborables = scheduleType === 'semanal' ? [1, 2, 3, 4, 5, 6] : selectedDays;
    
    const turnoData = {
      ...formData,
      is_custom: isCustomType,
      dias_laborables: diasLaborables,
      start_time: isCustomType ? undefined : formData.start_time,
      end_time: isCustomType ? undefined : formData.end_time
    };

    try {
      if (editingTurno) {
        await updateTurno(editingTurno, turnoData);
      } else {
        await createTurno(turnoData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving turno:', error);
    }
  };

  const handleEdit = (turno: any) => {
    setEditingTurno(turno.id);
    const days = turno.dias_laborables || [1, 2, 3, 4, 5, 6];
    const isWeekly = days.length === 6 && days.every((d: number) => [1,2,3,4,5,6].includes(d));
    
    setScheduleType(isWeekly ? 'semanal' : 'personalizado');
    setSelectedDays(days);
    setFormData({
      name: turno.name,
      shift_type_id: turno.shift_type_id,
      start_time: turno.start_time || "",
      end_time: turno.end_time || "",
      is_custom: turno.is_custom,
      dias_laborables: days
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este turno?')) {
      await deleteTurno(id);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      shift_type_id: "",
      start_time: "",
      end_time: "",
      is_custom: false,
      dias_laborables: [1, 2, 3, 4, 5, 6]
    });
    setScheduleType('semanal');
    setSelectedDays([1, 2, 3, 4, 5, 6]);
    setIsEditing(false);
    setEditingTurno(null);
  };

  const selectedShiftType = shiftTypes.find(st => st.id === formData.shift_type_id);
  const isCustomType = selectedShiftType?.name === 'personalizado';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Turnos</h1>
        </div>
        <Card className="border-purple-200">
          <CardContent className="p-6">
            <div className="text-center">Cargando turnos...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Turnos</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-purple-200">
          <CardHeader style={{ backgroundColor: "#5c1c8c" }}>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {isEditing ? "Editar Turno" : "Crear Nuevo Turno"}
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-purple-700 font-medium">Nombre del Turno</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Mañana JC, Tarde Especializada"
                  required
                  className="border-purple-200 focus:border-purple-500"
                />
              </div>

              <div>
                <Label className="text-purple-700 font-medium">Tipo de Turno</Label>
                <Select 
                  value={formData.shift_type_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, shift_type_id: value }))}
                >
                  <SelectTrigger className="border-purple-200 focus:border-purple-500">
                    <SelectValue placeholder="Seleccionar tipo de turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name === 'semanal' ? 'Por Semana' : 'Personalizado'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-purple-700 font-medium">Días Aplicables</Label>
                <RadioGroup value={scheduleType} onValueChange={(value: 'semanal' | 'personalizado') => {
                  setScheduleType(value);
                  if (value === 'semanal') {
                    setSelectedDays([1, 2, 3, 4, 5, 6]);
                  }
                }}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="semanal" id="semanal" />
                    <Label htmlFor="semanal" className="font-normal cursor-pointer">
                      Semanal (Lunes a Sábado)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="personalizado" id="personalizado" />
                    <Label htmlFor="personalizado" className="font-normal cursor-pointer">
                      Personalizado
                    </Label>
                  </div>
                </RadioGroup>

                {scheduleType === 'personalizado' && (
                  <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    {[
                      { value: 1, label: 'Lunes' },
                      { value: 2, label: 'Martes' },
                      { value: 3, label: 'Miércoles' },
                      { value: 4, label: 'Jueves' },
                      { value: 5, label: 'Viernes' },
                      { value: 6, label: 'Sábado' }
                    ].map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={selectedDays.includes(day.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDays([...selectedDays, day.value].sort());
                            } else {
                              setSelectedDays(selectedDays.filter(d => d !== day.value));
                            }
                          }}
                        />
                        <Label htmlFor={`day-${day.value}`} className="font-normal cursor-pointer">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!isCustomType && formData.shift_type_id && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime" className="text-purple-700 font-medium">Hora de Inicio</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      required={!isCustomType}
                      className="border-purple-200 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="endTime" className="text-purple-700 font-medium">Hora de Fin</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      required={!isCustomType}
                      className="border-purple-200 focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {isCustomType && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm">
                    <strong>Turno Personalizado:</strong> Los horarios se configurarán individualmente 
                    para cada día en la sección de Horarios de Atención.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="flex-1 text-white bg-purple-600 hover:bg-purple-700"
                  disabled={!formData.shift_type_id || (scheduleType === 'personalizado' && selectedDays.length === 0)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Actualizar" : "Crear"}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={resetForm} className="border-purple-300 text-purple-700 hover:bg-purple-50">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader style={{ backgroundColor: "#5c1c8c" }}>
            <CardTitle className="text-white text-lg">Turnos Registrados</CardTitle>
          </CardHeader>
          <CardContent className="mt-4">
            <div className="space-y-4">
              {turnos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay turnos registrados</p>
              ) : (
                turnos.map((turno) => (
                  <div key={turno.id} className="border border-purple-200 rounded-lg p-4 hover:bg-purple-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg text-purple-900">{turno.name}</h3>
                        <div className="flex gap-2 mt-2">
                          <Badge className={`text-white ${turno.is_custom ? 'bg-blue-500' : 'bg-green-500'}`}>
                            {turno.is_custom ? 'Personalizado' : 'Por Semana'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(turno)} className="border-green-300 text-green-700 hover:bg-green-50">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(turno.id)} className="border-red-300 text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {!turno.is_custom && turno.start_time && turno.end_time && (
                        <div className="bg-white p-3 rounded border border-purple-100">
                          <h4 className="text-sm font-medium text-purple-700 mb-1">Horario:</h4>
                          <p className="text-purple-900">
                            {turno.start_time} - {turno.end_time}
                          </p>
                        </div>
                      )}
                      
                      {turno.dias_laborables && turno.dias_laborables.length > 0 && (
                        <div className="bg-purple-50 p-3 rounded border border-purple-100">
                          <h4 className="text-sm font-medium text-purple-700 mb-1">Días:</h4>
                          <div className="flex flex-wrap gap-1">
                            {turno.dias_laborables.map((day: number) => (
                              <Badge key={day} variant="outline" className="text-xs">
                                {['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][day]}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {turno.is_custom && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-100">
                        <p className="text-blue-700 text-sm">
                          Horario variable por día - Se configura en Horarios de Atención
                        </p>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      Creado: {new Date(turno.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
