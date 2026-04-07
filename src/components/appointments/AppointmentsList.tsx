import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Edit, X, Trash2, CreditCard, Banknote, Smartphone, Building2, CalendarClock, CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppointmentsList, DateFilterType } from '@/hooks/useAppointmentsList';
import { RescheduleDialog } from './RescheduleDialog';
import { cn } from '@/lib/utils';

interface AppointmentsListProps {
  selectedSpecialistId?: string;
  onAppointmentUpdated?: () => void;
}

export function AppointmentsList({ selectedSpecialistId, onAppointmentUpdated }: AppointmentsListProps) {
  const navigate = useNavigate();
  const {
    appointments,
    loading,
    searchTerm,
    dateFilterType,
    selectedDate,
    selectedMonth,
    updateSearch,
    updateSpecialistFilter,
    updateDateFilter,
    updateSelectedDate,
    updateSelectedMonth,
    clearFilters,
    deleteAppointment,
    deleteMultipleAppointments,
    cancelAppointment,
    refetch
  } = useAppointmentsList();

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<any>(null);
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Aplicar filtro de especialista seleccionado
  React.useEffect(() => {
    if (selectedSpecialistId) {
      updateSpecialistFilter(selectedSpecialistId);
    } else {
      updateSpecialistFilter('');
    }
  }, [selectedSpecialistId, updateSpecialistFilter]);

  const handlePrevMonth = () => {
    const newDate = new Date(selectedMonth || new Date());
    newDate.setMonth(newDate.getMonth() - 1);
    updateSelectedMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedMonth || new Date());
    newDate.setMonth(newDate.getMonth() + 1);
    updateSelectedMonth(newDate);
  };

  const formatDate = (dateString: string) => {
    // Crear la fecha correctamente usando el formato ISO
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Formatear la fecha en formato DD/MM/YYYY
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEdit = (appointment: any) => {
    console.log('Editando cita:', appointment);
    
    // Crear los parámetros de query para pasar los datos de la cita
    const queryParams = new URLSearchParams({
      mode: 'edit',
      id: appointment.id,
      patient_id: appointment.patient_id,
      specialist_id: appointment.specialist_id,
      consulting_room_id: appointment.consulting_room_id || '',
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      duration_minutes: (appointment.duration_minutes || 30).toString(),
      reason: appointment.reason || '',
      status: appointment.status || 'Programada'
    });
    
    // Navegar a la página de nueva cita con los parámetros
    navigate(`/appointments/new?${queryParams.toString()}`);
  };

  const handleCheckboxChange = (appointmentId: string) => {
    if (selectedAppointmentId === appointmentId) {
      setSelectedAppointmentId('');
    } else {
      setSelectedAppointmentId(appointmentId);
    }
  };

  // Manejo de selección múltiple
  const handleSelectAppointment = (appointmentId: string, checked: boolean) => {
    const newSelected = new Set(selectedAppointmentIds);
    if (checked) {
      newSelected.add(appointmentId);
    } else {
      newSelected.delete(appointmentId);
    }
    setSelectedAppointmentIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(appointments.map((a) => a.id));
      setSelectedAppointmentIds(allIds);
    } else {
      setSelectedAppointmentIds(new Set());
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedAppointmentIds.size === 0) return;
    await deleteMultipleAppointments(Array.from(selectedAppointmentIds));
    setShowBulkDeleteDialog(false);
    setSelectedAppointmentIds(new Set());
    onAppointmentUpdated?.();
  };

  const handleAppointmentUpdated = () => {
    console.log('Actualizando listas después de editar cita');
    refetch();
    setSelectedAppointmentId('');
    onAppointmentUpdated?.();
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    await deleteAppointment(appointmentId);
    onAppointmentUpdated?.();
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    await cancelAppointment(appointmentId);
    onAppointmentUpdated?.();
  };

  const handleReschedule = (appointment: any) => {
    setAppointmentToReschedule(appointment);
    setRescheduleDialogOpen(true);
  };

  const handleRescheduled = () => {
    refetch();
    onAppointmentUpdated?.();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completada':
        return 'text-green-700 bg-green-100 border border-green-200';
      case 'Programada':
        return 'text-purple-700 bg-purple-100 border border-purple-200';
      case 'Sin Programar':
        return 'text-orange-700 bg-orange-100 border border-orange-200';
      case 'Anulada':
        return 'text-red-700 bg-red-100 border border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border border-gray-200';
    }
  };

  const renderModalityIcon = (modalityName: string | null, modalityIcon: string | null) => {
    if (!modalityName) return '-';
    
    // Si hay un ícono personalizado (URL de imagen, data URL, o emoji)
    if (modalityIcon) {
      // Si es una URL (imagen) o data URL base64
      if (modalityIcon.startsWith('http') || modalityIcon.startsWith('/') || modalityIcon.startsWith('data:')) {
        return (
          <img 
            src={modalityIcon} 
            alt={modalityName} 
            className="h-6 w-6 object-contain"
          />
        );
      }
      // Si es un emoji u otro texto
      return <span className="text-lg">{modalityIcon}</span>;
    }
    
    // Fallback a íconos por defecto basados en el nombre
    const modality = modalityName?.toLowerCase() || '';
    if (modality.includes('efectivo') || modality.includes('cash')) {
      return <Banknote className="h-4 w-4" />;
    }
    if (modality.includes('tarjeta') || modality.includes('card')) {
      return <CreditCard className="h-4 w-4" />;
    }
    if (modality.includes('transferencia') || modality.includes('transfer')) {
      return <Building2 className="h-4 w-4" />;
    }
    if (modality.includes('digital') || modality.includes('movil')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <CreditCard className="h-4 w-4" />; // Default icon
  };

  // No need for additional filtering as it's handled in the hook

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lista de Citas</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros de fecha */}
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={dateFilterType} onValueChange={(v) => updateDateFilter(v as DateFilterType)}>
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs px-3">Todos</TabsTrigger>
                <TabsTrigger value="today" className="text-xs px-3">Hoy</TabsTrigger>
                <TabsTrigger value="date" className="text-xs px-3">Por Fecha</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-3">Por Mes</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Selector de fecha */}
            {dateFilterType === 'date' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {selectedDate ? format(selectedDate, "d MMM yyyy", { locale: es }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={updateSelectedDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Selector de mes */}
            {dateFilterType === 'month' && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center capitalize">
                  {selectedMonth ? format(selectedMonth, "MMMM yyyy", { locale: es }) : ""}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Búsqueda */}
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar paciente, especialista, motivo..."
                value={searchTerm}
                onChange={(e) => updateSearch(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Botón eliminar seleccionados */}
            {selectedAppointmentIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
                className="h-9"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar seleccionados ({selectedAppointmentIds.size})
              </Button>
            )}
          </div>

          {/* Tabla de citas */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={appointments.length > 0 && selectedAppointmentIds.size === appointments.length}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Especialista</TableHead>
                  <TableHead>Consultorio</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-center">Modalidad</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      Cargando citas...
                    </TableCell>
                  </TableRow>
                ) : appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No se encontraron citas
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((appointment) => (
                    <TableRow key={appointment.id} className={selectedAppointmentIds.has(appointment.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAppointmentIds.has(appointment.id)}
                          onCheckedChange={(checked) => handleSelectAppointment(appointment.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(appointment.appointment_date)}
                      </TableCell>
                      <TableCell>
                        {appointment.appointment_time}
                      </TableCell>
                      <TableCell className="font-medium">
                        {appointment.patient_name}
                      </TableCell>
                      <TableCell>
                        {appointment.specialist_name}
                      </TableCell>
                      <TableCell>
                        {appointment.consulting_room_name}
                      </TableCell>
                      <TableCell>
                        {appointment.reason}
                      </TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const status = appointment.payment_status || (appointment.payment_confirmed ? 'Pagado' : 'Sin pago');
                          const statusColors: Record<string, string> = {
                            'Pagado': 'text-green-700 bg-green-100 border border-green-200',
                            'Pendiente': 'text-orange-700 bg-orange-100 border border-orange-200',
                            'Parcial': 'text-yellow-700 bg-yellow-100 border border-yellow-200',
                            'Anulado': 'text-red-700 bg-red-100 border border-red-200',
                          };
                          return (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status] || 'text-gray-700 bg-gray-100 border border-gray-200'}`}>
                              {status}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center" title={appointment.payment_modality || 'Sin modalidad'}>
                          {renderModalityIcon(appointment.payment_modality, appointment.payment_modality_icon)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(appointment)}
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReschedule(appointment)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                            title="Reprogramar"
                          >
                            <CalendarClock className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                                title="Anular"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Anular esta cita?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción cambiará el estado de la cita a "Anulada". 
                                  La cita seguirá existiendo pero quedará sin efecto.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>No</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelAppointment(appointment.id)}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  Sí, Anular
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar esta cita?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente la cita de la base de datos. 
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>No</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAppointment(appointment.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Sí, Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {appointments.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Mostrando {appointments.length} citas
              {selectedSpecialistId && " (filtradas por especialista seleccionado)"}
              {searchTerm && " (filtradas por búsqueda)"}
              {selectedAppointmentIds.size > 0 && ` | ${selectedAppointmentIds.size} seleccionada(s)`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de reprogramar */}
      {appointmentToReschedule && (
        <RescheduleDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          appointment={appointmentToReschedule}
          onRescheduled={handleRescheduled}
        />
      )}

      {/* Dialog de confirmación para eliminación masiva */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar citas seleccionadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Está a punto de eliminar {selectedAppointmentIds.size} citas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar {selectedAppointmentIds.size} citas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
