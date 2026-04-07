import React, { useState } from 'react';
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
import { Plus, Trash2, Pill, Save, Loader2, Eye, Printer, X, CheckCircle, Download } from 'lucide-react';
import { MedicationAutocomplete } from '@/components/pharmacy/MedicationAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

import { useClinicData } from '@/hooks/useClinicData';
import jsPDF from 'jspdf';

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

interface GeneratePrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicalRecordId: string;
  patientId: string;
  patientName: string;
  patientDni: string;
  hms: string;
  specialistId: string | null;
  specialistName: string;
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

export function GeneratePrescriptionDialog({
  open,
  onOpenChange,
  medicalRecordId,
  patientId,
  patientName,
  patientDni,
  hms,
  specialistId,
  specialistName,
  onPrescriptionCreated
}: GeneratePrescriptionDialogProps) {
  const { toast } = useToast();
  const clinicData = useClinicData();
  const [loading, setLoading] = useState(false);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [currentMedication, setCurrentMedication] = useState<Medication | null>(null);
  const [currentDosis, setCurrentDosis] = useState('');
  const [currentFrecuencia, setCurrentFrecuencia] = useState('');
  const [currentDuracion, setCurrentDuracion] = useState('');
  const [currentVia, setCurrentVia] = useState('Oral');
  const [currentIndicaciones, setCurrentIndicaciones] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fechaProximaRevision, setFechaProximaRevision] = useState('');
  
  // Additional patient data
  const [patientEdad, setPatientEdad] = useState('');
  const [patientPeso, setPatientPeso] = useState('');
  
  // State for saved prescription and view modes
  const [savedPrescription, setSavedPrescription] = useState<SavedPrescription | null>(null);
  const [showViewMode, setShowViewMode] = useState(false);
  const [showPrintMode, setShowPrintMode] = useState(false);

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
      
      // Create the prescription
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
          patient_id: patientId,
          specialist_id: specialistId,
          medical_record_id: medicalRecordId,
          issue_date: new Date().toISOString().split('T')[0],
          medications: medicationsJson,
          instructions: observaciones,
          status: 'Activa'
        })
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      // Create the attention record linking the medical record with the prescription
      const { error: attentionError } = await supabase
        .from('attention_records')
        .insert({
          medical_record_id: medicalRecordId,
          prescription_id: prescriptionData.id,
          patient_id: patientId,
          specialist_id: specialistId,
          attention_date: new Date().toISOString(),
          notes: `Receta ${prescriptionNumber} generada`
        });

      if (attentionError) {
        console.error('Error creating attention record:', attentionError);
      }

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

  const handleViewPrescription = () => {
    setShowViewMode(true);
  };

  const handlePrintPrescription = () => {
    if (!savedPrescription) return;
    
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
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #1a1a1a;
            background: white;
          }
          .print-content { padding: 20px; }
          .header {
            border-bottom: 4px solid #00A651;
            padding-bottom: 20px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .logo {
            width: 140px;
            height: auto;
            object-fit: contain;
          }
          .clinic-name {
            font-size: 18px;
            font-weight: bold;
            color: #663399;
            text-transform: uppercase;
          }
          .clinic-info { font-size: 11px; color: #666; }
          .prescription-box {
            background: linear-gradient(135deg, #663399 0%, #00A651 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            text-align: center;
          }
          .prescription-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .prescription-number {
            font-size: 16px;
            font-weight: bold;
          }
          .prescription-date {
            font-size: 11px;
            color: #666;
            margin-top: 8px;
            text-align: right;
          }
          .patient-section {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 4px solid #663399;
          }
          .section-title {
            font-size: 11px;
            font-weight: 600;
            color: #663399;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #ddd;
          }
          .patient-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .patient-item { font-size: 12px; }
          .patient-item label { color: #666; }
          .patient-item span { font-weight: 600; }
          .patient-item .hms { color: #00A651; font-family: monospace; }
          .rx-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
          }
          .rx-symbol {
            font-size: 28px;
            font-family: serif;
            color: #00A651;
          }
          .rx-line {
            flex: 1;
            height: 2px;
            background: linear-gradient(to right, #00A651, #663399);
          }
          .medication-card {
            border-left: 4px solid #00A651;
            background: linear-gradient(to right, #e8f5e9, transparent);
            padding: 15px;
            border-radius: 0 8px 8px 0;
            margin-bottom: 12px;
          }
          .medication-header {
            display: flex;
            gap: 10px;
            align-items: flex-start;
          }
          .medication-number {
            background: #00A651;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
          }
          .medication-name {
            font-size: 14px;
            font-weight: bold;
            color: #1a1a1a;
          }
          .medication-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            margin-top: 10px;
            padding-left: 34px;
            font-size: 11px;
            color: #666;
          }
          .medication-details .label { font-weight: 500; color: #663399; }
          .medication-instructions {
            margin-top: 10px;
            padding-left: 34px;
            font-style: italic;
            border-top: 1px dashed #00A651;
            padding-top: 8px;
            font-size: 11px;
          }
          .instructions-section {
            background: #f3e5f5;
            border: 1px solid #ce93d8;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
          }
          .instructions-title {
            font-weight: 600;
            color: #663399;
            margin-bottom: 8px;
          }
          .instructions-text { color: #4a148c; }
          .next-appointment {
            background: #e3f2fd;
            border: 1px solid #90caf9;
            border-radius: 8px;
            padding: 12px 15px;
            margin: 15px 0;
            color: #1565c0;
          }
          .footer {
            border-top: 2px solid #00A651;
            padding-top: 20px;
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .footer-left { font-size: 10px; color: #999; }
          .signature { text-align: center; }
          .signature-space {
            height: 50px;
          }
          .signature-line {
            width: 200px;
            border-bottom: 2px solid #663399;
            margin-bottom: 5px;
          }
          .signature-name { font-weight: 600; color: #663399; }
          .signature-role { font-size: 11px; color: #666; }
          .corporate-footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e5e5;
            text-align: center;
            font-size: 10px;
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
              <div class="patient-item"><label>Paciente: </label><span>${patientName}</span></div>
              <div class="patient-item"><label>DNI: </label><span>${patientDni}</span></div>
              ${patientEdad ? `<div class="patient-item"><label>Edad: </label><span>${patientEdad}</span></div>` : ''}
              ${patientPeso ? `<div class="patient-item"><label>Peso: </label><span>${patientPeso}</span></div>` : ''}
              <div class="patient-item"><label>Historia: </label><span class="hms">${hms}</span></div>
              <div class="patient-item"><label>Médico: </label><span>Dr(a). ${specialistName}</span></div>
            </div>
          </div>

          <div class="rx-header">
            <span class="rx-symbol">Rp/</span>
            <div class="rx-line"></div>
          </div>

          ${medicationsHTML}

          ${savedPrescription.instructions ? `
            <div class="instructions-section">
              <div class="instructions-title">Indicaciones Generales</div>
              <div class="instructions-text">${savedPrescription.instructions}</div>
            </div>
          ` : ''}

          ${fechaProximaRevision ? `
            <div class="next-appointment">
              <strong>📅 Próxima Cita:</strong> ${fechaProximaRevision}
            </div>
          ` : ''}

          <div class="footer">
            <div class="footer-left">
              Documento generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm")}
            </div>
            <div class="signature">
              <div class="signature-space"></div>
              <div class="signature-line"></div>
              <div class="signature-name">Dr(a). ${specialistName}</div>
              <div class="signature-role">Médico Tratante</div>
            </div>
          </div>

          <div class="corporate-footer">
            <span class="name">CESMED LATINOAMERICANO</span>
            <br>Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa | Tel: 054-407301 | Cel: 959029377
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

  const handleDownloadPDF = () => {
    if (!savedPrescription) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(102, 51, 153);
    doc.text('CESMED LATINOAMERICANO', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Cooperativa Villa Porongoche G-17 | Paucarpata - Arequipa', margin, y);
    y += 5;
    doc.text('Tel: 054-407301 | Cel: 959029377', margin, y);
    y += 5;

    // Prescription Number (right aligned)
    doc.setFontSize(14);
    doc.setTextColor(102, 51, 153);
    doc.text('RECETA MÉDICA', pageWidth - margin, 20, { align: 'right' });
    doc.setFontSize(12);
    doc.text(savedPrescription.prescription_number, pageWidth - margin, 28, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha: ${format(new Date(savedPrescription.issue_date), "dd/MM/yyyy")}`, pageWidth - margin, 36, { align: 'right' });

    y += 10;

    // Divider line
    doc.setDrawColor(102, 51, 153);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Patient Info
    doc.setFontSize(11);
    doc.setTextColor(102, 51, 153);
    doc.text('DATOS DEL PACIENTE', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Paciente: ${patientName}`, margin, y);
    doc.text(`DNI: ${patientDni}`, pageWidth / 2, y);
    y += 6;
    
    if (patientEdad) {
      doc.text(`Edad: ${patientEdad}`, margin, y);
    }
    if (patientPeso) {
      doc.text(`Peso: ${patientPeso}`, pageWidth / 2, y);
    }
    if (patientEdad || patientPeso) y += 6;
    
    doc.text(`Historia Clínica: ${hms}`, margin, y);
    doc.text(`Médico: Dr(a). ${specialistName}`, pageWidth / 2, y);
    y += 12;

    // Medications
    doc.setFontSize(14);
    doc.setTextColor(102, 51, 153);
    doc.text('Rp/', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    savedPrescription.medications.forEach((med, index) => {
      // Check for page break
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`${index + 1}. ${med.medication.descripcion}`, margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`   Presentación: ${med.medication.presentation}`, margin, y);
      y += 5;
      doc.text(`   Dosis: ${med.dosis} | Frecuencia: ${med.frecuencia}`, margin, y);
      y += 5;
      doc.text(`   Duración: ${med.duracion} | Vía: ${med.viaAdministracion}`, margin, y);
      y += 5;

      if (med.indicaciones) {
        const indLines = doc.splitTextToSize(`   Indicaciones: ${med.indicaciones}`, pageWidth - margin * 2);
        doc.text(indLines, margin, y);
        y += indLines.length * 5;
      }

      y += 5;
    });

    // Instructions
    if (savedPrescription.instructions) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      y += 5;
      doc.setFontSize(11);
      doc.setTextColor(102, 51, 153);
      doc.text('INDICACIONES GENERALES', margin, y);
      y += 7;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const instLines = doc.splitTextToSize(savedPrescription.instructions, pageWidth - margin * 2);
      doc.text(instLines, margin, y);
      y += instLines.length * 5 + 10;
    }

    // Signature area
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    y = Math.max(y + 20, 240);
    doc.setDrawColor(0, 0, 0);
    doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Dr(a). ${specialistName}`, pageWidth - margin - 30, y, { align: 'center' });
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Médico Tratante', pageWidth - margin - 30, y, { align: 'center' });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(clinicData.name || 'CENTRO MÉDICO', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`${clinicData.address || ''} | Tel: ${clinicData.phone || ''}`, pageWidth / 2, footerY + 4, { align: 'center' });

    // Save the PDF
    doc.save(`Receta_${savedPrescription.prescription_number}.pdf`);

    toast({
      title: "PDF descargado",
      description: `Receta ${savedPrescription.prescription_number} guardada como PDF`,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset all states
    setMedications([]);
    setObservaciones('');
    setFechaProximaRevision('');
    setSavedPrescription(null);
    setShowViewMode(false);
    setShowPrintMode(false);
  };

  const handleNewPrescription = () => {
    setMedications([]);
    setObservaciones('');
    setFechaProximaRevision('');
    setSavedPrescription(null);
    setShowViewMode(false);
  };

  // Print View
  if (showPrintMode && savedPrescription) {
    return (
      <>
        <div className="print:block hidden">
          <div className="max-w-4xl mx-auto p-8 bg-white print:text-black">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 border-b-2 border-primary pb-4">
              <div className="flex items-center gap-4">
                <img 
                  src="/images/logo-cesmed.png" 
                  alt="Logo CESMED" 
                  className="w-32 h-auto object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-600 uppercase tracking-wider">
                    {clinicData.name || "Centro Médico"}
                  </h1>
                  <p className="text-sm text-gray-500">{clinicData.address}</p>
                  <p className="text-sm text-gray-500">{clinicData.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">RECETA MÉDICA</p>
                <p className="text-primary font-semibold">{savedPrescription.prescription_number}</p>
                <p className="text-sm text-gray-500">
                  Fecha: {format(new Date(savedPrescription.issue_date), "dd/MM/yyyy")}
                </p>
              </div>
            </div>

            {/* Patient Info */}
            <div className="border-b pb-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Paciente: </span>
                  <span className="font-semibold">{patientName}</span>
                </div>
                <div>
                  <span className="text-gray-500">DNI: </span>
                  <span>{patientDni}</span>
                </div>
                <div>
                  <span className="text-gray-500">Historia: </span>
                  <span>{hms}</span>
                </div>
                <div>
                  <span className="text-gray-500">Médico: </span>
                  <span>{specialistName}</span>
                </div>
              </div>
            </div>

            {/* Medications */}
            <div className="mb-8">
              <h3 className="font-bold text-lg mb-4">Rp/</h3>
              <div className="space-y-3">
                {savedPrescription.medications.map((med, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-primary">
                    <p className="font-semibold">{index + 1}. {med.medication.descripcion}</p>
                    <p className="text-sm text-gray-600">Presentación: {med.medication.presentation}</p>
                    <p className="text-sm text-gray-600">Dosis: {med.dosis}</p>
                    <p className="text-sm text-gray-600">Frecuencia: {med.frecuencia}</p>
                    <p className="text-sm text-gray-600">Duración: {med.duracion}</p>
                    <p className="text-sm text-gray-600">Vía: {med.viaAdministracion}</p>
                    {med.indicaciones && <p className="text-sm text-gray-600 mt-1 italic">{med.indicaciones}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {savedPrescription.instructions && (
              <div className="mb-8">
                <h3 className="font-bold text-lg mb-2">Indicaciones:</h3>
                <p className="text-gray-700">{savedPrescription.instructions}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end mt-16">
              <div className="text-center">
                <div className="border-t border-black w-48 mb-2"></div>
                <p className="text-sm">Firma del Médico</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center print:hidden">
          <Button onClick={() => setShowPrintMode(false)} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Cerrar Vista de Impresión
          </Button>
        </div>
      </>
    );
  }

  // View Mode Dialog
  if (showViewMode && savedPrescription) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Receta {savedPrescription.prescription_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Patient Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-muted-foreground text-xs">Paciente</Label>
                <p className="font-medium">{patientName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">DNI</Label>
                <p className="font-medium">{patientDni}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Historia Clínica</Label>
                <p className="font-medium font-mono">{hms}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Fecha de Emisión</Label>
                <p className="font-medium">{format(new Date(savedPrescription.issue_date), "dd/MM/yyyy")}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs">Médico</Label>
                <p className="font-medium">{specialistName}</p>
              </div>
            </div>

            {/* Medications */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">Medicamentos Recetados</Label>
              <div className="space-y-3">
                {savedPrescription.medications.map((med, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-background">
                    <p className="font-semibold text-primary">
                      {index + 1}. {med.medication.descripcion}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div><span className="text-muted-foreground">Presentación:</span> {med.medication.presentation}</div>
                      <div><span className="text-muted-foreground">Dosis:</span> {med.dosis}</div>
                      <div><span className="text-muted-foreground">Frecuencia:</span> {med.frecuencia}</div>
                      <div><span className="text-muted-foreground">Duración:</span> {med.duracion}</div>
                      <div><span className="text-muted-foreground">Vía:</span> {med.viaAdministracion}</div>
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
            {savedPrescription.instructions && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">Indicaciones Generales</Label>
                <p className="text-sm bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900">
                  {savedPrescription.instructions}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowViewMode(false)}>
              Volver
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            <Button onClick={handlePrintPrescription}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Success View after saving
  if (savedPrescription) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">¡Receta Generada!</h2>
              <p className="text-muted-foreground mt-1">
                La receta <span className="font-mono font-semibold text-primary">{savedPrescription.prescription_number}</span> ha sido creada exitosamente
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-left text-sm space-y-1">
              <p><span className="text-muted-foreground">Paciente:</span> {patientName}</p>
              <p><span className="text-muted-foreground">Historia:</span> {hms}</p>
              <p><span className="text-muted-foreground">Medicamentos:</span> {savedPrescription.medications.length}</p>
              <p><span className="text-muted-foreground">Fecha:</span> {format(new Date(savedPrescription.issue_date), "dd/MM/yyyy")}</p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={handleViewPrescription} variant="outline" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Receta
                </Button>
                <Button onClick={handlePrintPrescription} variant="outline" className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
              <Button onClick={handleNewPrescription} variant="secondary">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Receta
              </Button>
              <Button onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Default Form View
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Generar Receta Médica
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Info - Pre-filled */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Información del Paciente</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Paciente</Label>
                <p className="font-medium">{patientName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">DNI</Label>
                <p className="font-medium">{patientDni}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Historia Clínica</Label>
                <Badge variant="secondary" className="font-mono">{hms}</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha de Emisión</Label>
                <p className="font-medium">{format(new Date(), 'dd/MM/yyyy')}</p>
              </div>
            </div>
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Especialista</Label>
              <p className="font-medium">{specialistName}</p>
            </div>
          </div>

          {/* Add Medication Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Agregar Medicamento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Medicamento *</Label>
                <MedicationAutocomplete
                  value={currentMedication}
                  onChange={setCurrentMedication}
                  placeholder="Buscar medicamento..."
                />
              </div>

              <div>
                <Label>Dosis *</Label>
                <Input
                  value={currentDosis}
                  onChange={(e) => setCurrentDosis(e.target.value)}
                  placeholder="Ej: 1-2 gotas, 500mg"
                />
              </div>

              <div>
                <Label>Frecuencia *</Label>
                <Select value={currentFrecuencia} onValueChange={setCurrentFrecuencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map(freq => (
                      <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Duración del tratamiento *</Label>
                <Input
                  value={currentDuracion}
                  onChange={(e) => setCurrentDuracion(e.target.value)}
                  placeholder="Ej: 7 días, 30 días"
                />
              </div>

              <div>
                <Label>Vía de administración</Label>
                <Select value={currentVia} onValueChange={setCurrentVia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vía" />
                  </SelectTrigger>
                  <SelectContent>
                    {administrationRoutes.map(route => (
                      <SelectItem key={route} value={route}>{route}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Indicaciones adicionales</Label>
                <Textarea
                  value={currentIndicaciones}
                  onChange={(e) => setCurrentIndicaciones(e.target.value)}
                  placeholder="Instrucciones específicas para este medicamento..."
                  rows={2}
                />
              </div>
            </div>

            <Button type="button" onClick={handleAddMedication} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar a la receta
            </Button>
          </div>

          {/* Medications List */}
          {medications.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Medicamentos en la receta ({medications.length})</h3>
              <div className="space-y-2">
                {medications.map((item, index) => (
                  <div key={index} className="flex items-start justify-between bg-muted/50 p-3 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.medication.codigo} - {item.medication.descripcion}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.medication.presentation} | {item.dosis} | {item.frecuencia} | {item.duracion} | Vía: {item.viaAdministracion}
                      </div>
                      {item.indicaciones && (
                        <div className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">Indicaciones:</span> {item.indicaciones}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
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

          {/* Additional Patient Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20">
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
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs text-muted-foreground">Próxima Cita</Label>
              <Input
                value={fechaProximaRevision}
                onChange={(e) => setFechaProximaRevision(e.target.value)}
                placeholder="Ej: 15/02/2026"
              />
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-4">
            <div>
              <Label>Observaciones generales</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones o indicaciones generales para el paciente..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || medications.length === 0}>
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
