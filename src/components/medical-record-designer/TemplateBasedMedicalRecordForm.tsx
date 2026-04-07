import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PreOperatoryExamTable } from './PreOperatoryExamTable';
import { UniformsPreOperatoryTable } from './UniformsPreOperatoryTable';
import type { MedicalRecordTemplate, TemplateField } from './MedicalRecordTemplateDesigner';

interface TemplateBasedMedicalRecordFormProps {
  template: MedicalRecordTemplate;
  onFieldChange: (fieldId: string, value: any) => void;
  formData: Record<string, any>;
}

export function TemplateBasedMedicalRecordForm({ 
  template, 
  onFieldChange, 
  formData 
}: TemplateBasedMedicalRecordFormProps) {
  
  const renderField = (field: TemplateField) => {
    switch (field.type) {
      case 'preoperatory_exam_table':
        return (
          <div key={field.id} className="w-full">
            <PreOperatoryExamTable
              onDataChange={(data) => {
                // Actualizar cada campo individual del formulario para HC CiruRef
                Object.entries(data).forEach(([key, value]) => {
                  onFieldChange(`${field.id}_${key}`, value);
                });
              }}
              initialData={
                // Extraer los datos existentes para esta tabla
                Object.keys(formData)
                  .filter(key => key.startsWith(`${field.id}_`))
                  .reduce((acc, key) => {
                    const cleanKey = key.replace(`${field.id}_`, '');
                    acc[cleanKey] = formData[key];
                    return acc;
                  }, {} as Record<string, any>)
              }
            />
          </div>
        );
      case 'uniforms_preoperatory_exam_table':
        return (
          <div key={field.id} className="w-full">
            <UniformsPreOperatoryTable
              onDataChange={(data) => {
                // Actualizar cada campo individual del formulario usando Uniforms
                Object.entries(data).forEach(([key, value]) => {
                  onFieldChange(`${field.id}_${key}`, value);
                });
              }}
              initialData={
                // Extraer los datos existentes para esta tabla Uniforms
                Object.keys(formData)
                  .filter(key => key.startsWith(`${field.id}_`))
                  .reduce((acc, key) => {
                    const cleanKey = key.replace(`${field.id}_`, '');
                    acc[cleanKey] = formData[key];
                    return acc;
                  }, {} as Record<string, any>)
              }
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-6">
            {template.header_config.logo_url && (
              <img 
                src={template.header_config.logo_url} 
                alt="Logo" 
                className="h-20 w-20 object-contain"
              />
            )}
            <div className="flex-1">
              <CardTitle className="text-2xl">
                {template.header_config.title || 'HISTORIA CLÍNICA'}
              </CardTitle>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Nro de Historia Clínica:</div>
              <div className="font-mono text-lg font-semibold">
                {template.header_config.record_number_prefix || 'HC'}-
                {'0'.repeat(template.header_config.record_number_zeros || 6)}1
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Body Sections */}
      {template.body_config.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>
              {section.roman_numeral}. {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.id}>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Footer */}
      {(template.footer_config.signature_url || template.footer_config.text) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              {template.footer_config.signature_url && (
                <img 
                  src={template.footer_config.signature_url} 
                  alt="Firma" 
                  className="h-16 object-contain"
                />
              )}
              {template.footer_config.text && (
                <p className="text-center text-sm font-medium">
                  {template.footer_config.text}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}