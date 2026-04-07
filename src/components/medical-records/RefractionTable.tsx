import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RefractionTableProps {
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  section: any;
}

export function RefractionTable({ formData, onFieldChange, section }: RefractionTableProps) {
  // Buscar los campos específicos de refracción
  const refractionFields = section.fields?.filter((field: any) => 
    field.name.toLowerCase().includes('refracción av sc od') ||
    field.name.toLowerCase().includes('refracción av sc oi') ||
    field.name.toLowerCase().includes('refracción av cc od') ||
    field.name.toLowerCase().includes('refracción av cc oi')
  ) || [];

  // Buscar otros campos que no son de refracción para renderizarlos normalmente
  const otherFields = section.fields?.filter((field: any) => 
    !field.name.toLowerCase().includes('refracción av sc od') &&
    !field.name.toLowerCase().includes('refracción av sc oi') &&
    !field.name.toLowerCase().includes('refracción av cc od') &&
    !field.name.toLowerCase().includes('refracción av cc oi')
  ) || [];

  // Organizar los campos de refracción por tipo y ojo
  const getRefractionField = (type: string, eye: string) => {
    return refractionFields.find((field: any) => 
      field.name.toLowerCase().includes(type.toLowerCase()) &&
      field.name.toLowerCase().includes(eye.toLowerCase())
    );
  };

  const scOdField = getRefractionField('av sc', 'od');
  const scOiField = getRefractionField('av sc', 'oi');
  const ccOdField = getRefractionField('av cc', 'od');
  const ccOiField = getRefractionField('av cc', 'oi');

  const renderInput = (field: any) => {
    if (!field) return <TableCell className="text-center text-muted-foreground">-</TableCell>;
    
    return (
      <TableCell>
        <Input
          value={formData[field.id] || ''}
          onChange={(e) => onFieldChange(field.id, e.target.value)}
          placeholder="Ingrese valor"
          className="text-center"
        />
      </TableCell>
    );
  };

  const renderOtherField = (field: any) => {
    const value = formData[field.id] || '';
    const fieldWidth = field.width || 200;
    const fieldStyle: React.CSSProperties = field.responsive 
      ? { minWidth: `${fieldWidth}px`, flex: '1' }
      : { width: `${fieldWidth}px` };

    return (
      <div key={field.id} className="space-y-2">
        <Label className="flex items-center gap-1">
          {field.name}
          {field.required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          value={value}
          onChange={(e) => onFieldChange(field.id, e.target.value)}
          placeholder={`Ingrese ${field.name.toLowerCase()}`}
          style={fieldStyle}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <CardHeader>
        <CardTitle className="text-lg">
          {section.roman_numeral}. {section.title}
        </CardTitle>
      </CardHeader>

      {/* Tabla de Refracción */}
      {refractionFields.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold">Refracción</h4>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center font-semibold">Tipo de Refracción</TableHead>
                  <TableHead className="text-center font-semibold">OD (Ojo Derecho)</TableHead>
                  <TableHead className="text-center font-semibold">OI (Ojo Izquierdo)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">AV SC (Agudeza Visual Sin Corrección)</TableCell>
                  {renderInput(scOdField)}
                  {renderInput(scOiField)}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">AV CC (Agudeza Visual Con Corrección)</TableCell>
                  {renderInput(ccOdField)}
                  {renderInput(ccOiField)}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Otros campos de la sección */}
      {otherFields.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherFields.map(renderOtherField)}
          </div>
        </div>
      )}
    </div>
  );
}