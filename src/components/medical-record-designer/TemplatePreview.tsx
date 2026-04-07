
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, ImageIcon } from 'lucide-react';
import { TemplateBasedMedicalRecordViewer } from '@/components/medical-records/TemplateBasedMedicalRecordViewer';
import type { MedicalRecordTemplate } from './MedicalRecordTemplateDesigner';

interface TemplatePreviewProps {
  template: MedicalRecordTemplate;
  onEdit: () => void;
}

export function TemplatePreview({ template, onEdit }: TemplatePreviewProps) {
  // Crear datos simulados para mostrar el template como si fuera una historia clínica real
  const mockPatient = {
    id: 'mock-patient-id',
    patient_code: 'PAC-001234',
    first_name: 'Juan Carlos',
    last_name: 'Pérez García',
    dni: '12345678'
  };

  const mockRecord = {
    id: 'mock-record-id',
    visit_date: new Date().toISOString().split('T')[0],
    status: 'En Progreso',
    record_number: `${template.header_config.record_number_prefix || 'HC'}-${'0'.repeat((template.header_config.record_number_zeros || 6) - 3)}001`,
    created_at: new Date().toISOString(),
    form_data: {}, // Datos vacíos para mostrar el template
    medical_record_templates: {
      name: template.name,
      header_config: template.header_config,
      body_config: template.body_config,
      footer_config: template.footer_config
    }
  };

  const handleMockEdit = () => {
    // No hacer nada en la vista previa
  };

  const handleMockBack = () => {
    // No hacer nada en la vista previa
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Vista Previa: {template.name}</h2>
        <Button onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 mb-4">
          Esta es una vista previa de cómo se verá la historia clínica usando el mismo componente que se utiliza en la sección de Historias Clínicas.
        </p>
        
        {/* Usar el mismo componente que se usa en /medical-records */}
        <TemplateBasedMedicalRecordViewer
          patient={mockPatient}
          record={mockRecord}
          onEdit={handleMockEdit}
          onBack={handleMockBack}
        />
      </div>
    </div>
  );
}
