import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAttendanceQueue, DateFilterType } from '@/hooks/useAttendanceQueue';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { PatientMedicalHistory } from '@/components/medical-records/PatientMedicalHistory';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Clock, 
  Users, 
  CheckCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Activity,
  FileText,
  ClipboardList,
  Receipt,
  CreditCard,
  DollarSign,
  CalendarDays,
  Printer
} from 'lucide-react';

interface PaymentReceiptData {
  id: string;
  monto_pagado: number;
  fecha_pago: string;
  estado_pago: string;
  concepto: { nombre: string } | null;
  modalidad: { nombre: string } | null;
  patient: { first_name: string; last_name: string; dni: string } | null;
  documento_pago: { numero_documento: string } | null;
}

function SimpleReceiptDialog({ 
  paymentId, 
  onClose 
}: { 
  paymentId: string | null; 
  onClose: () => void; 
}) {
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) return;

    const fetchReceipt = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('pagos')
        .select(`
          id, monto_pagado, fecha_pago, estado_pago,
          concepto:concepto_id(nombre),
          modalidad:modalidad_id(nombre),
          patient:patient_id(first_name, last_name, dni),
          documento_pago:documento_pago_id(numero_documento)
        `)
        .eq('id', paymentId)
        .maybeSingle();

      if (!error && data) {
        setReceipt(data as unknown as PaymentReceiptData);
      }
      setLoading(false);
    };

    fetchReceipt();
  }, [paymentId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={!!paymentId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Detalle de Pago
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        ) : receipt ? (
          <div className="space-y-4 print:p-4">
            <div className="border-b pb-3">
              <p className="text-sm text-muted-foreground">Paciente</p>
              <p className="font-medium">
                {receipt.patient?.first_name} {receipt.patient?.last_name}
              </p>
              <p className="text-sm text-muted-foreground">DNI: {receipt.patient?.dni}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Concepto</p>
                <p className="font-medium">{receipt.concepto?.nombre || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modalidad</p>
                <p className="font-medium">{receipt.modalidad?.nombre || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto</p>
                <p className="font-medium text-lg">S/ {Number(receipt.monto_pagado).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={receipt.estado_pago === 'Pagado' ? 'default' : 'secondary'}>
                  {receipt.estado_pago}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">{receipt.fecha_pago}</p>
              </div>
              {receipt.documento_pago?.numero_documento && (
                <div>
                  <p className="text-sm text-muted-foreground">Nro. Comprobante</p>
                  <p className="font-medium">{receipt.documento_pago.numero_documento}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4 print:hidden">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No se encontró información del pago.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AttendanceQueue() {
  const { userData } = useUserPermissions();
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string; appointmentData?: any } | null>(null);
  const [showReceiptId, setShowReceiptId] = useState<string | null>(null);
  
  // Filter state
  const [filterType, setFilterType] = useState<DateFilterType>('today');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number }>({
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  });

  const { appointments, loading, completeAppointment } = useAttendanceQueue(
    filterType,
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
    selectedMonth
  );

  // Verificar si el usuario puede gestionar turnos (administrador o asistente)
  const canManageQueue = userData?.rol === 'administrador' || userData?.rol === 'asistente';

  // Agrupar citas por especialista
  const groupedAppointments = appointments.reduce((acc, appointment) => {
    const key = `${appointment.specialist_id}-${appointment.specialty_name}`;
    if (!acc[key]) {
      acc[key] = {
        specialist_name: appointment.specialist_name,
        specialty_name: appointment.specialty_name,
        specialist_id: appointment.specialist_id,
        appointments: []
      };
    }
    acc[key].appointments.push(appointment);
    return acc;
  }, {} as Record<string, any>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Programada':
        return 'bg-blue-100 text-blue-800';
      case 'En Espera':
        return 'bg-yellow-100 text-yellow-800';
      case 'En Proceso':
        return 'bg-green-100 text-green-800';
      case 'Completada':
        return 'bg-muted text-muted-foreground';
      case 'Cancelada':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Programada':
        return <CalendarIcon className="h-4 w-4" />;
      case 'En Espera':
        return <Clock className="h-4 w-4" />;
      case 'En Proceso':
        return <Activity className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'Pagado':
      case 'Cancelado':
        return 'bg-green-100 text-green-800';
      case 'Pendiente':
      case 'Por Cancelar':
        return 'bg-yellow-100 text-yellow-800';
      case 'Anulado':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const specialistGroups = Object.values(groupedAppointments);

  const getFilterLabel = () => {
    switch (filterType) {
      case 'today':
        return format(new Date(), 'd/M/yyyy');
      case 'date':
        return selectedDate ? format(selectedDate, 'd/M/yyyy') : 'Fecha';
      case 'week':
        return 'Semana Actual';
      case 'month':
        return 'Mes Actual';
      case 'select-month':
        return `${months[selectedMonth.month]} ${selectedMonth.year}`;
      case 'all':
        return 'Todos';
      default:
        return '';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Turnos de Atención</h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
            Gestión de turnos por orden de llegada - {getFilterLabel()}
            {filterType === 'today' && (
              <Badge variant="outline" className="ml-2 animate-pulse">
                <Activity className="h-3 w-3 mr-1" />
                Actualización en tiempo real
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Card className="px-4 py-2">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <div className="text-sm">
                <div className="font-medium">{appointments.length}</div>
                <div className="text-muted-foreground">Citas</div>
              </div>
            </div>
          </Card>
          <Card className="px-4 py-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div className="text-sm">
                <div className="font-medium">{appointments.filter(a => a.status === 'En Espera').length}</div>
                <div className="text-muted-foreground">En espera</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          variant={filterType === 'today' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('today')}
        >
          Hoy
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={filterType === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('date')}
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Fecha
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setFilterType('date');
              }}
              locale={es}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant={filterType === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('week')}
        >
          <CalendarDays className="h-4 w-4 mr-1" />
          Semana Actual
        </Button>

        <Button
          variant={filterType === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('month')}
        >
          Mes Actual
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={filterType === 'select-month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('select-month')}
            >
              Mes
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="flex gap-2">
              <Select
                value={String(selectedMonth.month)}
                onValueChange={(val) => {
                  setSelectedMonth(prev => ({ ...prev, month: parseInt(val) }));
                  setFilterType('select-month');
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(selectedMonth.year)}
                onValueChange={(val) => {
                  setSelectedMonth(prev => ({ ...prev, year: parseInt(val) }));
                  setFilterType('select-month');
                }}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
        >
          Todos
        </Button>
      </div>

      {specialistGroups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No hay citas programadas</h3>
            <p className="text-muted-foreground">No se encontraron citas programadas para el período seleccionado.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={specialistGroups[0]?.specialist_id} className="space-y-4">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {specialistGroups.map((group) => (
              <TabsTrigger 
                key={group.specialist_id} 
                value={group.specialist_id}
                className="flex flex-col items-center p-3 h-auto"
              >
                <div className="font-medium">{group.specialist_name}</div>
                <div className="text-xs text-muted-foreground">{group.specialty_name}</div>
                <Badge variant="outline" className="mt-1">
                  {group.appointments.length} citas
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {specialistGroups.map((group) => (
            <TabsContent key={group.specialist_id} value={group.specialist_id} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <div className="text-xl">{group.specialist_name}</div>
                      <div className="text-sm text-muted-foreground font-normal">{group.specialty_name}</div>
                    </div>
                  </CardTitle>
                </CardHeader>
              </Card>

              <div className="grid gap-4">
                {group.appointments
                  .sort((a: any, b: any) => {
                    // Primero los que están en proceso
                    if (a.status === 'En Proceso' && b.status !== 'En Proceso') return -1;
                    if (b.status === 'En Proceso' && a.status !== 'En Proceso') return 1;
                    
                    // Luego por posición en cola (queue_position) - números menores primero
                    if (a.queue_position && b.queue_position) {
                      return a.queue_position - b.queue_position;
                    }
                    if (a.queue_position) return -1;
                    if (b.queue_position) return 1;
                    
                    // Finalmente por hora de cita
                    return a.appointment_time.localeCompare(b.appointment_time);
                  })
                  .map((appointment: any) => (
                    <Card key={appointment.id} className={`transition-all duration-200 ${
                      appointment.status === 'En Proceso' ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              {appointment.queue_position && (
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                                  {appointment.queue_position}
                                </div>
                              )}
                              <div className="font-medium text-lg">{appointment.patient_name}</div>
                              <Badge className={getStatusColor(appointment.status)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(appointment.status)}
                                  <span>{appointment.status}</span>
                                </div>
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>Hora programada: {appointment.appointment_time}</span>
                                </div>
                                {filterType !== 'today' && filterType !== 'date' && (
                                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <CalendarIcon className="h-4 w-4" />
                                    <span>Fecha: {appointment.appointment_date}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-2 text-sm">
                                  <ClipboardList className="h-4 w-4 text-primary" />
                                  <span className="font-medium">Motivo:</span>
                                  <span>{appointment.reason}</span>
                                </div>
                                {appointment.hms && (
                                  <div className="flex items-center space-x-2 text-sm">
                                    <FileText className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">HMS:</span>
                                    <span className="font-mono text-green-600">{appointment.hms}</span>
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-primary"
                                      onClick={() => setSelectedPatient({ 
                                        id: appointment.patient_id, 
                                        name: appointment.patient_name,
                                        appointmentData: appointment
                                      })}
                                    >
                                      Ver Historia
                                    </Button>
                                  </div>
                                )}
                                {appointment.checked_in_at && (
                                  <div className="text-green-600 text-sm">
                                    Llegada registrada: {new Date(appointment.checked_in_at).toLocaleTimeString()}
                                  </div>
                                )}
                              </div>
                              
                              {/* Payment Info Column */}
                              <div className="space-y-2 border-l pl-4">
                                <div className="flex items-center space-x-2 text-sm">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">Importe:</span>
                                  <span className="font-semibold">
                                    {appointment.monto_pagado ? `S/ ${Number(appointment.monto_pagado).toFixed(2)}` : 'No registrado'}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                  <CreditCard className="h-4 w-4 text-primary" />
                                  <span className="font-medium">Método:</span>
                                  <span>{appointment.modalidad_pago || 'No especificado'}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                  <Badge className={getPaymentStatusColor(appointment.estado_pago)}>
                                    {appointment.estado_pago || 'Sin pago'}
                                  </Badge>
                                  {appointment.payment_id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => setShowReceiptId(appointment.payment_id)}
                                      title="Ver comprobante"
                                    >
                                      <Receipt className="h-4 w-4 text-primary" />
                                    </Button>
                                  )}
                                </div>
                                {appointment.nro_comprobante && (
                                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <Receipt className="h-4 w-4" />
                                    <span>Comprobante: {appointment.nro_comprobante}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            {canManageQueue && appointment.status === 'En Proceso' && (
                              <Button
                                size="sm"
                                onClick={() => completeAppointment(appointment.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Completar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {group.appointments.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="font-medium text-foreground mb-1">Sin citas programadas</h3>
                    <p className="text-muted-foreground text-sm">Este especialista no tiene citas para el período seleccionado.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {selectedPatient && (
        <PatientMedicalHistory
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          appointmentData={selectedPatient.appointmentData}
          onClose={() => setSelectedPatient(null)}
        />
      )}

      <SimpleReceiptDialog 
        paymentId={showReceiptId} 
        onClose={() => setShowReceiptId(null)} 
      />
    </div>
  );
}
