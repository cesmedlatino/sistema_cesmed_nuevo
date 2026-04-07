import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileText,
  Search,
  Calendar as CalendarIcon,
  User,
  ChevronDown,
  ChevronRight,
  Package,
  Plus,
  Trash2,
  Printer,
  Stethoscope,
  Building2,
  Clock,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { useClinicData } from "@/hooks/useClinicData";
import { useSuppliesConsultingRoomStock } from "@/hooks/useSuppliesConsultingRoomStock";
import { useConsultingRooms } from "@/hooks/useConsultingRooms";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SUPPLIES_CATEGORIES } from "@/hooks/useSuppliesProducts";

interface AppointmentTurn {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason: string;
  queue_position: number | null;
  patient_id: string;
  patient_name: string;
  patient_dni: string;
  patient_hms: string | null;
  specialist_id: string;
  specialist_name: string;
  consulting_room_id: string | null;
  consulting_room_name: string | null;
}

interface AppointmentConsumption {
  id: string;
  appointment_id: string;
  medication_id: string;
  quantity: number;
  tipo_atencion: string | null;
  observations: string | null;
  created_at: string;
  medication?: {
    id: string;
    codigo: string;
    descripcion: string;
  };
}

// Helper function to get local date string (YYYY-MM-DD)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to get start and end of current week (Sunday to Saturday)
function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return {
    start: getLocalDateString(startOfWeek),
    end: getLocalDateString(endOfWeek),
  };
}

// Helper to get start and end of current month
function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: getLocalDateString(startOfMonth),
    end: getLocalDateString(endOfMonth),
  };
}

// Helper to get start and end of a specific month
function getSpecificMonthRange(year: number, month: number): { start: string; end: string } {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  return {
    start: getLocalDateString(startOfMonth),
    end: getLocalDateString(endOfMonth),
  };
}

// Hook to fetch appointment consumption
function useAppointmentConsumption(appointmentId?: string) {
  return useQuery({
    queryKey: ["appointment-consumption", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return [];
      
      // Get supplies medication IDs - use any to bypass deep type instantiation
      const { data: supplyMeds } = await (supabase
        .from("pharmacy_medications") as any)
        .select("id")
        .in("categoria", SUPPLIES_CATEGORIES);

      const supplyIds = (supplyMeds || []).map((m) => m.id);
      if (supplyIds.length === 0) return [];

      // Use any type to bypass TypeScript generated types that are not yet updated
      const { data, error } = await (supabase
        .from("supplies_attention_consumption") as any)
        .select(`
          *,
          medication:pharmacy_medications(id, codigo, descripcion)
        `)
        .eq("appointment_id", appointmentId)
        .in("medication_id", supplyIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as AppointmentConsumption[];
    },
    enabled: !!appointmentId,
  });
}

// Hook to create appointment consumption
function useCreateAppointmentConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      medicationId,
      quantity,
      tipoAtencion,
      observations,
      consultingRoomId,
    }: {
      appointmentId: string;
      medicationId: string;
      quantity: number;
      tipoAtencion?: string;
      observations?: string;
      consultingRoomId?: string;
    }) => {
      // Use any type to bypass TypeScript generated types that are not yet updated
      const { data, error } = await (supabase
        .from("supplies_attention_consumption") as any)
        .insert({
          appointment_id: appointmentId,
          medication_id: medicationId,
          quantity,
          tipo_atencion: tipoAtencion || null,
          observations: observations || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update consulting room stock if provided
      if (consultingRoomId) {
        const { data: stockData } = await supabase
          .from("supplies_consulting_room_stock")
          .select("id, quantity")
          .eq("consulting_room_id", consultingRoomId)
          .eq("medication_id", medicationId)
          .maybeSingle();

        if (stockData && stockData.quantity >= quantity) {
          await supabase
            .from("supplies_consulting_room_stock")
            .update({ quantity: stockData.quantity - quantity })
            .eq("id", stockData.id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-consumption"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-consulting-room-stock"] });
      toast.success("Consumo registrado correctamente");
    },
    onError: (error: Error) => {
      console.error("Error creating consumption:", error);
      toast.error("Error al registrar el consumo");
    },
  });
}

// Hook to delete appointment consumption
function useDeleteAppointmentConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplies_attention_consumption")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-consumption"] });
      toast.success("Consumo eliminado correctamente");
    },
    onError: (error: Error) => {
      console.error("Error deleting consumption:", error);
      toast.error("Error al eliminar el consumo");
    },
  });
}

export function SuppliesDescargaConsumoPage() {
  const [appointments, setAppointments] = useState<AppointmentTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [expandedAppointments, setExpandedAppointments] = useState<Set<string>>(new Set());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Per-turn consulting room selection (key: appointmentId, value: consultingRoomId)
  const [turnConsultingRooms, setTurnConsultingRooms] = useState<Record<string, string>>({});

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentTurn | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [consumptionToDelete, setConsumptionToDelete] = useState<{ id: string; desc: string } | null>(null);

  const clinicData = useClinicData();
  const { data: consultingRooms } = useConsultingRooms();
  const createConsumption = useCreateAppointmentConsumption();
  const deleteConsumption = useDeleteAppointmentConsumption();

  // Add consumption form state
  const [openProduct, setOpenProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tipoAtencion, setTipoAtencion] = useState("Cita");

  // Get selected consulting room for current appointment
  const getSelectedConsultingRoomId = (appointment: AppointmentTurn) => {
    return turnConsultingRooms[appointment.id] || appointment.consulting_room_id || undefined;
  };

  // Set consulting room for a turn
  const setTurnConsultingRoom = (appointmentId: string, consultingRoomId: string) => {
    setTurnConsultingRooms(prev => ({ ...prev, [appointmentId]: consultingRoomId }));
  };

  useEffect(() => {
    fetchAppointments();
  }, [dateFilter, selectedDate, selectedMonth]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      // Calculate date range based on filter
      let dateStart: string;
      let dateEnd: string;

      switch (dateFilter) {
        case "today":
          dateStart = getLocalDateString();
          dateEnd = dateStart;
          break;
        case "date":
          dateStart = selectedDate ? getLocalDateString(selectedDate) : getLocalDateString();
          dateEnd = dateStart;
          break;
        case "week":
          const weekRange = getWeekRange();
          dateStart = weekRange.start;
          dateEnd = weekRange.end;
          break;
        case "month":
          const monthRange = getMonthRange();
          dateStart = monthRange.start;
          dateEnd = monthRange.end;
          break;
        case "select-month":
          if (selectedMonth) {
            const specificRange = getSpecificMonthRange(selectedMonth.year, selectedMonth.month);
            dateStart = specificRange.start;
            dateEnd = specificRange.end;
          } else {
            const currentMonthRange = getMonthRange();
            dateStart = currentMonthRange.start;
            dateEnd = currentMonthRange.end;
          }
          break;
        case "all":
          dateStart = "2000-01-01";
          dateEnd = "2099-12-31";
          break;
        default:
          dateStart = getLocalDateString();
          dateEnd = dateStart;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          reason,
          queue_position,
          patient_id,
          specialist_id,
          consulting_room_id,
          patients!inner(id, first_name, last_name, dni, hms),
          specialists!inner(id, first_name, last_name),
          consulting_rooms(id, name)
        `)
        .gte("appointment_date", dateStart)
        .lte("appointment_date", dateEnd)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false });

      if (error) throw error;

      const formattedData: AppointmentTurn[] = (data || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status || "Programada",
        reason: apt.reason || "Consulta",
        queue_position: apt.queue_position,
        patient_id: apt.patient_id,
        patient_name: apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : "Paciente",
        patient_dni: apt.patients?.dni || "",
        patient_hms: apt.patients?.hms || null,
        specialist_id: apt.specialist_id,
        specialist_name: apt.specialists ? `${apt.specialists.first_name} ${apt.specialists.last_name}` : "No asignado",
        consulting_room_id: apt.consulting_room_id,
        consulting_room_name: apt.consulting_rooms?.name || null,
      }));

      setAppointments(formattedData);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Error al cargar los turnos de atención");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAppointments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredAppointments = appointments.filter((a) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      a.patient_name.toLowerCase().includes(searchLower) ||
      a.patient_dni.includes(searchLower) ||
      a.specialist_name.toLowerCase().includes(searchLower) ||
      a.reason.toLowerCase().includes(searchLower)
    );
  });

  const handleOpenAddDialog = (appointment: AppointmentTurn) => {
    setSelectedAppointment(appointment);
    setSelectedProduct("");
    setTempQuantity(1);
    setTipoAtencion("Cita");
    setAddDialogOpen(true);
  };

  const handleAddConsumption = async () => {
    if (!selectedAppointment || !selectedProduct) {
      toast.error("Seleccione un producto");
      return;
    }
    if (tempQuantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    const consultingRoomId = getSelectedConsultingRoomId(selectedAppointment);

    try {
      await createConsumption.mutateAsync({
        appointmentId: selectedAppointment.id,
        medicationId: selectedProduct,
        quantity: tempQuantity,
        tipoAtencion,
        consultingRoomId,
      });
      setAddDialogOpen(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleDeleteConsumption = async () => {
    if (!consumptionToDelete) return;
    try {
      await deleteConsumption.mutateAsync(consumptionToDelete.id);
      setDeleteDialogOpen(false);
      setConsumptionToDelete(null);
    } catch {
      // Error handled in hook
    }
  };

  const handlePrintConsumption = (appointment: AppointmentTurn, consumptions: AppointmentConsumption[]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }

    const consultingRoomId = getSelectedConsultingRoomId(appointment);
    const consultingRoom = consultingRooms?.find(r => r.id === consultingRoomId);
    const consultingRoomName = consultingRoom?.name || appointment.consulting_room_name || "No asignado";

    const itemsHTML = consumptions
      .map(
        (item, index) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${item.medication?.codigo || "-"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.medication?.descripcion || "-"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.tipo_atencion || "-"}</td>
      </tr>
    `
      )
      .join("");

    const [year, month, day] = appointment.appointment_date.split("-").map(Number);
    const appointmentDateFormatted = format(new Date(year, month - 1, day), "dd/MM/yyyy", { locale: es });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Descarga de Suministros - Turno ${appointment.appointment_time}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1a1a1a; }
          .container { padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
          .header-left { display: flex; align-items: center; gap: 15px; }
          .logo { width: 120px; height: auto; }
          .clinic-name { font-size: 18px; font-weight: bold; color: #059669; text-transform: uppercase; }
          .clinic-info { font-size: 11px; color: #666; }
          .doc-box { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; }
          .doc-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .doc-number { font-size: 14px; font-weight: bold; margin-top: 4px; }
          .patient-section { background: #f0fdf4; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #10b981; }
          .section-title { font-size: 11px; font-weight: 600; color: #059669; text-transform: uppercase; margin-bottom: 10px; }
          .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .patient-item { font-size: 12px; }
          .patient-item label { color: #666; }
          .patient-item span { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #059669; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          .footer .name { color: #059669; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <img src="/images/logo-cesmed.png" alt="Logo" class="logo" />
              <div>
                <div class="clinic-name">${clinicData.name || "CENTRO MÉDICO"}</div>
                <div class="clinic-info">${clinicData.address || ""}</div>
                <div class="clinic-info">Tel: ${clinicData.phone || ""}</div>
              </div>
            </div>
            <div class="doc-box">
              <div class="doc-label">Descarga de Suministros</div>
              <div class="doc-number">Turno: ${appointment.appointment_time}</div>
            </div>
          </div>

          <div class="patient-section">
            <div class="section-title">Datos del Turno de Atención</div>
            <div class="patient-grid">
              <div class="patient-item"><label>Paciente: </label><span>${appointment.patient_name}</span></div>
              <div class="patient-item"><label>DNI: </label><span>${appointment.patient_dni}</span></div>
              <div class="patient-item"><label>Fecha: </label><span style="color: #059669; font-family: monospace;">${appointmentDateFormatted}</span></div>
              <div class="patient-item"><label>Hora: </label><span>${appointment.appointment_time}</span></div>
              <div class="patient-item"><label>Médico: </label><span>Dr(a). ${appointment.specialist_name}</span></div>
              <div class="patient-item"><label>Motivo: </label><span>${appointment.reason}</span></div>
              <div class="patient-item"><label>Consultorio: </label><span>${consultingRoomName}</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th style="width: 100px;">Código</th>
                <th>Descripción del Suministro</th>
                <th style="width: 80px; text-align: center;">Cantidad</th>
                <th style="width: 120px;">Tipo Atención</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="footer">
            <span class="name">${clinicData.name || "CENTRO MÉDICO"}</span> - Sistema de Control de Suministros Médicos
            <br>Documento generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completada":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
      case "En Proceso":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
      case "En Espera":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
      case "Programada":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300";
      case "Cancelada":
        return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Generate month options for the month selector
  const currentYear = new Date().getFullYear();
  const monthOptions = [];
  for (let y = currentYear; y >= currentYear - 2; y--) {
    for (let m = 12; m >= 1; m--) {
      if (y === currentYear && m > new Date().getMonth() + 1) continue;
      monthOptions.push({ year: y, month: m, label: format(new Date(y, m - 1), "MMMM yyyy", { locale: es }) });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              Descarga por Consumo - Turnos de Atención
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={dateFilter} onValueChange={(v) => {
                setDateFilter(v);
                if (v !== "date") setSelectedDate(undefined);
                if (v !== "select-month") setSelectedMonth(null);
              }}>
                <SelectTrigger className="w-[160px]">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="week">Semana Actual</SelectItem>
                  <SelectItem value="month">Mes Actual</SelectItem>
                  <SelectItem value="select-month">Mes/Año</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>

              {dateFilter === "date" && (
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setDatePickerOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}

              {dateFilter === "select-month" && (
                <Select
                  value={selectedMonth ? `${selectedMonth.year}-${selectedMonth.month}` : ""}
                  onValueChange={(v) => {
                    const [y, m] = v.split("-").map(Number);
                    setSelectedMonth({ year: y, month: m });
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleccionar mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((opt) => (
                      <SelectItem key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente, DNI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : filteredAppointments.length > 0 ? (
            <div className="space-y-3">
              {filteredAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  isExpanded={expandedAppointments.has(appointment.id)}
                  onToggle={() => toggleExpand(appointment.id)}
                  onAddConsumption={() => handleOpenAddDialog(appointment)}
                  onDeleteConsumption={(id, desc) => {
                    setConsumptionToDelete({ id, desc });
                    setDeleteDialogOpen(true);
                  }}
                  onPrint={handlePrintConsumption}
                  getStatusColor={getStatusColor}
                  consultingRooms={consultingRooms || []}
                  selectedConsultingRoomId={turnConsultingRooms[appointment.id] || appointment.consulting_room_id}
                  onConsultingRoomChange={(roomId) => setTurnConsultingRoom(appointment.id, roomId)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron turnos de atención</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Consumption Dialog */}
      <AddConsumptionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        appointment={selectedAppointment}
        consultingRoomId={selectedAppointment ? getSelectedConsultingRoomId(selectedAppointment) : undefined}
        onSubmit={handleAddConsumption}
        isPending={createConsumption.isPending}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        openProduct={openProduct}
        setOpenProduct={setOpenProduct}
        tempQuantity={tempQuantity}
        setTempQuantity={setTempQuantity}
        tipoAtencion={tipoAtencion}
        setTipoAtencion={setTipoAtencion}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar consumo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el registro de consumo de "{consumptionToDelete?.desc}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConsumption}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Add Consumption Dialog Component
function AddConsumptionDialog({
  open,
  onOpenChange,
  appointment,
  consultingRoomId,
  onSubmit,
  isPending,
  selectedProduct,
  setSelectedProduct,
  openProduct,
  setOpenProduct,
  tempQuantity,
  setTempQuantity,
  tipoAtencion,
  setTipoAtencion,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentTurn | null;
  consultingRoomId?: string;
  onSubmit: () => void;
  isPending: boolean;
  selectedProduct: string;
  setSelectedProduct: (id: string) => void;
  openProduct: boolean;
  setOpenProduct: (open: boolean) => void;
  tempQuantity: number;
  setTempQuantity: (qty: number) => void;
  tipoAtencion: string;
  setTipoAtencion: (type: string) => void;
}) {
  const { data: consultingRoomStock } = useSuppliesConsultingRoomStock(consultingRoomId);

  const selectableProducts = (consultingRoomStock || [])
    .filter((item) => item.quantity > 0 && item.medication)
    .map((item) => ({
      id: item.medication!.id,
      codigo: item.medication!.codigo,
      descripcion: item.medication!.descripcion,
      stock_disponible: item.quantity,
    }));

  const selectedProductData = selectableProducts.find((p) => p.id === selectedProduct);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Registrar Consumo de Suministro</AlertDialogTitle>
          <AlertDialogDescription>
            Paciente: <span className="font-semibold">{appointment?.patient_name}</span>
            <br />
            Turno: <span className="font-mono">{appointment?.appointment_time}</span> - {appointment?.reason}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!consultingRoomId ? (
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
              <Building2 className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Seleccione un consultorio para este turno antes de agregar consumos.
              </p>
            </div>
          </div>
        ) : selectableProducts.length === 0 ? (
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
              <Package className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                No hay productos disponibles en el stock del consultorio seleccionado.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <Label>Producto</Label>
              <Popover open={openProduct} onOpenChange={setOpenProduct}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedProductData ? `${selectedProductData.codigo} - ${selectedProductData.descripcion}` : "Seleccionar..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar producto..." />
                    <CommandList>
                      <CommandEmpty>No se encontró producto.</CommandEmpty>
                      <CommandGroup>
                        {selectableProducts.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.codigo} ${p.descripcion}`}
                            onSelect={() => {
                              setSelectedProduct(p.id);
                              setOpenProduct(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedProduct === p.id ? "opacity-100" : "opacity-0")} />
                            <span className="font-mono mr-2">{p.codigo}</span>
                            {p.descripcion}
                            <span className="ml-auto text-muted-foreground">Stock: {p.stock_disponible}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={tempQuantity}
                  onChange={(e) => setTempQuantity(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Tipo de Atención</Label>
                <Select value={tipoAtencion} onValueChange={setTipoAtencion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cita">Cita</SelectItem>
                    <SelectItem value="Procedimiento">Procedimiento</SelectItem>
                    <SelectItem value="Atención">Atención</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onSubmit} 
            disabled={isPending || !consultingRoomId || selectableProducts.length === 0}
          >
            Registrar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Sub-component for each appointment card
function AppointmentCard({
  appointment,
  isExpanded,
  onToggle,
  onAddConsumption,
  onDeleteConsumption,
  onPrint,
  getStatusColor,
  consultingRooms,
  selectedConsultingRoomId,
  onConsultingRoomChange,
}: {
  appointment: AppointmentTurn;
  isExpanded: boolean;
  onToggle: () => void;
  onAddConsumption: () => void;
  onDeleteConsumption: (id: string, desc: string) => void;
  onPrint: (appointment: AppointmentTurn, consumptions: AppointmentConsumption[]) => void;
  getStatusColor: (status: string) => string;
  consultingRooms: Array<{ id: string; name: string; floor: string | null }>;
  selectedConsultingRoomId: string | null | undefined;
  onConsultingRoomChange: (roomId: string) => void;
}) {
  const { data: consumptions } = useAppointmentConsumption(appointment.id);
  const { data: consultingRoomStock } = useSuppliesConsultingRoomStock(selectedConsultingRoomId || undefined);
  const [showRoomSelector, setShowRoomSelector] = useState(false);

  const [year, month, day] = appointment.appointment_date.split("-").map(Number);
  const appointmentDateFormatted = format(new Date(year, month - 1, day), "dd/MM/yyyy", { locale: es });

  const currentRoom = consultingRooms.find(r => r.id === selectedConsultingRoomId);
  const currentRoomName = currentRoom 
    ? `${currentRoom.name}${currentRoom.floor ? ` - ${currentRoom.floor}` : ""}`
    : appointment.consulting_room_name || "Sin consultorio";

  const availableProductsCount = (consultingRoomStock || []).filter(item => item.quantity > 0).length;
  const canAddConsumption = !!selectedConsultingRoomId && availableProductsCount > 0;

  return (
    <Card className="border">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium uppercase">{appointment.patient_name}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {appointment.appointment_time}
                  </Badge>
                  <Badge className={cn("text-xs", getStatusColor(appointment.status))}>
                    {appointment.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                  <span>{appointmentDateFormatted}</span>
                  <span>•</span>
                  <span className="font-medium">{appointment.reason}</span>
                  <span>•</span>
                  <span>Dr(a). {appointment.specialist_name}</span>
                  {appointment.consulting_room_name && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600 font-medium">{appointment.consulting_room_name}</span>
                    </>
                  )}
                  {appointment.patient_hms && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">HC: {appointment.patient_hms}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={consumptions && consumptions.length > 0 ? "default" : "secondary"}>
                <Package className="h-3 w-3 mr-1" />
                {consumptions?.length || 0} insumos
              </Badge>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t">
            {/* Consulting Room Selector for this turn */}
            <div className="flex items-center justify-between mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Descargando del stock de:</p>
                  {!showRoomSelector ? (
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">{currentRoomName}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRoomSelector(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Select 
                        value={selectedConsultingRoomId || ""} 
                        onValueChange={(value) => {
                          onConsultingRoomChange(value);
                          setShowRoomSelector(false);
                        }}
                      >
                        <SelectTrigger className="w-[250px] h-8">
                          <SelectValue placeholder="Seleccionar consultorio" />
                        </SelectTrigger>
                        <SelectContent>
                          {consultingRooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name} {room.floor ? `- ${room.floor}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8"
                        onClick={() => setShowRoomSelector(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-600">
                {availableProductsCount} productos disponibles
              </Badge>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Suministros Empleados</h4>
              <div className="flex gap-2">
                {consumptions && consumptions.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => onPrint(appointment, consumptions)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                )}
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={onAddConsumption} 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={!canAddConsumption}
                  title={!canAddConsumption ? "Seleccione un consultorio con productos disponibles" : undefined}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>

            {consumptions && consumptions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumptions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.medication?.codigo}</TableCell>
                      <TableCell>{c.medication?.descripcion}</TableCell>
                      <TableCell className="text-center">{c.quantity}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.tipo_atencion || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => onDeleteConsumption(c.id, c.medication?.descripcion || "producto")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No hay suministros registrados para este turno
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
