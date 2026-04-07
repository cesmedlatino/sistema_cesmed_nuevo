
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Edit, Trash2, Save, X, Clock, Settings } from "lucide-react";
import { useHorarios, type HorarioInput } from "@/hooks/useHorarios";
import { useTurnos } from "@/hooks/useTurnos";
import { useHorarioTurnoAssignments } from "@/hooks/useHorarioTurnoAssignments";
import { useSpecialists } from "@/hooks/useSpecialists";

export function Horarios() {
  const {
    horarios,
    loading: horariosLoading,
    dayNames,
    estadoOptions,
    createHorario,
    updateHorario,
    deleteHorario
  } = useHorarios();

  const { turnos, loading: turnosLoading } = useTurnos();
  const { data: specialists, fetchData: fetchSpecialists } = useSpecialists();

  const [isEditing, setIsEditing] = useState(false);
  const [editingHorario, setEditingHorario] = useState<string | null>(null);
  const [selectedHorarioForAssignment, setSelectedHorarioForAssignment] = useState<string | null>(null);
  const [formData, setFormData] = useState<HorarioInput>({
    nombre: "",
    dias_laborables: [],
    estado: "borrador",
    specialist_id: ""
  });

  const {
    assignments,
    loading: assignmentsLoading,
    createOrUpdateAssignment,
    updateAssignment,
    deleteAssignment
  } = useHorarioTurnoAssignments(selectedHorarioForAssignment);

  // Cargar especialistas al montar el componente
  useEffect(() => {
    fetchSpecialists();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.dias_laborables.length === 0) {
      return;
    }

    try {
      if (editingHorario) {
        await updateHorario(editingHorario, formData);
      } else {
        await createHorario(formData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving horario:', error);
    }
  };

  const handleEdit = (horario: any) => {
    setEditingHorario(horario.id);
    setFormData({
      nombre: horario.nombre,
      dias_laborables: horario.dias_laborables,
      estado: horario.estado,
      specialist_id: horario.specialist_id || ""
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este horario?')) {
      await deleteHorario(id);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      dias_laborables: [],
      estado: "borrador",
      specialist_id: ""
    });
    setIsEditing(false);
    setEditingHorario(null);
  };

  const handleDayToggle = (dayIndex: number) => {
    setFormData(prev => ({
      ...prev,
      dias_laborables: prev.dias_laborables.includes(dayIndex)
        ? prev.dias_laborables.filter(d => d !== dayIndex)
        : [...prev.dias_laborables, dayIndex].sort()
    }));
  };

  const getEstadoBadge = (estado: string) => {
    const estadoConfig = estadoOptions.find(e => e.value === estado);
    return (
      <Badge className={`text-white ${estadoConfig?.color}`}>
        {estadoConfig?.label}
      </Badge>
    );
  };

  const handleAssignShift = async (dayOfWeek: number, turnoId: string, customStartTime?: string, customEndTime?: string) => {
    if (!selectedHorarioForAssignment) return;

    console.log('Assigning shift:', {
      horario_id: selectedHorarioForAssignment,
      turno_id: turnoId,
      day_of_week: dayOfWeek,
      custom_start_time: customStartTime,
      custom_end_time: customEndTime
    });

    try {
      await createOrUpdateAssignment({
        horario_id: selectedHorarioForAssignment,
        turno_id: turnoId,
        day_of_week: dayOfWeek,
        custom_start_time: customStartTime,
        custom_end_time: customEndTime,
        is_active: true
      });
    } catch (error) {
      console.error('Error assigning shift:', error);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta asignación?')) {
      await deleteAssignment(assignmentId);
    }
  };

  if (horariosLoading || turnosLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Horarios</h1>
        </div>
        <Card className="border-purple-200">
          <CardContent className="p-6">
            <div className="text-center">Cargando horarios...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Horarios</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Formulario de creación/edición de horarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-purple-200">
            <CardHeader style={{ backgroundColor: "#5c1c8c" }}>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {isEditing ? "Editar Horario" : "Crear Nuevo Horario"}
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-purple-700 font-medium">Nombre del Horario</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej: Horario de Verano"
                    required
                    className="border-purple-200 focus:border-purple-500"
                  />
                </div>

                <div>
                  <Label className="text-purple-700 font-medium">Especialista</Label>
                  <Select
                    value={formData.specialist_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, specialist_id: value }))}
                  >
                    <SelectTrigger className="border-purple-200 focus:border-purple-500">
                      <SelectValue placeholder="Seleccionar especialista" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialists.map((specialist) => (
                        <SelectItem key={specialist.id} value={specialist.id}>
                          {specialist.first_name} {specialist.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-purple-700 font-medium">Estado</Label>
                  <Select 
                    value={formData.estado} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, estado: value }))}
                  >
                    <SelectTrigger className="border-purple-200 focus:border-purple-500">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estadoOptions.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value}>
                          {estado.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-purple-700 font-medium mb-3 block">Días Laborables</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {dayNames.map((day, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${index}`}
                          checked={formData.dias_laborables.includes(index)}
                          onCheckedChange={() => handleDayToggle(index)}
                        />
                        <Label htmlFor={`day-${index}`} className="text-sm cursor-pointer">
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.dias_laborables.length === 0 && (
                    <p className="text-red-500 text-sm mt-1">Debe seleccionar al menos un día</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="flex-1 text-white bg-purple-600 hover:bg-purple-700"
                    disabled={formData.dias_laborables.length === 0}
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
              <CardTitle className="text-white text-lg">Horarios Registrados</CardTitle>
            </CardHeader>
            <CardContent className="mt-4">
              <div className="space-y-4">
                {horarios.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay horarios registrados</p>
                ) : (
                  horarios.map((horario) => (
                    <div key={horario.id} className="border border-purple-200 rounded-lg p-4 hover:bg-purple-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg text-purple-900">{horario.nombre}</h3>
                          {horario.specialist_id && (
                            <div className="text-sm text-blue-600 mt-1">
                              Especialista: {specialists.find(s => s.id === horario.specialist_id)?.first_name} {specialists.find(s => s.id === horario.specialist_id)?.last_name}
                            </div>
                          )}
                          <div className="mt-1">
                            {getEstadoBadge(horario.estado)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setSelectedHorarioForAssignment(horario.id)} 
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(horario)} className="border-green-300 text-green-700 hover:bg-green-50">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(horario.id)} className="border-red-300 text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded border border-purple-100">
                        <h4 className="text-sm font-medium text-purple-700 mb-2">Días Laborables:</h4>
                        <div className="flex flex-wrap gap-1">
                          {horario.dias_laborables.map(dayIndex => (
                            <Badge key={dayIndex} variant="outline" className="text-xs">
                              {dayNames[dayIndex]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-2">
                        Creado: {new Date(horario.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sección de asignación de turnos */}
        {selectedHorarioForAssignment && (
          <Card className="border-blue-200">
            <CardHeader style={{ backgroundColor: "#1e40af" }}>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Asignar Turnos al Horario
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setSelectedHorarioForAssignment(null)}
                  className="ml-auto bg-white text-blue-700 hover:bg-blue-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-6">
              {assignmentsLoading ? (
                <div className="text-center py-4">Cargando asignaciones...</div>
              ) : (
                <TurnoAssignmentManager
                  horarioId={selectedHorarioForAssignment}
                  horario={horarios.find(h => h.id === selectedHorarioForAssignment)}
                  turnos={turnos}
                  assignments={assignments}
                  dayNames={dayNames}
                  onAssignShift={handleAssignShift}
                  onRemoveAssignment={handleRemoveAssignment}
                  onUpdateAssignment={updateAssignment}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Componente para manejar las asignaciones de turnos
interface TurnoAssignmentManagerProps {
  horarioId: string;
  horario: any;
  turnos: any[];
  assignments: any[];
  dayNames: string[];
  onAssignShift: (dayOfWeek: number, turnoId: string, customStartTime?: string, customEndTime?: string) => Promise<void>;
  onRemoveAssignment: (assignmentId: string) => Promise<void>;
  onUpdateAssignment: (id: string, data: any) => Promise<void>;
}

function TurnoAssignmentManager({ 
  horario, 
  turnos, 
  assignments, 
  dayNames, 
  onAssignShift, 
  onRemoveAssignment,
  onUpdateAssignment 
}: TurnoAssignmentManagerProps) {
  const [assignmentForms, setAssignmentForms] = useState<Record<number, {
    turnoId: string;
    customStartTime: string;
    customEndTime: string;
  }>>({});

  if (!horario) return null;

  const handleFormChange = (dayOfWeek: number, field: string, value: string) => {
    setAssignmentForms(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value
      }
    }));
  };

  const handleSubmitAssignment = async (dayOfWeek: number) => {
    const form = assignmentForms[dayOfWeek];
    if (!form?.turnoId) return;

    const selectedTurno = turnos.find(t => t.id === form.turnoId);
    if (!selectedTurno) return;

    console.log('Submitting assignment:', {
      dayOfWeek,
      turnoId: form.turnoId,
      selectedTurno,
      customStartTime: form.customStartTime,
      customEndTime: form.customEndTime
    });

    // Para turnos personalizados, usar las horas personalizadas
    // Para turnos fijos, usar las horas del turno
    const startTime = selectedTurno.is_custom ? form.customStartTime : selectedTurno.start_time;
    const endTime = selectedTurno.is_custom ? form.customEndTime : selectedTurno.end_time;

    console.log('Final times to send:', { startTime, endTime });

    await onAssignShift(
      dayOfWeek,
      form.turnoId,
      startTime,
      endTime
    );

    // Limpiar formulario
    setAssignmentForms(prev => ({
      ...prev,
      [dayOfWeek]: { turnoId: '', customStartTime: '', customEndTime: '' }
    }));
  };

  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);

  const handleEditAssignment = (assignment: any) => {
    setEditingAssignment(assignment.id);
    setAssignmentForms(prev => ({
      ...prev,
      [assignment.day_of_week]: {
        turnoId: assignment.turno_id,
        customStartTime: assignment.custom_start_time || '',
        customEndTime: assignment.custom_end_time || ''
      }
    }));
  };

  const handleCancelEdit = (dayOfWeek: number) => {
    setEditingAssignment(null);
    setAssignmentForms(prev => ({
      ...prev,
      [dayOfWeek]: { turnoId: '', customStartTime: '', customEndTime: '' }
    }));
  };

  const handleUpdateAssignment = async (dayOfWeek: number) => {
    if (!editingAssignment) return;
    
    const form = assignmentForms[dayOfWeek];
    if (!form?.turnoId) return;

    const selectedTurno = turnos.find(t => t.id === form.turnoId);
    if (!selectedTurno) return;

    const startTime = selectedTurno.is_custom ? form.customStartTime : selectedTurno.start_time;
    const endTime = selectedTurno.is_custom ? form.customEndTime : selectedTurno.end_time;

    try {
      await onUpdateAssignment(editingAssignment, {
        turno_id: form.turnoId,
        day_of_week: dayOfWeek,
        custom_start_time: startTime,
        custom_end_time: endTime,
        is_active: true
      });

      setEditingAssignment(null);
      setAssignmentForms(prev => ({
        ...prev,
        [dayOfWeek]: { turnoId: '', customStartTime: '', customEndTime: '' }
      }));
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };

  const [showNewTurnoForm, setShowNewTurnoForm] = useState<Record<number, boolean>>({});

  const handleShowNewAssignmentForm = (dayOfWeek: number) => {
    setShowNewTurnoForm(prev => ({
      ...prev,
      [dayOfWeek]: true
    }));
    setAssignmentForms(prev => ({
      ...prev,
      [dayOfWeek]: { turnoId: '', customStartTime: '', customEndTime: '' }
    }));
  };

  const handleCancelNewAssignment = (dayOfWeek: number) => {
    setShowNewTurnoForm(prev => ({
      ...prev,
      [dayOfWeek]: false
    }));
    setAssignmentForms(prev => ({
      ...prev,
      [dayOfWeek]: { turnoId: '', customStartTime: '', customEndTime: '' }
    }));
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">
          Horario: {horario.nombre}
        </h3>
        <p className="text-blue-700 text-sm">
          Configure múltiples turnos para cada día laborable. Los turnos personalizados requieren horarios específicos.
        </p>
      </div>

      {horario.dias_laborables.map((dayIndex: number) => {
        const existingAssignments = assignments.filter(a => a.day_of_week === dayIndex);
        const form = assignmentForms[dayIndex] || { turnoId: '', customStartTime: '', customEndTime: '' };
        const isEditing = editingAssignment && existingAssignments.some(a => a.id === editingAssignment);
        const isShowingNewForm = showNewTurnoForm[dayIndex];
        
        return (
          <div key={dayIndex} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-900">{dayNames[dayIndex]}</h4>
              {!isShowingNewForm && !isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleShowNewAssignmentForm(dayIndex)}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Turno
                </Button>
              )}
            </div>
            
            {/* Turnos existentes */}
            <div className="space-y-2 mb-4">
              {existingAssignments.map((assignment) => (
                <div key={assignment.id} className="bg-green-50 p-3 rounded border border-green-200">
                  {editingAssignment === assignment.id ? (
                    // Modo edición
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Seleccionar Turno</Label>
                        <Select
                          value={form.turnoId}
                          onValueChange={(value) => handleFormChange(dayIndex, 'turnoId', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar turno" />
                          </SelectTrigger>
                          <SelectContent>
                            {turnos.map((turno) => (
                              <SelectItem key={turno.id} value={turno.id}>
                                {turno.name} {turno.is_custom ? '(Personalizado)' : `(${turno.start_time} - ${turno.end_time})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {form.turnoId && turnos.find(t => t.id === form.turnoId)?.is_custom && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm font-medium">Hora de Inicio</Label>
                            <Input
                              type="time"
                              value={form.customStartTime}
                              onChange={(e) => handleFormChange(dayIndex, 'customStartTime', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Hora de Fin</Label>
                            <Input
                              type="time"
                              value={form.customEndTime}
                              onChange={(e) => handleFormChange(dayIndex, 'customEndTime', e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateAssignment(dayIndex)}
                          disabled={!form.turnoId || (turnos.find(t => t.id === form.turnoId)?.is_custom && (!form.customStartTime || !form.customEndTime))}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelEdit(dayIndex)}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Modo visualización
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-green-900">{assignment.turno?.name}</p>
                        {assignment.turno?.is_custom ? (
                          <p className="text-green-700 text-sm">
                            {assignment.custom_start_time} - {assignment.custom_end_time}
                          </p>
                        ) : (
                          <p className="text-green-700 text-sm">
                            {assignment.custom_start_time || assignment.turno?.start_time} - {assignment.custom_end_time || assignment.turno?.end_time}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAssignment(assignment)}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRemoveAssignment(assignment.id)}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Formulario para nuevo turno */}
            {isShowingNewForm && !isEditing && (
              <div className="space-y-3 bg-blue-50 p-3 rounded border border-blue-200">
                <div>
                  <Label className="text-sm font-medium">Seleccionar Turno</Label>
                  <Select
                    value={form.turnoId}
                    onValueChange={(value) => handleFormChange(dayIndex, 'turnoId', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar turno" />
                    </SelectTrigger>
                    <SelectContent>
                      {turnos.map((turno) => (
                        <SelectItem key={turno.id} value={turno.id}>
                          {turno.name} {turno.is_custom ? '(Personalizado)' : `(${turno.start_time} - ${turno.end_time})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.turnoId && turnos.find(t => t.id === form.turnoId)?.is_custom && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium">Hora de Inicio</Label>
                      <Input
                        type="time"
                        value={form.customStartTime}
                        onChange={(e) => handleFormChange(dayIndex, 'customStartTime', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Hora de Fin</Label>
                      <Input
                        type="time"
                        value={form.customEndTime}
                        onChange={(e) => handleFormChange(dayIndex, 'customEndTime', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      handleSubmitAssignment(dayIndex);
                      setShowNewTurnoForm(prev => ({ ...prev, [dayIndex]: false }));
                    }}
                    disabled={!form.turnoId || (turnos.find(t => t.id === form.turnoId)?.is_custom && (!form.customStartTime || !form.customEndTime))}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Asignar Turno
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCancelNewAssignment(dayIndex)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
