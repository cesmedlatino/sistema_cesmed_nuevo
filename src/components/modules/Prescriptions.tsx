import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Pill, Search, Eye, Printer, Trash2, Calendar, 
  FileText, Filter, RefreshCw, Download, ChevronLeft, 
  ChevronRight, ChevronsLeft, ChevronsRight, X, Plus
} from "lucide-react";
import { useClinicData } from "@/hooks/useClinicData";
import { usePrescriptions, useDeletePrescription, Prescription } from "@/hooks/usePrescriptions";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { NewPrescriptionDialog } from "@/components/prescriptions/NewPrescriptionDialog";

const ITEMS_PER_PAGE = 10;

// Corporate Prescription Print Component
function PrescriptionPrintView({ 
  prescription, 
  clinicData, 
  onClose 
}: { 
  prescription: Prescription; 
  clinicData: any; 
  onClose: () => void;
}) {
  const patient = prescription.patient;
  const specialist = prescription.specialist;
  const medications = Array.isArray(prescription.medications) 
    ? prescription.medications 
    : [];

  const generatePrintHTML = () => {
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : "-";
    const patientDni = patient?.dni || "-";
    const patientHms = patient?.hms || prescription.medical_record?.hms || "-";
    const specialistName = specialist ? `Dr(a). ${specialist.first_name} ${specialist.last_name}` : "-";
    const issueDate = format(parseISO(prescription.issue_date), "dd 'de' MMMM 'de' yyyy", { locale: es });
    const emissionDate = format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es });

    const medicationsHTML = medications.map((med: any, index: number) => `
      <div class="medication-card">
        <div class="medication-header">
          <span class="medication-number">${index + 1}</span>
          <div class="medication-info">
            <div class="medication-name">${med.medicamento || med.descripcion || med.nombre || ""}</div>
            <div class="medication-details-inline">
              ${med.presentacion ? `<span>${med.presentacion}</span>` : ''}
              ${med.dosis ? `<span>| ${med.dosis}</span>` : ''}
              ${med.frecuencia ? `<span>| ${med.frecuencia}</span>` : ''}
              ${med.duracion ? `<span>| ${med.duracion}</span>` : ''}
              ${med.via ? `<span>| Vía ${med.via}</span>` : ''}
            </div>
          </div>
        </div>
        ${med.indicaciones ? `<div class="medication-instructions"><em>→ ${med.indicaciones}</em></div>` : ''}
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receta ${prescription.prescription_number}</title>
        <style>
          @page {
            size: A4;
            margin: 10mm 12mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 10px;
            line-height: 1.3;
            color: #1a1a1a;
            background: white;
          }
          .print-content {
            padding: 8px;
          }
          .header {
            border-bottom: 3px solid #00A651;
            padding-bottom: 10px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo {
            width: 70px;
            height: auto;
            object-fit: contain;
          }
          .clinic-name {
            font-size: 14px;
            font-weight: bold;
            color: #663399;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .clinic-info {
            font-size: 9px;
            color: #666;
          }
          .prescription-number-box {
            background: linear-gradient(135deg, #663399 0%, #00A651 100%);
            color: white;
            padding: 6px 10px;
            border-radius: 6px;
            text-align: center;
          }
          .prescription-number-label {
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .prescription-number {
            font-size: 12px;
            font-weight: bold;
          }
          .prescription-date {
            font-size: 9px;
            color: #666;
            margin-top: 4px;
            text-align: right;
          }
          .patient-section {
            background: #f5f5f5;
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 10px;
            border-left: 3px solid #663399;
          }
          .section-title {
            font-size: 9px;
            font-weight: 600;
            color: #663399;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid #ddd;
          }
          .patient-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px 10px;
          }
          .patient-item {
            font-size: 9px;
          }
          .patient-item label {
            color: #666;
          }
          .patient-item span {
            font-weight: 600;
          }
          .patient-item .hms {
            color: #00A651;
            font-family: monospace;
          }
          .rx-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }
          .rx-symbol {
            font-size: 20px;
            font-family: serif;
            color: #00A651;
          }
          .rx-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(to right, #00A651, #663399);
          }
          .medication-card {
            border-left: 3px solid #00A651;
            background: linear-gradient(to right, #f0fdf4, transparent);
            padding: 5px 8px;
            border-radius: 0 4px 4px 0;
            margin-bottom: 4px;
            page-break-inside: avoid;
          }
          .medication-header {
            display: flex;
            gap: 6px;
            align-items: flex-start;
          }
          .medication-number {
            background: #00A651;
            color: white;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: bold;
            flex-shrink: 0;
          }
          .medication-info {
            flex: 1;
          }
          .medication-name {
            font-size: 10px;
            font-weight: bold;
            color: #1a1a1a;
          }
          .medication-details-inline {
            font-size: 9px;
            color: #555;
            margin-top: 1px;
          }
          .medication-details-inline span {
            margin-right: 2px;
          }
          .medication-instructions {
            font-size: 8px;
            color: #663399;
            margin-left: 22px;
            margin-top: 2px;
          }
          .instructions-section {
            background: #f3e5f5;
            border: 1px solid #ce93d8;
            border-radius: 6px;
            padding: 8px;
            margin-bottom: 10px;
            margin-top: 10px;
          }
          .instructions-title {
            font-weight: 600;
            color: #663399;
            margin-bottom: 4px;
            font-size: 9px;
          }
          .instructions-text {
            color: #4a148c;
            font-size: 9px;
          }
          .next-appointment {
            background: #e3f2fd;
            border: 1px solid #90caf9;
            border-radius: 6px;
            padding: 6px 10px;
            margin: 8px 0;
            color: #1565c0;
            font-size: 9px;
          }
          .footer {
            border-top: 2px solid #00A651;
            padding-top: 15px;
            margin-top: 80px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .footer-left {
            font-size: 8px;
            color: #999;
          }
          .signature {
            text-align: center;
          }
          .signature-space {
            height: 60px;
          }
          .signature-line {
            width: 180px;
            border-bottom: 2px solid #663399;
            margin-bottom: 4px;
          }
          .signature-name {
            font-weight: 600;
            color: #663399;
            font-size: 10px;
          }
          .signature-role {
            font-size: 9px;
            color: #666;
          }
          .corporate-footer {
            margin-top: 15px;
            padding-top: 8px;
            border-top: 1px solid #e5e5e5;
            text-align: center;
            font-size: 8px;
            color: #999;
          }
          .corporate-footer .name {
            font-weight: 600;
            color: #00A651;
          }
        </style>
      </head>
      <body>
        <div class="print-content">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <img src="/images/logo-cesmed.png" alt="Logo CESMED" class="logo" />
              <div>
                <div class="clinic-name">CESMED LATINOAMERICANO</div>
                <div class="clinic-info">Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa</div>
                <div class="clinic-info">Tel: 054-407301 | Cel: 959029377</div>
              </div>
            </div>
            <div>
              <div class="prescription-number-box">
                <div class="prescription-number-label">Receta Médica</div>
                <div class="prescription-number">${prescription.prescription_number}</div>
              </div>
              <div class="prescription-date">Fecha: ${issueDate}</div>
            </div>
          </div>

          <!-- Patient Info -->
          <div class="patient-section">
            <div class="section-title">Datos del Paciente</div>
            <div class="patient-grid">
              <div class="patient-item">
                <label>Paciente: </label>
                <span>${patientName}</span>
              </div>
              <div class="patient-item">
                <label>DNI: </label>
                <span>${patientDni}</span>
              </div>
              <div class="patient-item">
                <label>Historia: </label>
                <span class="hms">${patientHms}</span>
              </div>
              <div class="patient-item">
                <label>Médico: </label>
                <span>${specialistName}</span>
              </div>
              <div class="patient-item">
                <label>Edad: </label>
                <span>________</span>
              </div>
              <div class="patient-item">
                <label>Peso: </label>
                <span>________</span>
              </div>
            </div>
          </div>

          <!-- Medications -->
          <div>
            <div class="rx-header">
              <span class="rx-symbol">Rp/</span>
              <div class="rx-line"></div>
            </div>
            ${medicationsHTML}
          </div>

          <!-- Instructions -->
          ${prescription.instructions ? `
            <div class="instructions-section">
              <div class="instructions-title">📋 Indicaciones Generales</div>
              <div class="instructions-text">${prescription.instructions}</div>
            </div>
          ` : ''}

          <!-- Next Appointment -->
          <div class="next-appointment">
            <strong>📅 Próxima Cita:</strong> ________________________________
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-left">
              <div>Este documento es una receta médica oficial.</div>
              <div>Emitido el ${emissionDate}</div>
            </div>
            <div class="signature">
              <div class="signature-space"></div>
              <div class="signature-line"></div>
              <div class="signature-name">${specialistName}</div>
              <div class="signature-role">Médico Tratante</div>
            </div>
          </div>

          <!-- Corporate Footer -->
          <div class="corporate-footer">
            <div class="name">CESMED LATINOAMERICANO</div>
            <div>Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa | Tel: 054-407301 | Cel: 959029377</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        <\/script>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Por favor permite las ventanas emergentes para imprimir');
      return;
    }
    
    printWindow.document.write(generatePrintHTML());
    printWindow.document.close();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Vista de Impresión - {prescription.prescription_number}
          </DialogTitle>
        </DialogHeader>

        {/* Visual Preview */}
        <div className="bg-white border rounded-lg p-8 max-h-[60vh] overflow-y-auto">
          {/* Header with Logo and Corporate Info */}
          <div className="border-b-4 border-primary pb-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img 
                  src="/images/logo-cesmed.png" 
                  alt="Logo CESMED" 
                  className="w-20 h-20 object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold text-primary uppercase tracking-wide">
                    CESMED LATINOAMERICANO
                  </h1>
                  <p className="text-xs text-muted-foreground">Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa</p>
                  <p className="text-xs text-muted-foreground">
                    Tel: 054-407301 | Cel: 959029377
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-gradient-to-br from-[#663399] to-[#00A651] text-white px-3 py-2 rounded-lg">
                  <p className="text-xs uppercase tracking-wider">Receta Médica</p>
                  <p className="text-lg font-bold">{prescription.prescription_number}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Fecha: {format(parseISO(prescription.issue_date), "dd/MM/yyyy", { locale: es })}
                </p>
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="bg-muted/30 rounded-lg p-3 mb-4">
            <h2 className="text-xs font-semibold text-primary uppercase mb-2">Datos del Paciente</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Paciente: </span>
                <span className="font-semibold">
                  {patient ? `${patient.first_name} ${patient.last_name}` : "-"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">DNI: </span>
                <span className="font-semibold">{patient?.dni || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Historia: </span>
                <span className="font-mono font-semibold text-primary">
                  {patient?.hms || prescription.medical_record?.hms || "-"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Médico: </span>
                <span className="font-semibold">
                  {specialist ? `Dr(a). ${specialist.first_name} ${specialist.last_name}` : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Medications */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl font-serif text-primary">Rp/</span>
              <div className="flex-1 border-b-2 border-primary/20"></div>
            </div>
            
            <div className="space-y-3">
              {medications.map((med: any, index: number) => (
                <div 
                  key={index} 
                  className="border-l-4 border-primary bg-gradient-to-r from-primary/5 to-transparent p-3 rounded-r-lg"
                >
                  <div className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-sm">
                        {med.medicamento || med.descripcion || med.nombre}
                      </p>
                      <div className="grid grid-cols-3 gap-1 mt-1 text-xs text-muted-foreground">
                        {med.presentacion && <p>Pres: {med.presentacion}</p>}
                        {med.dosis && <p>Dosis: {med.dosis}</p>}
                        {med.frecuencia && <p>Frec: {med.frecuencia}</p>}
                        {med.duracion && <p>Dur: {med.duracion}</p>}
                        {med.via && <p>Vía: {med.via}</p>}
                        {med.cantidad && <p>Cant: {med.cantidad}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Instructions */}
          {prescription.instructions && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <h3 className="font-semibold text-amber-800 mb-1 text-xs flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Indicaciones Generales
              </h3>
              <p className="text-xs text-amber-900">{prescription.instructions}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Prescriptions() {
  const clinicData = useClinicData();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Dialog states
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);
  const [printingPrescription, setPrintingPrescription] = useState<Prescription | null>(null);
  const [deletingPrescription, setDeletingPrescription] = useState<Prescription | null>(null);
  const [showNewPrescriptionDialog, setShowNewPrescriptionDialog] = useState(false);

  // Bulk selection states
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 300);
  };

  // Queries and mutations
  const { data: prescriptions, isLoading, refetch } = usePrescriptions({
    search: debouncedSearch,
    startDate,
    endDate,
    status: statusFilter,
  });
  
  const deleteMutation = useDeletePrescription();

  // Selection handlers
  const handleSelectPrescription = (prescriptionId: string, checked: boolean) => {
    setSelectedPrescriptionIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(prescriptionId);
      } else {
        newSet.delete(prescriptionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && paginatedPrescriptions.length > 0) {
      const allIds = new Set(paginatedPrescriptions.map(p => p.id));
      setSelectedPrescriptionIds(allIds);
    } else {
      setSelectedPrescriptionIds(new Set());
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedPrescriptionIds.size === 0) return;

    setIsBulkDeleting(true);
    let deletedCount = 0;

    try {
      for (const id of selectedPrescriptionIds) {
        const { error } = await supabase
          .from("prescriptions")
          .delete()
          .eq("id", id);

        if (!error) {
          deletedCount++;
        }
      }

      toast({
        title: "Recetas eliminadas",
        description: `Se eliminaron ${deletedCount} recetas correctamente.`,
      });

      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      setSelectedPrescriptionIds(new Set());
      setShowBulkDeleteDialog(false);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron eliminar algunas recetas.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Pagination
  const totalItems = prescriptions?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedPrescriptions = useMemo(() => {
    if (!prescriptions) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return prescriptions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [prescriptions, currentPage]);

  // Quick date filters
  const applyQuickFilter = (type: "today" | "week" | "month" | "lastMonth" | "all") => {
    const today = new Date();
    switch (type) {
      case "today":
        const todayStr = format(today, "yyyy-MM-dd");
        setStartDate(todayStr);
        setEndDate(todayStr);
        break;
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        setStartDate(format(weekStart, "yyyy-MM-dd"));
        setEndDate(format(today, "yyyy-MM-dd"));
        break;
      case "month":
        setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
        break;
      case "lastMonth":
        const lastMonth = subMonths(today, 1);
        setStartDate(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
        break;
      case "all":
        setStartDate("");
        setEndDate("");
        break;
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const handleDelete = () => {
    if (deletingPrescription) {
      deleteMutation.mutate(deletingPrescription.id);
      setDeletingPrescription(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "Activa":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Activa</Badge>;
      case "Completada":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Completada</Badge>;
      case "Suspendida":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">Suspendida</Badge>;
      case "Vencida":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Vencida</Badge>;
      default:
        return <Badge variant="secondary">{status || "Sin estado"}</Badge>;
    }
  };

  const formatMedications = (medications: any) => {
    if (!medications) return "-";
    if (Array.isArray(medications)) {
      return medications.map((med: any) => med.medicamento || med.descripcion || med.nombre || "").filter(Boolean).join(", ");
    }
    return "-";
  };

  const getPrescriptionType = (prescription: Prescription) => {
    if (prescription.medical_record_id) {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Con Historia</Badge>;
    }
    return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Generada</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Print Dialog */}
      {printingPrescription && (
        <PrescriptionPrintView 
          prescription={printingPrescription} 
          clinicData={clinicData}
          onClose={() => setPrintingPrescription(null)}
        />
      )}

      {/* New Prescription Dialog */}
      <NewPrescriptionDialog
        open={showNewPrescriptionDialog}
        onOpenChange={setShowNewPrescriptionDialog}
        onPrescriptionCreated={() => refetch()}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Pill className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recetas Médicas</h1>
            <p className="text-sm text-muted-foreground">Gestión y búsqueda de recetas generadas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowNewPrescriptionDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Receta
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Total Recetas</p>
                <p className="text-2xl font-bold text-emerald-700">{totalItems}</p>
              </div>
              <FileText className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Activas</p>
                <p className="text-2xl font-bold text-blue-700">
                  {prescriptions?.filter(p => p.status === "Activa").length || 0}
                </p>
              </div>
              <Pill className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Completadas</p>
                <p className="text-2xl font-bold text-amber-700">
                  {prescriptions?.filter(p => p.status === "Completada").length || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Este Mes</p>
                <p className="text-2xl font-bold text-purple-700">
                  {prescriptions?.filter(p => {
                    const issueDate = parseISO(p.issue_date);
                    const now = new Date();
                    return issueDate.getMonth() === now.getMonth() && 
                           issueDate.getFullYear() === now.getFullYear();
                  }).length || 0}
                </p>
              </div>
              <Download className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => applyQuickFilter("today")}>Hoy</Button>
            <Button variant="outline" size="sm" onClick={() => applyQuickFilter("week")}>Última semana</Button>
            <Button variant="outline" size="sm" onClick={() => applyQuickFilter("month")}>Este mes</Button>
            <Button variant="outline" size="sm" onClick={() => applyQuickFilter("lastMonth")}>Mes anterior</Button>
            <Button variant="outline" size="sm" onClick={() => applyQuickFilter("all")}>Todo</Button>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Limpiar filtros
            </Button>
          </div>

          {/* Main Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label className="text-sm font-medium mb-1.5 block">Buscar</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Código, paciente, DNI, historia o medicamento..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Desde</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Hasta</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-48">
              <Label className="text-sm font-medium mb-1.5 block">Estado</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Activa">Activa</SelectItem>
                  <SelectItem value="Completada">Completada</SelectItem>
                  <SelectItem value="Suspendida">Suspendida</SelectItem>
                  <SelectItem value="Vencida">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Listado de Recetas</CardTitle>
            {selectedPrescriptionIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar seleccionados ({selectedPrescriptionIds.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={paginatedPrescriptions.length > 0 && selectedPrescriptionIds.size === paginatedPrescriptions.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">Tipo</TableHead>
                  <TableHead className="font-semibold">Paciente</TableHead>
                  <TableHead className="font-semibold">Historia</TableHead>
                  <TableHead className="font-semibold">Medicamentos</TableHead>
                  <TableHead className="font-semibold">Médico</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginatedPrescriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No se encontraron recetas</p>
                      <p className="text-sm">Ajusta los filtros de búsqueda para ver resultados</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPrescriptions.map((prescription) => (
                    <TableRow key={prescription.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selectedPrescriptionIds.has(prescription.id)}
                          onCheckedChange={(checked) => handleSelectPrescription(prescription.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-medium text-primary">
                          {prescription.prescription_number}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(prescription.issue_date), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {getPrescriptionType(prescription)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {prescription.patient 
                              ? `${prescription.patient.first_name} ${prescription.patient.last_name}` 
                              : "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            DNI: {prescription.patient?.dni || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {prescription.patient?.hms || prescription.medical_record?.hms || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm line-clamp-2">
                          {formatMedications(prescription.medications)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {prescription.specialist 
                          ? `${prescription.specialist.first_name} ${prescription.specialist.last_name}` 
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(prescription.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setViewingPrescription(prescription)}
                            className="h-8 w-8 p-0"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setPrintingPrescription(prescription)}
                            className="h-8 w-8 p-0"
                            title="Imprimir"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setDeletingPrescription(prescription)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} de {totalItems} recetas
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm font-medium">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewingPrescription} onOpenChange={() => setViewingPrescription(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Receta {viewingPrescription?.prescription_number}
            </DialogTitle>
          </DialogHeader>
          
          {viewingPrescription && (
            <div className="space-y-6">
              {/* Patient & General Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-muted-foreground text-xs">Paciente</Label>
                  <p className="font-medium">
                    {viewingPrescription.patient 
                      ? `${viewingPrescription.patient.first_name} ${viewingPrescription.patient.last_name}` 
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">DNI</Label>
                  <p className="font-medium">{viewingPrescription.patient?.dni || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Historia Clínica</Label>
                  <p className="font-medium font-mono">
                    {viewingPrescription.patient?.hms || viewingPrescription.medical_record?.hms || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Fecha de Emisión</Label>
                  <p className="font-medium">
                    {format(parseISO(viewingPrescription.issue_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Médico</Label>
                  <p className="font-medium">
                    {viewingPrescription.specialist 
                      ? `${viewingPrescription.specialist.first_name} ${viewingPrescription.specialist.last_name}` 
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Estado</Label>
                  <div className="mt-0.5">{getStatusBadge(viewingPrescription.status)}</div>
                </div>
              </div>

              {/* Medications */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Medicamentos Recetados</Label>
                <div className="space-y-3">
                  {Array.isArray(viewingPrescription.medications) && viewingPrescription.medications.map((med: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg bg-background">
                      <p className="font-semibold text-primary">
                        {index + 1}. {med.medicamento || med.descripcion || med.nombre || "Medicamento"}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        {med.presentacion && (
                          <div><span className="text-muted-foreground">Presentación:</span> {med.presentacion}</div>
                        )}
                        {med.dosis && (
                          <div><span className="text-muted-foreground">Dosis:</span> {med.dosis}</div>
                        )}
                        {med.frecuencia && (
                          <div><span className="text-muted-foreground">Frecuencia:</span> {med.frecuencia}</div>
                        )}
                        {med.duracion && (
                          <div><span className="text-muted-foreground">Duración:</span> {med.duracion}</div>
                        )}
                        {med.via && (
                          <div><span className="text-muted-foreground">Vía:</span> {med.via}</div>
                        )}
                        {med.cantidad && (
                          <div><span className="text-muted-foreground">Cantidad:</span> {med.cantidad}</div>
                        )}
                      </div>
                      {med.indicaciones && (
                        <p className="text-sm mt-2 text-muted-foreground italic">
                          {med.indicaciones}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              {viewingPrescription.instructions && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Indicaciones Generales</Label>
                  <p className="text-sm bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900">
                    {viewingPrescription.instructions}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => {
                  setPrintingPrescription(viewingPrescription);
                  setViewingPrescription(null);
                }} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button variant="outline" onClick={() => setViewingPrescription(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPrescription} onOpenChange={() => setDeletingPrescription(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar la receta <strong>{deletingPrescription?.prescription_number}</strong>. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar recetas seleccionadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar <strong>{selectedPrescriptionIds.size}</strong> receta{selectedPrescriptionIds.size !== 1 ? 's' : ''}. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete} 
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? "Eliminando..." : `Eliminar ${selectedPrescriptionIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
