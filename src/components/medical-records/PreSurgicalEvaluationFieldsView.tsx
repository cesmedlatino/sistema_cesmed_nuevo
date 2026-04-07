import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PreSurgicalEvaluationFieldsViewProps {
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  section: any;
}

export function PreSurgicalEvaluationFieldsView({ 
  formData, 
  onFieldChange, 
  section 
}: PreSurgicalEvaluationFieldsViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {section?.fields?.map((field: any) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.id} className="text-sm font-medium">
            {field.name}
          </Label>
          <Input
            id={field.id}
            value={formData[field.id] || ''}
            onChange={(e) => onFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || ''}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
}