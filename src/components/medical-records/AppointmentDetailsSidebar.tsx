import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  FileText, 
  Stethoscope,
  User,
  CreditCard,
  MessageSquare,
  Building2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export interface AppointmentData {
  id: string;
  appointment_code?: string;
  appointment_date: string;
  appointment_time: string;
  reason?: string;
  notes?: string;
  status?: string;
  consulting_room?: {
    id: string;
    name: string;
    floor?: string;
  };
  specialist?: {
    id: string;
    first_name: string;
    last_name: string;
    specialty?: string;
  };
  payment?: {
    id: string;
    monto_pagado?: number;
    estado_pago?: string;
  };
}

interface AppointmentDetailsSidebarProps {
  appointment: AppointmentData | null;
  selectedDate?: Date;
}

// Helper to parse date strings as local dates
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function AppointmentDetailsSidebar({ 
  appointment, 
  selectedDate 
}: AppointmentDetailsSidebarProps) {
  if (!appointment) {
    return (
      <div className="w-72 border-l bg-muted/30 flex flex-col h-full print:hidden">
        <div className="p-4 border-b bg-background">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Detalles de Cita
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay cita asociada</p>
            <p className="text-xs mt-1">Seleccione una fecha con cita</p>
          </div>
        </div>
      </div>
    );
  }

  const appointmentDate = parseLocalDate(appointment.appointment_date);
  
  return (
    <div className="w-72 border-l bg-muted/30 flex flex-col h-full print:hidden">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Detalles de Cita
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Código de Cita */}
          {appointment.appointment_code && (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Código de Cita</span>
              </div>
              <p className="font-mono text-lg font-bold text-primary">
                {appointment.appointment_code}
              </p>
            </Card>
          )}

          {/* Estado */}
          {appointment.status && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">Estado</span>
              <Badge 
                variant={
                  appointment.status === 'Completada' ? 'default' :
                  appointment.status === 'En Proceso' ? 'secondary' :
                  appointment.status === 'Cancelada' ? 'destructive' :
                  'outline'
                }
                className="w-full justify-center py-1"
              >
                {appointment.status}
              </Badge>
            </div>
          )}

          <Separator />

          {/* Fecha y Hora */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-muted-foreground uppercase block">Fecha</span>
                <p className="text-sm font-semibold capitalize">
                  {format(appointmentDate, 'EEEE', { locale: es })}
                </p>
                <p className="text-sm">
                  {format(appointmentDate, 'dd MMMM yyyy', { locale: es })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-muted-foreground uppercase block">Hora</span>
                <p className="text-sm font-semibold">
                  {appointment.appointment_time}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Consultorio */}
          {appointment.consulting_room && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/50 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-muted-foreground uppercase block">Consultorio</span>
                <p className="text-sm font-semibold">
                  {appointment.consulting_room.name}
                </p>
                {appointment.consulting_room.floor && (
                  <p className="text-xs text-muted-foreground">
                    Piso {appointment.consulting_room.floor}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Especialista */}
          {appointment.specialist && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <Stethoscope className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-muted-foreground uppercase block">Especialista</span>
                <p className="text-sm font-semibold">
                  Dr(a). {appointment.specialist.first_name} {appointment.specialist.last_name}
                </p>
                {appointment.specialist.specialty && (
                  <p className="text-xs text-muted-foreground">
                    {appointment.specialist.specialty}
                  </p>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Motivo de la Cita */}
          {appointment.reason && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Motivo de Consulta</span>
              </div>
              <Card className="p-3 bg-background">
                <p className="text-sm whitespace-pre-wrap">
                  {appointment.reason}
                </p>
              </Card>
            </div>
          )}

          {/* Notas */}
          {appointment.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Notas</span>
              </div>
              <Card className="p-3 bg-muted/50">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {appointment.notes}
                </p>
              </Card>
            </div>
          )}

          <Separator />

          {/* Información de Pago */}
          {appointment.payment && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Pago</span>
              </div>
              <Card className="p-3 bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monto:</span>
                  <span className="text-sm font-semibold">
                    S/ {appointment.payment.monto_pagado?.toFixed(2) || '0.00'}
                  </span>
                </div>
                {appointment.payment.estado_pago && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    <Badge 
                      variant={appointment.payment.estado_pago === 'Pagado' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {appointment.payment.estado_pago}
                    </Badge>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
