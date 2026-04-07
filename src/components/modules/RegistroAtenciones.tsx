import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FileText, 
  Search, 
  Calendar, 
  User,
  Clock,
  CheckCircle2,
  Filter,
  Pill,
  ChevronDown,
  ChevronRight,
  Receipt,
  Printer,
  Pencil,
  Trash2,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useClinicData } from '@/hooks/useClinicData';
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
import { PatientMedicalHistory } from '@/components/medical-records/PatientMedicalHistory';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GeneratePrescriptionDialog } from '@/components/prescriptions/GeneratePrescriptionDialog';
import { EditPrescriptionDialog } from '@/components/prescriptions/EditPrescriptionDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Prescription {
  id: string;
  prescription_number: string;
  issue_date: string;
  status: string;
  medications: any[];
}

interface RegisteredAttention {
  id: string;
  hms: string;
  visit_date: string;
  especialidad: string;
  fecha_atencion_registrada: string;
  patient_id: string;
  patient_name: string;
  patient_dni: string;
  specialist_id: string | null;
  specialist_name: string;
  prescriptions: Prescription[];
}

// Helper to parse date strings as local dates (avoids UTC timezone shift)
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function RegistroAtenciones() {
  const [registeredAttentions, setRegisteredAttentions] = useState<RegisteredAttention[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [selectedAttentionForPrescription, setSelectedAttentionForPrescription] = useState<RegisteredAttention | null>(null);
  const [expandedAttentions, setExpandedAttentions] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<{ id: string; number: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [prescriptionToEdit, setPrescriptionToEdit] = useState<{ id: string; number: string } | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [attentionToRemove, setAttentionToRemove] = useState<{ id: string; hms: string } | null>(null);
  
  const { toast } = useToast();
  const clinicData = useClinicData();

  useEffect(() => {
    fetchRegisteredAttentions();
  }, [dateFilter]);

  const handleDeletePrescription = async () => {
    if (!prescriptionToDelete) return;
    
    try {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', prescriptionToDelete.id);

      if (error) throw error;

      toast({
        title: "Receta eliminada",
        description: `La receta ${prescriptionToDelete.number} ha sido eliminada correctamente.`,
      });

      fetchRegisteredAttentions();
    } catch (error) {
      console.error('Error deleting prescription:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la receta.",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setPrescriptionToDelete(null);
    }
  };

  const handleRemoveFromRegistry = async () => {
    if (!attentionToRemove) return;
    
    try {
      const { error } = await supabase
        .from('medical_records')
        .update({
          atencion_registrada: false,
          fecha_atencion_registrada: null
        })
        .eq('id', attentionToRemove.id);

      if (error) throw error;

      toast({
        title: "Registro quitado",
        description: `La historia ${attentionToRemove.hms} ha sido quitada del registro de atenciones.`,
      });

      fetchRegisteredAttentions();
    } catch (error) {
      console.error('Error removing from registry:', error);
      toast({
        title: "Error",
        description: "No se pudo quitar del registro de atenciones.",
        variant: "destructive"
      });
    } finally {
      setRemoveDialogOpen(false);
      setAttentionToRemove(null);
    }
  };

  const handlePrintPrescription = (prescription: Prescription, attention: RegisteredAttention) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "No se pudo abrir la ventana de impresión",
        variant: "destructive"
      });
      return;
    }

    const issueDate = format(new Date(prescription.issue_date), "dd 'de' MMMM 'de' yyyy", { locale: es });
    const emissionDate = format(new Date(), "dd/MM/yyyy 'a las' HH:mm");

    const medicationsHTML = prescription.medications.map((med: any, index: number) => `
      <div class="medication-card">
        <div class="medication-header">
          <span class="medication-number">${index + 1}</span>
          <div class="medication-info">
            <div class="medication-name">${med.medicamento || med.medication?.descripcion || med.descripcion || med.name || 'Medicamento'}</div>
            <div class="medication-details-inline">
              ${med.presentacion || med.medication?.presentation || med.presentation ? `<span>${med.presentacion || med.medication?.presentation || med.presentation}</span>` : ''}
              ${med.dosis ? `<span>| ${med.dosis}</span>` : ''}
              ${med.frecuencia ? `<span>| ${med.frecuencia}</span>` : ''}
              ${med.duracion ? `<span>| ${med.duracion}</span>` : ''}
              ${med.via || med.viaAdministracion ? `<span>| Vía ${med.via || med.viaAdministracion}</span>` : ''}
            </div>
          </div>
        </div>
        ${med.indicaciones ? `<div class="medication-instructions"><em>→ ${med.indicaciones}</em></div>` : ''}
      </div>
    `).join('');

    const htmlContent = `
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
                <span>${attention.patient_name}</span>
              </div>
              <div class="patient-item">
                <label>DNI: </label>
                <span>${attention.patient_dni}</span>
              </div>
              <div class="patient-item">
                <label>Historia: </label>
                <span class="hms">${attention.hms}</span>
              </div>
              <div class="patient-item">
                <label>Médico: </label>
                <span>Dr(a). ${attention.specialist_name}</span>
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
              <div class="signature-name">Dr(a). ${attention.specialist_name}</div>
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
            window.onafterprint = function() { window.close(); };
          };
        <\/script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const fetchRegisteredAttentions = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('medical_records')
        .select(`
          id,
          hms,
          visit_date,
          especialidad,
          fecha_atencion_registrada,
          patient_id,
          specialist_id,
          patients (
            id,
            first_name,
            last_name,
            dni
          ),
          specialists (
            id,
            first_name,
            last_name
          )
        `)
        .eq('atencion_registrada', true)
        .order('fecha_atencion_registrada', { ascending: false });

      // Aplicar filtro de fecha usando hora local de Lima
      if (dateFilter === 'today') {
        // Obtener fecha de hoy en hora local (Lima)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayLocal = `${year}-${month}-${day}`;
        query = query.gte('fecha_atencion_registrada', todayLocal);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const year = weekAgo.getFullYear();
        const month = String(weekAgo.getMonth() + 1).padStart(2, '0');
        const day = String(weekAgo.getDate()).padStart(2, '0');
        query = query.gte('fecha_atencion_registrada', `${year}-${month}-${day}`);
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const year = monthAgo.getFullYear();
        const month = String(monthAgo.getMonth() + 1).padStart(2, '0');
        const day = String(monthAgo.getDate()).padStart(2, '0');
        query = query.gte('fecha_atencion_registrada', `${year}-${month}-${day}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Obtener las recetas relacionadas a cada historia
      const medicalRecordIds = (data || []).map((record: any) => record.id);
      
      let prescriptionsMap: Record<string, Prescription[]> = {};
      
      if (medicalRecordIds.length > 0) {
        const { data: prescriptionsData, error: prescError } = await supabase
          .from('prescriptions')
          .select('id, prescription_number, issue_date, status, medications, medical_record_id')
          .in('medical_record_id', medicalRecordIds)
          .order('issue_date', { ascending: false });
        
        if (!prescError && prescriptionsData) {
          prescriptionsData.forEach((presc: any) => {
            if (!prescriptionsMap[presc.medical_record_id]) {
              prescriptionsMap[presc.medical_record_id] = [];
            }
            prescriptionsMap[presc.medical_record_id].push({
              id: presc.id,
              prescription_number: presc.prescription_number,
              issue_date: presc.issue_date,
              status: presc.status,
              medications: presc.medications || []
            });
          });
        }
      }

      const formattedData: RegisteredAttention[] = (data || []).map((record: any) => ({
        id: record.id,
        hms: record.hms || 'Sin HMS',
        visit_date: record.visit_date,
        especialidad: record.especialidad || 'No especificada',
        fecha_atencion_registrada: record.fecha_atencion_registrada,
        patient_id: record.patient_id,
        patient_name: record.patients ? 
          `${record.patients.first_name} ${record.patients.last_name}` : 'Paciente',
        patient_dni: record.patients?.dni || '',
        specialist_id: record.specialist_id || null,
        specialist_name: record.specialists ? 
          `${record.specialists.first_name} ${record.specialists.last_name}` : 'No asignado',
        prescriptions: prescriptionsMap[record.id] || []
      }));

      setRegisteredAttentions(formattedData);
    } catch (error) {
      console.error('Error fetching registered attentions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedAttentions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredAttentions = registeredAttentions.filter(attention => 
    attention.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attention.hms.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attention.patient_dni.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando registros...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            Registro de Atenciones
          </h1>
          <p className="text-muted-foreground mt-1">
            Historias clínicas con atención registrada
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2 bg-primary/10 border-primary/20">
          {filteredAttentions.length} atenciones registradas
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente, HMS o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por fecha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mes</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filteredAttentions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              No hay atenciones registradas
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Las atenciones aparecerán aquí cuando se marquen como registradas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAttentions.map((attention) => (
            <Collapsible 
              key={attention.id}
              open={expandedAttentions.has(attention.id)}
              onOpenChange={() => toggleExpanded(attention.id)}
            >
              <Card className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 h-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {expandedAttentions.has(attention.id) ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <div className="bg-primary/10 rounded-full p-3">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      </div>
                      <div 
                        className="space-y-1 cursor-pointer"
                        onClick={() => setSelectedPatient({ 
                          id: attention.patient_id, 
                          name: attention.patient_name 
                        })}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono">
                            {attention.hms}
                          </Badge>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="font-medium">{attention.patient_name}</span>
                          {attention.prescriptions.length > 0 && (
                            <Badge variant="outline" className="bg-secondary text-secondary-foreground border-secondary">
                              <Receipt className="h-3 w-3 mr-1" />
                              {attention.prescriptions.length} receta{attention.prescriptions.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            DNI: {attention.patient_dni}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Visita: {format(parseLocalDate(attention.visit_date), 'dd/MM/yyyy', { locale: es })}
                          </span>
                          <Badge variant="outline">{attention.especialidad}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 text-sm text-primary">
                        <Clock className="h-3.5 w-3.5" />
                        Registrado: {format(new Date(attention.fecha_atencion_registrada), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAttentionForPrescription(attention);
                            setPrescriptionDialogOpen(true);
                          }}
                        >
                          <Pill className="h-4 w-4 mr-2" />
                          Generar Receta
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPatient({ 
                              id: attention.patient_id, 
                              name: attention.patient_name 
                            });
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Historia
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Quitar del Registro de Atención"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttentionToRemove({ 
                              id: attention.id, 
                              hms: attention.hms 
                            });
                            setRemoveDialogOpen(true);
                          }}
                        >
                          <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>

                {/* Collapsible Prescriptions Section */}
                <CollapsibleContent>
                  {attention.prescriptions.length > 0 && (
                    <div className="border-t border-border bg-muted/30">
                      <div className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-3 pl-10">
                          <Receipt className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-primary">Recetas Generadas</span>
                        </div>
                        <div className="space-y-2 pl-10">
                          {attention.prescriptions.map((prescription) => (
                            <div 
                              key={prescription.id}
                              className="flex items-center justify-between bg-background rounded-lg border border-border p-3 hover:shadow-sm transition-shadow"
                            >
                              <div className="flex items-center gap-3">
                                <div className="bg-primary/10 rounded-full p-2">
                                  <Pill className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-medium text-primary">
                                      {prescription.prescription_number}
                                    </span>
                                    <Badge 
                                      variant={prescription.status === 'active' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {prescription.status === 'active' ? 'Activa' : prescription.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(prescription.issue_date), 'dd/MM/yyyy', { locale: es })}
                                    <span>•</span>
                                    <span>{prescription.medications.length} medicamento{prescription.medications.length !== 1 ? 's' : ''}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrintPrescription(prescription, attention);
                                  }}
                                  title="Imprimir receta"
                                >
                                  <Printer className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrescriptionToEdit({
                                      id: prescription.id,
                                      number: prescription.prescription_number
                                    });
                                    setEditDialogOpen(true);
                                  }}
                                  title="Editar receta"
                                >
                                  <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrescriptionToDelete({
                                      id: prescription.id,
                                      number: prescription.prescription_number
                                    });
                                    setDeleteDialogOpen(true);
                                  }}
                                  title="Eliminar receta"
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {attention.prescriptions.length === 0 && (
                    <div className="border-t border-border bg-muted/30">
                      <div className="px-4 py-4 text-center">
                        <p className="text-sm text-muted-foreground pl-10">
                          No hay recetas generadas para esta historia
                        </p>
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Patient Medical History Dialog */}
      {selectedPatient && (
        <PatientMedicalHistory
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          onClose={() => setSelectedPatient(null)}
        />
      )}

      {/* Generate Prescription Dialog */}
      {selectedAttentionForPrescription && (
        <GeneratePrescriptionDialog
          open={prescriptionDialogOpen}
          onOpenChange={(open) => {
            setPrescriptionDialogOpen(open);
            if (!open) setSelectedAttentionForPrescription(null);
          }}
          medicalRecordId={selectedAttentionForPrescription.id}
          patientId={selectedAttentionForPrescription.patient_id}
          patientName={selectedAttentionForPrescription.patient_name}
          patientDni={selectedAttentionForPrescription.patient_dni}
          hms={selectedAttentionForPrescription.hms}
          specialistId={selectedAttentionForPrescription.specialist_id}
          specialistName={selectedAttentionForPrescription.specialist_name}
          onPrescriptionCreated={() => fetchRegisteredAttentions()}
        />
      )}

      {/* Delete Prescription Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la receta{' '}
              <span className="font-mono font-medium">{prescriptionToDelete?.number}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPrescriptionToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePrescription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Prescription Dialog */}
      {prescriptionToEdit && (
        <EditPrescriptionDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setPrescriptionToEdit(null);
          }}
          prescriptionId={prescriptionToEdit.id}
          prescriptionNumber={prescriptionToEdit.number}
          onPrescriptionUpdated={() => fetchRegisteredAttentions()}
        />
      )}

      {/* Remove from Registry Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar del Registro de Atenciones?</AlertDialogTitle>
            <AlertDialogDescription>
              La historia clínica <span className="font-mono font-medium">{attentionToRemove?.hms}</span> será 
              quitada del registro de atenciones. La historia seguirá existiendo en el sistema, solo 
              dejará de aparecer en esta lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAttentionToRemove(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFromRegistry}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Quitar del Registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
