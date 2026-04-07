import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface VisualNeedsCheckboxesProps {
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  section: any;
}

export function VisualNeedsCheckboxes({ formData, onFieldChange, section }: VisualNeedsCheckboxesProps) {

  // Buscar los campos específicos de necesidad visual
  const visualNeedsFields = section.fields?.filter((field: any) => 
    field.name.toLowerCase().includes('lejos') ||
    field.name.toLowerCase().includes('cerca') ||
    (field.name.toLowerCase().includes('lejos') && field.name.toLowerCase().includes('cerca'))
  ) || [];

  // Buscar otros campos que no son de necesidad visual para renderizarlos normalmente
  const otherFields = section.fields?.filter((field: any) => 
    !field.name.toLowerCase().includes('lejos') &&
    !field.name.toLowerCase().includes('cerca')
  ) || [];

  const renderOtherField = (field: any) => {
    const value = formData[field.id] || '';
    const fieldWidth = field.width || 200;
    const fieldStyle: React.CSSProperties = field.responsive 
      ? { minWidth: `${fieldWidth}px`, flex: '1' }
      : { width: `${fieldWidth}px` };

    if (field.type === 'text_short' || field.type === 'text_medium' || field.type === 'text_long') {
      return (
        <div key={field.id} className="space-y-2">
          <Label>{field.name}</Label>
          <input
            type="text"
            value={value}
            onChange={(e) => onFieldChange(field.id, e.target.value)}
            placeholder={`Ingrese ${field.name.toLowerCase()}`}
            className="w-full px-3 py-2 border border-input rounded-md"
            style={fieldStyle}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">{section.title}</h3>
        
        {/* Checkboxes para necesidad visual */}
        {visualNeedsFields.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-md font-medium text-muted-foreground">Necesidad Visual del Paciente</h4>
            <div className="flex flex-wrap gap-6">
              {visualNeedsFields.map((field: any) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={formData[field.id] || false}
                    onCheckedChange={(checked: boolean) => onFieldChange(field.id, checked)}
                  />
                  <Label htmlFor={field.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {field.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Otros campos de la sección */}
        {otherFields.length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherFields.map(renderOtherField)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}