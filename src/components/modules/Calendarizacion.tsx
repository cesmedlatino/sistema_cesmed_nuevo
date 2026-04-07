import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Stethoscope, MapPin, Filter, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  reason: string;
  notes: string;
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    patient_code: string;
  };
  specialists: {
    id: string;
    first_name: string;
    last_name: string;
    color: string;
  };
  consulting_rooms: {
    id: string;
    name: string;
    floor: string;
  } | null;
}

type FilterType = "today" | "date" | "month";
type ViewType = "cards" | "table";

export default function Calendarizacion() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("today");
  const [viewType, setViewType] = useState<ViewType>("cards");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;

      if (filterType === "today") {
        const today = format(new Date(), "yyyy-MM-dd");
        startDate = today;
        endDate = today;
      } else if (filterType === "date") {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        startDate = dateStr;
        endDate = dateStr;
      } else {
        startDate = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
        endDate = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
      }

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          duration_minutes,
          status,
          reason,
          notes,
          patients!inner(id, first_name, last_name, patient_code),
          specialists!inner(id, first_name, last_name, color),
          consulting_rooms(id, name, floor)
        `)
        .gte("appointment_date", startDate)
        .lte("appointment_date", endDate)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [filterType, selectedDate, selectedMonth]);

  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return appointments;
    const term = searchTerm.toLowerCase();
    return appointments.filter(
      (apt) =>
        apt.patients.first_name.toLowerCase().includes(term) ||
        apt.patients.last_name.toLowerCase().includes(term) ||
        apt.patients.patient_code.toLowerCase().includes(term) ||
        apt.specialists.first_name.toLowerCase().includes(term) ||
        apt.specialists.last_name.toLowerCase().includes(term) ||
        apt.reason?.toLowerCase().includes(term)
    );
  }, [appointments, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Programada":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "En Proceso":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Completada":
        return "bg-green-100 text-green-800 border-green-200";
      case "Cancelada":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getFilterTitle = () => {
    if (filterType === "today") {
      return `Hoy - ${format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}`;
    } else if (filterType === "date") {
      return format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } else {
      return format(selectedMonth, "MMMM 'de' yyyy", { locale: es });
    }
  };

  // Group appointments by date for month view
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    filteredAppointments.forEach((apt) => {
      if (!grouped[apt.appointment_date]) {
        grouped[apt.appointment_date] = [];
      }
      grouped[apt.appointment_date].push(apt);
    });
    return grouped;
  }, [filteredAppointments]);

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + (direction === "prev" ? -1 : 1));
    setSelectedMonth(newDate);
  };

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <Card className="mb-3 hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: appointment.specialists.color || "#5c1c8c" }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold text-sm">
                {appointment.appointment_time.slice(0, 5)}
              </span>
              <span className="text-muted-foreground text-xs">
                ({appointment.duration_minutes} min)
              </span>
              <Badge variant="outline" className={cn("text-xs", getStatusColor(appointment.status))}>
                {appointment.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium truncate">
                {appointment.patients.first_name} {appointment.patients.last_name}
              </span>
              <span className="text-xs text-muted-foreground">
                ({appointment.patients.patient_code})
              </span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">
                Dr(a). {appointment.specialists.first_name} {appointment.specialists.last_name}
              </span>
            </div>

            {appointment.consulting_rooms && (
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {appointment.consulting_rooms.name}
                  {appointment.consulting_rooms.floor && ` - Piso ${appointment.consulting_rooms.floor}`}
                </span>
              </div>
            )}

            {appointment.reason && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                <span className="font-medium">Motivo:</span> {appointment.reason}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const AppointmentsTable = ({ appointments }: { appointments: Appointment[] }) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[100px]">Fecha</TableHead>
            <TableHead className="w-[80px]">Hora</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Especialista</TableHead>
            <TableHead>Consultorio</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="w-[100px]">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((apt) => (
            <TableRow key={apt.id} className="hover:bg-muted/30">
              <TableCell className="font-medium text-sm">
                {format(parseISO(apt.appointment_date), "dd/MM/yyyy")}
              </TableCell>
              <TableCell className="font-medium">
                {apt.appointment_time.slice(0, 5)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: apt.specialists.color || "#5c1c8c" }}
                  />
                  {apt.patients.first_name} {apt.patients.last_name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {apt.patients.patient_code}
              </TableCell>
              <TableCell className="text-sm">
                Dr(a). {apt.specialists.first_name} {apt.specialists.last_name}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {apt.consulting_rooms?.name || "-"}
              </TableCell>
              <TableCell className="text-sm max-w-[200px] truncate" title={apt.reason}>
                {apt.reason || "-"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("text-xs", getStatusColor(apt.status))}>
                  {apt.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderMonthCalendar = () => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    return (
      <div className="bg-background rounded-lg border">
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((dayName) => (
            <div key={dayName} className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
              {dayName}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((dayItem, idx) => {
            const dateStr = format(dayItem, "yyyy-MM-dd");
            const dayAppointments = appointmentsByDate[dateStr] || [];
            const isCurrentMonth = isSameMonth(dayItem, selectedMonth);
            const isToday = isSameDay(dayItem, new Date());

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[120px] p-2 border-r border-b last:border-r-0",
                  !isCurrentMonth && "bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                    isToday && "bg-primary text-primary-foreground",
                    !isCurrentMonth && "text-muted-foreground"
                  )}
                >
                  {format(dayItem, "d")}
                </div>
                <ScrollArea className="h-[80px]">
                  {dayAppointments.slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      className="text-xs p-1 mb-1 rounded truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: `${apt.specialists.color}20`, borderLeft: `3px solid ${apt.specialists.color}` }}
                      title={`${apt.appointment_time.slice(0, 5)} - ${apt.patients.first_name} ${apt.patients.last_name}`}
                    >
                      <span className="font-medium">{apt.appointment_time.slice(0, 5)}</span>{" "}
                      {apt.patients.first_name.charAt(0)}. {apt.patients.last_name}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayAppointments.length - 3} más
                    </div>
                  )}
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAppointmentsList = () => {
    if (viewType === "table") {
      return <AppointmentsTable appointments={filteredAppointments} />;
    }
    return (
      <div className="grid gap-4">
        {filteredAppointments.map((apt) => (
          <AppointmentCard key={apt.id} appointment={apt} />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendarización</h1>
          <p className="text-muted-foreground">Vista de todas las citas médicas programadas</p>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup type="single" value={viewType} onValueChange={(v) => v && setViewType(v as ViewType)}>
            <ToggleGroupItem value="cards" aria-label="Vista de tarjetas" title="Vista de tarjetas">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Vista de tabla" title="Vista de tabla">
              <TableIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Badge variant="secondary" className="text-sm">
            {filteredAppointments.length} cita{filteredAppointments.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar por:</span>
            </div>
            
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as FilterType)} className="w-full lg:w-auto">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto">
                <TabsTrigger value="today" className="text-sm">Hoy</TabsTrigger>
                <TabsTrigger value="date" className="text-sm">Por Fecha</TabsTrigger>
                <TabsTrigger value="month" className="text-sm">Por Mes</TabsTrigger>
              </TabsList>
            </Tabs>

            {filterType === "date" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}

            {filterType === "month" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[160px] text-center font-medium">
                  {format(selectedMonth, "MMMM yyyy", { locale: es })}
                </div>
                <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex-1 lg:max-w-xs w-full">
              <Input
                placeholder="Buscar paciente, especialista, motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Título del período */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold capitalize">{getFilterTitle()}</h2>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando citas...</p>
          </div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay citas programadas</h3>
              <p className="text-muted-foreground">
                No se encontraron citas para el período seleccionado
              </p>
            </div>
          </CardContent>
        </Card>
      ) : filterType === "month" ? (
        <div className="space-y-6">
          {renderMonthCalendar()}
          
          {/* Lista de citas del mes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Listado de Citas del Mes</CardTitle>
              <ToggleGroup type="single" value={viewType} onValueChange={(v) => v && setViewType(v as ViewType)} size="sm">
                <ToggleGroupItem value="cards" aria-label="Vista de tarjetas">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Vista de tabla">
                  <TableIcon className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </CardHeader>
            <CardContent>
              {viewType === "table" ? (
                <AppointmentsTable appointments={filteredAppointments} />
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  {Object.entries(appointmentsByDate)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, apts]) => (
                      <div key={date} className="mb-6">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1 capitalize">
                          {format(parseISO(date), "EEEE, d 'de' MMMM", { locale: es })}
                        </h3>
                        {apts.map((apt) => (
                          <AppointmentCard key={apt.id} appointment={apt} />
                        ))}
                      </div>
                    ))}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        renderAppointmentsList()
      )}
    </div>
  );
}
