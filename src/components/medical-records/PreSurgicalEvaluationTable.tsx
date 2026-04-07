import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table2, List } from 'lucide-react';
import { PreSurgicalEvaluationFieldsView } from './PreSurgicalEvaluationFieldsView';
import { PreSurgicalEvaluationTableView } from './PreSurgicalEvaluationTableView';
import { useFieldMapping } from './hooks/useFieldMapping';

interface PreSurgicalEvaluationTableProps {
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  section: any;
}

export function PreSurgicalEvaluationTable({ formData, onFieldChange, section }: PreSurgicalEvaluationTableProps) {
  const [isTableView, setIsTableView] = useState(true);
  const fieldMapping = useFieldMapping(section);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">III. EXÁMENES PREOPERATORIOS</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsTableView(!isTableView)}
          className="flex items-center gap-2"
        >
          {isTableView ? (
            <>
              <List className="h-4 w-4" />
              Vista Campos
            </>
          ) : (
            <>
              <Table2 className="h-4 w-4" />
              Vista Tabla
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {isTableView ? (
          <PreSurgicalEvaluationTableView 
            formData={formData}
            onFieldChange={onFieldChange}
            fieldMapping={fieldMapping}
          />
        ) : (
          <PreSurgicalEvaluationFieldsView 
            formData={formData}
            onFieldChange={onFieldChange}
            section={section}
          />
        )}
      </div>
    </div>
  );
}