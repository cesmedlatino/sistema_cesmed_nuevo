import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Pill, Save, Loader2, Printer, X, CheckCircle, Download, Search, User } from 'lucide-react';
import { MedicationAutocomplete } from '@/components/pharmacy/MedicationAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useClinicData } from '@/hooks/useClinicData';
import jsPDF from 'jspdf';

interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  dni: string;
  birth_date?: string;
  hms?: string | null;
}

interface Specialist {
  id: string;
  first_name: string;
  last_name: string;
}

interface Medication {
  id: string;
  codigo: string;
  descripcion: string;
  precio_venta?: number;
  stock_actual: number;
  presentation: string;
}

interface MedicationItem {
  medication: Medication;
  dosis: string;
  frecuencia: string;
  duracion: string;
  viaAdministracion: string;
  indicaciones: string;
}

interface SavedPrescription {
  id: string;
  prescription_number: string;
  issue_date: string;
  medications: MedicationItem[];
  instructions: string;
}

interface NewPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrescriptionCreated?: () => void;
}

const frequencies = [
  "Cada 4 horas",
  "Cada 6 horas",
  "Cada 8 horas",
  "Cada 12 horas",
  "Una vez al día",
  "Dos veces al día",
  "Tres veces al día",
  "Según necesidad"
];

const administrationRoutes = [
  "Oral",
  "Oftálmica",
  "Tópica",
  "Intramuscular",
  "Intravenosa",
  "Sublingual"
];

export function NewPrescriptionDialog({
  open,
  onOpenChange,
  onPrescriptionCreated
}: NewPrescriptionDialogProps) {
  const { toast } = useToast();
  const clinicData = useClinicData();
  const [loading, setLoading] = useState(false);
  
  // Patient search state
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Additional patient data
  const [patientEdad, setPatientEdad] = useState('');
  const [patientPeso, setPatientPeso] = useState('');
  const [proximaCita, setProximaCita] = useState('');
  
  // Specialist state
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>("");
  
  // Medications state
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [currentMedication, setCurrentMedication] = useState<Medication | null>(null);
  const [currentDosis, setCurrentDosis] = useState('');
  const [currentFrecuencia, setCurrentFrecuencia] = useState('');
  const [currentDuracion, setCurrentDuracion] = useState('');
  const [currentVia, setCurrentVia] = useState('Oral');
  const [currentIndicaciones, setCurrentIndicaciones] = useState('');
  const [observaciones, setObservaciones] = useState('');
  
  // State for saved prescription
  const [savedPrescription, setSavedPrescription] = useState<SavedPrescription | null>(null);

  // Fetch specialists on mount
  useEffect(() => {
    if (open) {
      fetchSpecialists();
    }
  }, [open]);

  const fetchSpecialists = async () => {
    try {
      const { data, error } = await supabase
        .from('specialists')
        .select('id, first_name, last_name')
        .eq('status', 'Activo')
        .order('first_name');

      if (error) throw error;
      setSpecialists(data || []);
    } catch (error) {
      console.error('Error fetching specialists:', error);
    }
  };

  // Patient search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearchTerm.length >= 2) {
        searchPatients(patientSearchTerm);
      } else {
        setPatientSearchResults([]);
        setShowPatientResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearchTerm]);

  const searchPatients = async (term: string) => {
    setIsSearchingPatient(true);
    try {
      const { data, error } = await supabase.rpc('search_patients', {
        search_term: term
      });

      if (error) throw error;
      setPatientSearchResults(data || []);
      setShowPatientResults(true);
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatientSearchResults([]);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearchTerm(`${patient.first_name} ${patient.last_name}`);
    setShowPatientResults(false);
  };

  const handleAddMedication = () => {
    if (!currentMedication) {
      toast({
        title: "Error",
        description: "Seleccione un medicamento",
        variant: "destructive"
      });
      return;
    }

    if (!currentDosis || !currentFrecuencia || !currentDuracion) {
      toast({
        title: "Error",
        description: "Complete los campos de dosis, frecuencia y duración",
        variant: "destructive"
      });
      return;
    }

    setMedications(prev => [...prev, {
      medication: currentMedication,
      dosis: currentDosis,
      frecuencia: currentFrecuencia,
      duracion: currentDuracion,
      viaAdministracion: currentVia,
      indicaciones: currentIndicaciones
    }]);

    // Reset form
    setCurrentMedication(null);
    setCurrentDosis('');
    setCurrentFrecuencia('');
    setCurrentDuracion('');
    setCurrentVia('Oral');
    setCurrentIndicaciones('');
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index));
  };

  const generatePrescriptionNumber = async () => {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('prescription_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error getting last prescription number:', error);
      return `REC${String(Date.now()).slice(-6)}`;
    }

    if (data && data.length > 0) {
      const lastNumber = data[0].prescription_number;
      const match = lastNumber.match(/REC(\d+)/);
      if (match) {
        const nextNumber = parseInt(match[1], 10) + 1;
        return `REC${String(nextNumber).padStart(6, '0')}`;
      }
    }

    return 'REC000001';
  };

  const handleSave = async () => {
    if (!selectedPatient) {
      toast({
        title: "Error",
        description: "Seleccione un paciente",
        variant: "destructive"
      });
      return;
    }

    if (medications.length === 0) {
      toast({
        title: "Error",
        description: "Agregue al menos un medicamento a la receta",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const prescriptionNumber = await generatePrescriptionNumber();
      
      // Create the prescription without medical_record_id
      const medicationsJson = medications.map(m => ({
        medicamento: m.medication.descripcion,
        codigo: m.medication.codigo,
        presentacion: m.medication.presentation,
        dosis: m.dosis,
        frecuencia: m.frecuencia,
        duracion: m.duracion,
        via: m.viaAdministracion,
        indicaciones: m.indicaciones
      }));

      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          prescription_number: prescriptionNumber,
          patient_id: selectedPatient.id,
          specialist_id: selectedSpecialistId || null,
          medical_record_id: null, // No medical record for generated prescriptions
          issue_date: new Date().toISOString().split('T')[0],
          medications: medicationsJson,
          instructions: observaciones,
          status: 'Activa'
        })
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      // Save the prescription data for viewing/printing
      setSavedPrescription({
        id: prescriptionData.id,
        prescription_number: prescriptionNumber,
        issue_date: new Date().toISOString().split('T')[0],
        medications: medications,
        instructions: observaciones
      });

      toast({
        title: "Receta generada",
        description: `La receta ${prescriptionNumber} se ha creado correctamente`,
      });

      onPrescriptionCreated?.();
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la receta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPrescription = () => {
    if (!savedPrescription || !selectedPatient) return;
    
    const specialist = specialists.find(s => s.id === selectedSpecialistId);
    const specialistName = specialist ? `Dr(a). ${specialist.first_name} ${specialist.last_name}` : "-";
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "No se pudo abrir la ventana de impresión",
        variant: "destructive"
      });
      return;
    }

    const medicationsHTML = savedPrescription.medications.map((med, index) => `
      <div class="medication-card">
        <div class="medication-header">
          <span class="medication-number">${index + 1}</span>
          <div class="medication-info">
            <div class="medication-name">${med.medication.descripcion}</div>
            <div class="medication-details-inline">
              ${med.medication.presentation ? `<span>${med.medication.presentation}</span>` : ''}
              ${med.dosis ? `<span>| ${med.dosis}</span>` : ''}
              ${med.frecuencia ? `<span>| ${med.frecuencia}</span>` : ''}
              ${med.duracion ? `<span>| ${med.duracion}</span>` : ''}
              ${med.viaAdministracion ? `<span>| Vía ${med.viaAdministracion}</span>` : ''}
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
        <title>Receta ${savedPrescription.prescription_number}</title>
        <style>
          @page { size: A4; margin: 10mm 12mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 10px;
            line-height: 1.3;
            color: #1a1a1a;
            background: white;
          }
          .print-content { padding: 8px; }
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
          .clinic-info { font-size: 9px; color: #666; }
          .prescription-box {
            background: linear-gradient(135deg, #663399 0%, #00A651 100%);
            color: white;
            padding: 6px 10px;
            border-radius: 6px;
            text-align: center;
          }
          .prescription-label {
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
          .patient-item { font-size: 9px; }
          .patient-item label { color: #666; }
          .patient-item span { font-weight: 600; }
          .patient-item .hms { color: #00A651; font-family: monospace; }
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
          .instructions-text { color: #4a148c; font-size: 9px; }
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
          .footer-left { font-size: 8px; color: #999; }
          .signature { text-align: center; }
          .signature-space {
            height: 60px;
          }
          .signature-line {
            width: 180px;
            border-bottom: 2px solid #663399;
            margin-bottom: 4px;
          }
          .signature-name { font-weight: 600; color: #663399; font-size: 10px; }
          .signature-role { font-size: 9px; color: #666; }
          .corporate-footer {
            margin-top: 15px;
            padding-top: 8px;
            border-top: 1px solid #e5e5e5;
            text-align: center;
            font-size: 8px;
            color: #999;
          }
          .corporate-footer .name { font-weight: 600; color: #00A651; }
        </style>
      </head>
      <body>
        <div class="print-content">
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
              <div class="prescription-box">
                <div class="prescription-label">Receta Médica</div>
                <div class="prescription-number">${savedPrescription.prescription_number}</div>
              </div>
              <div class="prescription-date">Fecha: ${format(new Date(savedPrescription.issue_date), "dd/MM/yyyy")}</div>
            </div>
          </div>

          <div class="patient-section">
            <div class="section-title">Datos del Paciente</div>
            <div class="patient-grid">
              <div class="patient-item">
                <label>Paciente: </label>
                <span>${selectedPatient.first_name} ${selectedPatient.last_name}</span>
              </div>
              <div class="patient-item">
                <label>DNI: </label>
                <span>${selectedPatient.dni}</span>
              </div>
              <div class="patient-item">
                <label>Edad: </label>
                <span>${patientEdad || '________'}</span>
              </div>
              <div class="patient-item">
                <label>Peso: </label>
                <span>${patientPeso || '________'}</span>
              </div>
              ${selectedPatient.hms ? `
                <div class="patient-item">
                  <label>Historia: </label>
                  <span class="hms">${selectedPatient.hms}</span>
                </div>
              ` : ''}
              <div class="patient-item">
                <label>Médico: </label>
                <span>${specialistName}</span>
              </div>
            </div>
          </div>

          <div class="rx-header">
            <span class="rx-symbol">Rp/</span>
            <div class="rx-line"></div>
          </div>
          
          ${medicationsHTML}

          ${savedPrescription.instructions ? `
            <div class="instructions-section">
              <div class="instructions-title">📋 Indicaciones Generales</div>
              <div class="instructions-text">${savedPrescription.instructions}</div>
            </div>
          ` : ''}

          <div class="next-appointment">
            <strong>📅 Próxima Cita:</strong> ${proximaCita || '________________________________'}
          </div>

          <div class="footer">
            <div class="footer-left">
              <div>Este documento es una receta médica oficial.</div>
              <div>Emitido el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm")}</div>
            </div>
            <div class="signature">
              <div class="signature-space"></div>
              <div class="signature-line"></div>
              <div class="signature-name">${specialistName}</div>
              <div class="signature-role">Médico Tratante</div>
            </div>
          </div>

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
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    if (!savedPrescription || !selectedPatient) return;

    const specialist = specialists.find(s => s.id === selectedSpecialistId);
    const specialistName = specialist ? `Dr(a). ${specialist.first_name} ${specialist.last_name}` : "-";

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(102, 51, 153);
    doc.text("CESMED LATINOAMERICANO", margin, y);
    
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa", margin, y);
    
    y += 5;
    doc.text("Tel: 054-407301 | Cel: 959029377", margin, y);

    // Prescription number box
    doc.setFillColor(102, 51, 153);
    doc.rect(pageWidth - margin - 50, 15, 50, 20, 'F');
    doc.setTextColor(255);
    doc.setFontSize(8);
    doc.text("RECETA MÉDICA", pageWidth - margin - 25, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text(savedPrescription.prescription_number, pageWidth - margin - 25, 30, { align: 'center' });

    // Green line
    y += 10;
    doc.setDrawColor(0, 166, 81);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);

    // Patient info
    y += 15;
    doc.setTextColor(102, 51, 153);
    doc.setFontSize(10);
    doc.text("DATOS DEL PACIENTE", margin, y);
    
    y += 8;
    doc.setTextColor(60);
    doc.setFontSize(10);
    doc.text(`Paciente: ${selectedPatient.first_name} ${selectedPatient.last_name}`, margin, y);
    doc.text(`DNI: ${selectedPatient.dni}`, pageWidth / 2, y);
    
    y += 6;
    if (patientEdad) {
      doc.text(`Edad: ${patientEdad}`, margin, y);
    }
    if (patientPeso) {
      doc.text(`Peso: ${patientPeso}`, pageWidth / 2, y);
    }
    
    if (patientEdad || patientPeso) y += 6;
    
    if (selectedPatient.hms) {
      doc.text(`Historia: ${selectedPatient.hms}`, margin, y);
    }
    doc.text(`Médico: ${specialistName}`, pageWidth / 2, y);
    
    y += 6;
    doc.text(`Fecha: ${format(new Date(savedPrescription.issue_date), "dd/MM/yyyy")}`, margin, y);

    // Medications
    y += 15;
    doc.setTextColor(0, 166, 81);
    doc.setFontSize(16);
    doc.text("Rp/", margin, y);
    doc.setDrawColor(0, 166, 81);
    doc.setLineWidth(0.5);
    doc.line(margin + 15, y - 2, pageWidth - margin, y - 2);

    y += 10;
    savedPrescription.medications.forEach((med, index) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(232, 245, 233);
      doc.rect(margin, y - 5, pageWidth - 2 * margin, 25, 'F');
      
      // Number circle
      doc.setFillColor(0, 166, 81);
      doc.circle(margin + 5, y + 5, 4, 'F');
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.text(String(index + 1), margin + 5, y + 7, { align: 'center' });

      // Medication name
      doc.setTextColor(30);
      doc.setFontSize(11);
      doc.text(med.medication.descripcion, margin + 15, y + 5);

      // Details
      doc.setTextColor(100);
      doc.setFontSize(9);
      const details = `Dosis: ${med.dosis} | Frecuencia: ${med.frecuencia} | Duración: ${med.duracion} | Vía: ${med.viaAdministracion}`;
      doc.text(details, margin + 15, y + 12);

      if (med.indicaciones) {
        doc.setFontSize(8);
        doc.text(`Indicaciones: ${med.indicaciones}`, margin + 15, y + 18);
      }

      y += 30;
    });

    // Instructions
    if (savedPrescription.instructions) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFillColor(243, 229, 245);
      doc.rect(margin, y, pageWidth - 2 * margin, 20, 'F');
      doc.setTextColor(102, 51, 153);
      doc.setFontSize(10);
      doc.text("Indicaciones Generales:", margin + 5, y + 8);
      doc.setTextColor(74, 20, 140);
      doc.setFontSize(9);
      const splitInstructions = doc.splitTextToSize(savedPrescription.instructions, pageWidth - 2 * margin - 10);
      doc.text(splitInstructions, margin + 5, y + 15);
      y += 25;
    }

    // Next appointment
    if (proximaCita) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(227, 242, 253);
      doc.rect(margin, y, pageWidth - 2 * margin, 15, 'F');
      doc.setTextColor(21, 101, 192);
      doc.setFontSize(10);
      doc.text(`📅 Próxima Cita: ${proximaCita}`, margin + 5, y + 10);
      y += 20;
    }

    // Footer with signature - more space for signature
    y = Math.max(y + 40, 260);
    doc.setDrawColor(0, 166, 81);
    doc.line(margin, y, pageWidth - margin, y);
    
    y += 25;
    doc.setDrawColor(102, 51, 153);
    doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
    y += 5;
    doc.setTextColor(102, 51, 153);
    doc.setFontSize(10);
    doc.text(specialistName, pageWidth - margin - 30, y, { align: 'center' });
    y += 5;
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text("Médico Tratante", pageWidth - margin - 30, y, { align: 'center' });

    doc.save(`Receta_${savedPrescription.prescription_number}.pdf`);
  };

  const handleClose = () => {
    setSelectedPatient(null);
    setPatientSearchTerm("");
    setPatientSearchResults([]);
    setSelectedSpecialistId("");
    setMedications([]);
    setCurrentMedication(null);
    setCurrentDosis('');
    setCurrentFrecuencia('');
    setCurrentDuracion('');
    setCurrentVia('Oral');
    setCurrentIndicaciones('');
    setObservaciones('');
    setPatientEdad('');
    setPatientPeso('');
    setProximaCita('');
    setSavedPrescription(null);
    onOpenChange(false);
  };

  const handleNewPrescription = () => {
    setSelectedPatient(null);
    setPatientSearchTerm("");
    setSelectedSpecialistId("");
    setMedications([]);
    setObservaciones('');
    setPatientEdad('');
    setPatientPeso('');
    setProximaCita('');
    setSavedPrescription(null);
  };

  // Success view after saving
  if (savedPrescription) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
              Receta Generada Exitosamente
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 text-center space-y-4">
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Número de Receta</p>
              <p className="text-2xl font-bold text-emerald-700">{savedPrescription.prescription_number}</p>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Paciente: <strong>{selectedPatient?.first_name} {selectedPatient?.last_name}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Medicamentos: <strong>{savedPrescription.medications.length}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handlePrintPrescription}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleNewPrescription}>
              Nueva Receta
            </Button>
            <Button onClick={handleClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Nueva Receta Médica
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Search */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Buscar Paciente</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, apellido o DNI..."
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
                onFocus={() => patientSearchTerm.length >= 2 && setShowPatientResults(true)}
                className="pl-10"
              />
              
              {showPatientResults && (
                <Card className="absolute z-50 w-full mt-1 border bg-background shadow-lg max-h-60 overflow-y-auto">
                  <CardContent className="p-0">
                    {isSearchingPatient ? (
                      <div className="p-3 text-center text-muted-foreground">Buscando...</div>
                    ) : patientSearchResults.length > 0 ? (
                      <div>
                        {patientSearchResults.map((patient) => (
                          <div
                            key={patient.id}
                            className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                            onClick={() => handlePatientSelect(patient)}
                          >
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {patient.first_name} {patient.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  DNI: {patient.dni} | Código: {patient.patient_code}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-muted-foreground">
                        No se encontraron pacientes
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {selectedPatient && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h3>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="ml-auto"
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientSearchTerm("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Código:</span>
                      <p className="font-medium">{selectedPatient.patient_code}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">DNI:</span>
                      <p className="font-medium">{selectedPatient.dni}</p>
                    </div>
                    {selectedPatient.hms && (
                      <div>
                        <span className="text-muted-foreground">HMS:</span>
                        <p className="font-medium font-mono text-primary">{selectedPatient.hms}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Specialist Selection */}
          <div className="space-y-2">
            <Label>Médico Prescriptor (opcional)</Label>
            <Select value={selectedSpecialistId} onValueChange={setSelectedSpecialistId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar médico" />
              </SelectTrigger>
              <SelectContent>
                {specialists.map((specialist) => (
                  <SelectItem key={specialist.id} value={specialist.id}>
                    Dr(a). {specialist.first_name} {specialist.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Add Medication */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <Label className="text-sm font-semibold">Agregar Medicamento</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Medicamento</Label>
                <MedicationAutocomplete
                  value={currentMedication}
                  onChange={(med) => setCurrentMedication(med as Medication | null)}
                  placeholder="Buscar medicamento..."
                />
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Dosis</Label>
                <Input
                  value={currentDosis}
                  onChange={(e) => setCurrentDosis(e.target.value)}
                  placeholder="Ej: 500mg, 10ml"
                />
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Frecuencia</Label>
                <Select value={currentFrecuencia} onValueChange={setCurrentFrecuencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map((freq) => (
                      <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Duración</Label>
                <Input
                  value={currentDuracion}
                  onChange={(e) => setCurrentDuracion(e.target.value)}
                  placeholder="Ej: 7 días, 2 semanas"
                />
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Vía de Administración</Label>
                <Select value={currentVia} onValueChange={setCurrentVia}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {administrationRoutes.map((route) => (
                      <SelectItem key={route} value={route}>{route}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Indicaciones específicas</Label>
                <Textarea
                  value={currentIndicaciones}
                  onChange={(e) => setCurrentIndicaciones(e.target.value)}
                  placeholder="Indicaciones adicionales para este medicamento..."
                  rows={2}
                />
              </div>
            </div>
            
            <Button type="button" onClick={handleAddMedication} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Medicamento
            </Button>
          </div>

          {/* Medications List */}
          {medications.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Medicamentos Agregados ({medications.length})</Label>
              <div className="space-y-2">
                {medications.map((item, index) => (
                  <div 
                    key={index} 
                    className="flex items-start justify-between p-3 border rounded-lg bg-background"
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-1">{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{item.medication.descripcion}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.dosis} | {item.frecuencia} | {item.duracion} | {item.viaAdministracion}
                        </p>
                        {item.indicaciones && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            {item.indicaciones}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMedication(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient Additional Info */}
          {selectedPatient && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Edad</Label>
                <Input
                  value={patientEdad}
                  onChange={(e) => setPatientEdad(e.target.value)}
                  placeholder="Ej: 35 años"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Peso</Label>
                <Input
                  value={patientPeso}
                  onChange={(e) => setPatientPeso(e.target.value)}
                  placeholder="Ej: 70 kg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Próxima Cita</Label>
                <Input
                  value={proximaCita}
                  onChange={(e) => setProximaCita(e.target.value)}
                  placeholder="Ej: 15/02/2026"
                />
              </div>
            </div>
          )}

          {/* General Observations */}
          <div className="space-y-2">
            <Label>Indicaciones Generales</Label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Indicaciones generales para el paciente..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !selectedPatient || medications.length === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Receta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
