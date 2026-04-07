
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  dni: string;
}

interface MedicalRecord {
  id: string;
  visit_date: string;
  status: string;
  record_number: string;
  hms?: string;
  created_at: string;
  form_data: any;
  medical_record_templates: {
    name: string;
    header_config: any;
    body_config: any[];
    footer_config: any;
  };
}

interface TemplateBasedMedicalRecordViewerProps {
  patient: Patient;
  record: MedicalRecord;
  onEdit: (recordId: string) => void;
  onBack: () => void;
}

export function TemplateBasedMedicalRecordViewer({ 
  patient, 
  record, 
  onEdit, 
  onBack 
}: TemplateBasedMedicalRecordViewerProps) {
  const renderFieldValue = (field: any, value: any) => {
    if (!value) return <span className="text-gray-400">No especificado</span>;

    switch (field.type) {
      case 'image_drawing':
        return (
          <div className="mt-2">
            <img 
              src={value} 
              alt={field.name} 
              className="max-w-full max-h-64 object-contain border rounded"
            />
          </div>
        );
      
      case 'text_multiline':
        return (
          <div className="mt-2 p-3 bg-gray-50 rounded whitespace-pre-wrap">
            {value}
          </div>
        );
      
      default:
        return <span className="font-medium">{value}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Historia Clínica</h1>
          <p className="text-gray-600">
            {patient.first_name} {patient.last_name} - {record.hms || record.record_number}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button onClick={() => onEdit(record.id)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-8">
          {/* Encabezado */}
          <div className="mb-8 border-b pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {record.medical_record_templates?.header_config?.logo_url && (
                  <div className="w-16 h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center overflow-hidden">
                    <img 
                      src={record.medical_record_templates.header_config.logo_url} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">
                    {record.medical_record_templates?.header_config?.title || 'HISTORIA CLÍNICA'}
                  </h1>
                  <p className="text-lg font-semibold text-gray-700">
                    {record.medical_record_templates?.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Nro de Historia Clínica:</div>
                <div className="font-mono text-lg font-semibold">
                  {record.hms || record.record_number}
                </div>
                <Badge className="mt-2" variant={
                  record.status === 'Completada' ? 'default' :
                  record.status === 'En Progreso' ? 'secondary' : 'outline'
                }>
                  {record.status}
                </Badge>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Paciente:</span> {patient.first_name} {patient.last_name}
              </div>
              <div>
                <span className="font-medium">DNI:</span> {patient.dni}
              </div>
              <div>
                <span className="font-medium">Fecha de Visita:</span> {format(new Date(record.visit_date), 'dd/MM/yyyy')}
              </div>
              <div>
                <span className="font-medium">Fecha de Creación:</span> {format(new Date(record.created_at), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
          </div>

          {/* Cuerpo */}
          <div className="space-y-8">
            {record.medical_record_templates?.body_config?.map((section: any) => (
              <div key={section.id}>
                <h2 className="text-lg font-semibold mb-4 border-b pb-2">
                  {section.roman_numeral}. {section.title}
                </h2>
                <div className="space-y-4">
                  {(() => {
                    const fields = section.fields || [];
                    const rows: any[][] = [];
                    let currentRow: any[] = [];
                    let currentRowWidth = 0;
                    const containerWidth = 800; // Ancho aproximado del contenedor

                    fields.forEach((field: any) => {
                      const fieldWidth = field.width || 200;
                      const isResponsive = field.responsive !== false;

                      if (!isResponsive) {
                        // Campo no responsivo: ocupa toda la fila
                        if (currentRow.length > 0) {
                          rows.push([...currentRow]);
                          currentRow = [];
                          currentRowWidth = 0;
                        }
                        rows.push([field]);
                      } else {
                        // Campo responsivo: puede compartir fila
                        if (currentRowWidth + fieldWidth > containerWidth && currentRow.length > 0) {
                          rows.push([...currentRow]);
                          currentRow = [field];
                          currentRowWidth = fieldWidth;
                        } else {
                          currentRow.push(field);
                          currentRowWidth += fieldWidth;
                        }
                      }
                    });

                    if (currentRow.length > 0) {
                      rows.push(currentRow);
                    }

                    return rows.map((row, rowIndex) => (
                      <div 
                        key={rowIndex} 
                        className="flex flex-wrap gap-4"
                        style={{ 
                          justifyContent: row.length === 1 && !row[0].responsive ? 'flex-start' : 'flex-start',
                          alignItems: 'flex-start'
                        }}
                      >
                        {row.map((field: any) => {
                          const fieldWidth = field.width || 200;
                          const fieldStyle: React.CSSProperties = field.responsive 
                            ? { minWidth: `${fieldWidth}px`, flex: '1' }
                            : { width: `${fieldWidth}px` };

                          return (
                            <div 
                              key={field.id}
                              className="space-y-1"
                              style={{
                                display: field.responsive === false ? 'block' : 'inline-block',
                                width: field.responsive === false ? '100%' : 'auto',
                                ...fieldStyle
                              }}
                            >
                              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                {field.name}
                                {field.required && <span className="text-red-500">*</span>}
                              </label>
                              {renderFieldValue(field, record.form_data?.[field.id])}
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ))}
          </div>

          {/* Pie */}
          {(record.medical_record_templates?.footer_config?.signature_url || 
            record.medical_record_templates?.footer_config?.text) && (
            <div className="mt-12 pt-8 border-t">
              <div className="flex flex-col items-center space-y-4">
                {record.medical_record_templates.footer_config.signature_url && (
                  <div className="w-48 h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center overflow-hidden">
                    <img 
                      src={record.medical_record_templates.footer_config.signature_url} 
                      alt="Firma" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                {record.medical_record_templates.footer_config.text && (
                  <p className="text-center text-sm font-medium">
                    {record.medical_record_templates.footer_config.text}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
