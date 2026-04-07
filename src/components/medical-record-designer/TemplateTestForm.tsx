 import React, { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
 import { Calendar } from '@/components/ui/calendar';
 import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
 import { format } from 'date-fns';
import { CalendarIcon, FileDown, RotateCcw, Table2, Activity, Eye, Focus, Scan } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { useToast } from '@/hooks/use-toast';
 import { useTemplatePDFGenerator } from './TemplatePDFGenerator';
import { MedicalMeasurementInput, detectMeasurementType } from './MedicalMeasurementInput';
import { detectSpecializedTable, groupFieldsByEye, type SpecializedTableType } from './specialized-tables/OphthalmologyTableDetector';
import { VisualAcuityTable } from './specialized-tables/VisualAcuityTable';
import { RefractionInputTable } from './specialized-tables/RefractionInputTable';
import { GenericOphthalmologyTable } from './specialized-tables/GenericOphthalmologyTable';
 import type { MedicalRecordTemplate, TemplateSection, TemplateField } from './MedicalRecordTemplateDesigner';
 
 interface TemplateTestFormProps {
   template: MedicalRecordTemplate;
   onClose: () => void;
 }
 
 export function TemplateTestForm({ template, onClose }: TemplateTestFormProps) {
   const { toast } = useToast();
   const { generatePDF } = useTemplatePDFGenerator();
   const [formData, setFormData] = useState<Record<string, any>>({});
 
   const handleFieldChange = (fieldId: string, value: any) => {
     setFormData(prev => ({
       ...prev,
       [fieldId]: value
     }));
   };
 
   const handleReset = () => {
     setFormData({});
     toast({
       title: "Formulario reiniciado",
       description: "Todos los campos han sido limpiados.",
     });
   };
 
   const handleGeneratePDF = () => {
     generatePDF(template);
   };
 
  // Detectar si es una tabla de exámenes preoperatorios
  const isPresurgicalTable = (section: TemplateSection): boolean => {
    const tableType = detectSpecializedTable(section);
    return tableType === 'presurgical';
  };

  // Detectar si es una tabla biomicroscópica
  const isBiomicroscopicTable = (section: TemplateSection): boolean => {
    const tableType = detectSpecializedTable(section);
    return tableType === 'biomicroscopic';
  };

  // Detectar si debemos ocultar el título de la tabla interna
  const shouldHideInternalTableTitle = (section: TemplateSection): boolean => {
    return isPresurgicalTable(section) || isBiomicroscopicTable(section);
  };

  // Detectar si es una sección de evaluación diagnóstica
  const isDiagnosticSection = (section: TemplateSection): boolean => {
    const title = section.title?.toLowerCase() || '';
    return title.includes('evaluación diagnóstica') || title.includes('evaluacion diagnostica') || title.includes('diagnostico');
  };

  // Detectar si una sección tiene campos OD/OI pareados
  const hasODOIFields = (section: TemplateSection): boolean => {
    const groups = groupFieldsByEye(section);
    return groups.some(g => g.odFieldId && g.oiFieldId);
  };

  // Obtener el esquema de color basado en el tipo de tabla
  const getColorScheme = (tableType: SpecializedTableType): 'blue' | 'purple' | 'green' | 'orange' | 'teal' => {
    switch (tableType) {
      case 'visual_acuity': return 'blue';
      case 'refraction': return 'purple';
      case 'keratometry': return 'orange';
      case 'iop': return 'green';
      case 'cct': return 'teal';
      case 'pupil_diameter': return 'blue';
      case 'biomicroscopic': return 'purple';
      default: return 'blue';
    }
  };

  // Obtener icono basado en el tipo de tabla
  const getTableIcon = (tableType: SpecializedTableType): React.ReactNode => {
    switch (tableType) {
      case 'visual_acuity': return <Eye className="h-5 w-5" />;
      case 'refraction': return <Focus className="h-5 w-5" />;
      case 'biomicroscopic': return <Scan className="h-5 w-5" />;
      case 'iop': return <Activity className="h-5 w-5" />;
      default: return <Table2 className="h-5 w-5" />;
    }
  };

  // Renderizar tabla especializada
  const renderSpecializedTable = (section: TemplateSection, tableType: SpecializedTableType) => {
    const hideTableTitle = shouldHideInternalTableTitle(section);
    const commonProps = {
      section,
      formData,
      onFieldChange: handleFieldChange,
    };

    switch (tableType) {
      case 'visual_acuity':
        return <VisualAcuityTable {...commonProps} />;
      case 'refraction':
        return <RefractionInputTable {...commonProps} />;
      default:
        return (
          <GenericOphthalmologyTable
            {...commonProps}
            colorScheme={getColorScheme(tableType)}
            icon={getTableIcon(tableType)}
            hideTitle={hideTableTitle}
          />
        );
    }
  };

   const renderField = (field: TemplateField) => {
     const value = formData[field.id] || '';
     
     // Field width from template config
     const fieldWidth = field.width || 200;
     const fieldStyle: React.CSSProperties = field.responsive !== false
       ? { minWidth: `${Math.min(fieldWidth, 300)}px`, flex: '1' }
       : { width: `${Math.min(fieldWidth, 400)}px` };
 
    // Check if this field should use a specialized measurement input
    const measurementType = detectMeasurementType(field.name);
    if (measurementType && (field.type === 'text_short' || field.type === 'text_medium')) {
      return (
        <MedicalMeasurementInput
          value={value}
          onChange={(val) => handleFieldChange(field.id, val)}
          measurementType={measurementType}
          placeholder={field.name}
          size="sm"
        />
      );
    }

     switch (field.type) {
       case 'text_short':
       case 'text_medium':
       case 'text_long':
         return (
           <Input
             value={value}
             onChange={(e) => handleFieldChange(field.id, e.target.value)}
             placeholder={`Ingrese ${field.name.toLowerCase()}`}
             style={fieldStyle}
           />
         );
 
       case 'text_multiline':
         return (
           <Textarea
             value={value}
             onChange={(e) => handleFieldChange(field.id, e.target.value)}
             placeholder={`Ingrese ${field.name.toLowerCase()}`}
              rows={4}
              className="w-full min-h-[100px] resize-y"
           />
         );
 
       case 'select':
         return (
           <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
             <SelectTrigger style={fieldStyle}>
               <SelectValue placeholder="Seleccione una opción" />
             </SelectTrigger>
             <SelectContent>
               {field.options?.map((option: string) => (
                 <SelectItem key={option} value={option}>
                   {option}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         );
 
       case 'yes_no':
         return (
           <RadioGroup value={value} onValueChange={(val) => handleFieldChange(field.id, val)} className="flex gap-4">
             <div className="flex items-center space-x-2">
               <RadioGroupItem value="Sí" id={`${field.id}-yes`} />
               <Label htmlFor={`${field.id}-yes`}>Sí</Label>
             </div>
             <div className="flex items-center space-x-2">
               <RadioGroupItem value="No" id={`${field.id}-no`} />
               <Label htmlFor={`${field.id}-no`}>No</Label>
             </div>
           </RadioGroup>
         );
 
       case 'date':
         return (
           <Popover>
             <PopoverTrigger asChild>
               <Button
                 variant="outline"
                 className={cn(
                   "justify-start text-left font-normal",
                   !value && "text-muted-foreground"
                 )}
                 style={fieldStyle}
               >
                 <CalendarIcon className="mr-2 h-4 w-4" />
                 {value ? format(new Date(value), "dd/MM/yyyy") : "Seleccionar fecha"}
               </Button>
             </PopoverTrigger>
             <PopoverContent className="w-auto p-0">
               <Calendar
                 mode="single"
                 selected={value ? new Date(value) : undefined}
                 onSelect={(date) => handleFieldChange(field.id, date?.toISOString().split('T')[0])}
                 initialFocus
                 className="p-3 pointer-events-auto"
               />
             </PopoverContent>
           </Popover>
         );
 
       case 'image_drawing':
         return (
           <div 
            className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 flex items-center justify-center bg-muted/30"
             style={{ ...fieldStyle, minHeight: '100px' }}
           >
            <span className="text-muted-foreground text-sm">Área de dibujo/imagen</span>
           </div>
         );
 
       case 'preoperatory_exam_table':
       case 'uniforms_preoperatory_exam_table':
         return (
           <div 
            className="border border-muted rounded-lg p-4 bg-muted/30"
             style={{ width: '100%' }}
           >
            <span className="text-muted-foreground text-sm">Tabla de exámenes preoperatorios (modo demostración)</span>
           </div>
         );
 
       default:
         return (
           <Input
             value={value}
             onChange={(e) => handleFieldChange(field.id, e.target.value)}
             placeholder={`Ingrese ${field.name.toLowerCase()}`}
             style={fieldStyle}
           />
         );
     }
   };
 
   const renderSection = (section: TemplateSection) => {
    const tableType = detectSpecializedTable(section);
    const hasODOI = hasODOIFields(section);

    // Si es una tabla especializada o tiene campos OD/OI, usar layout de tabla
    if (tableType || hasODOI) {
      return (
        <Card key={section.id} className="mb-4 overflow-hidden border-2 border-primary/10">
          <CardHeader className="py-3 bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary">
                {tableType ? getTableIcon(tableType) : <Table2 className="h-4 w-4" />}
              </span>
              <span className="text-primary">{section.roman_numeral}.</span>
              {section.title}
              <span className="ml-auto text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                Tabla OD/OI
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            {tableType ? (
              renderSpecializedTable(section, tableType)
            ) : (
              <GenericOphthalmologyTable
                section={section}
                formData={formData}
                onFieldChange={handleFieldChange}
              />
            )}
          </CardContent>
        </Card>
      );
    }

    // Renderizado estándar para secciones sin OD/OI
    if (isDiagnosticSection(section)) {
      return (
        <Card key={section.id} className="mb-4">
          <CardHeader className="py-3 bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="text-primary">{section.roman_numeral}.</span>
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 space-y-5">
            {section.fields?.map((field) => (
              <div key={field.id} className="flex flex-col gap-2 w-full">
                <Label className="text-sm font-semibold text-foreground">
                  {field.name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Textarea
                  value={formData[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={`Ingrese ${field.name.toLowerCase()}`}
                  rows={4}
                  className="w-full resize-y min-h-[100px]"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      );
    }

     return (
       <Card key={section.id} className="mb-4">
         <CardHeader className="py-3 bg-gradient-to-r from-primary/10 to-secondary/10">
           <CardTitle className="text-base font-semibold flex items-center gap-2">
             <span className="text-primary">{section.roman_numeral}.</span>
             {section.title}
           </CardTitle>
         </CardHeader>
         <CardContent className="py-4">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                {section.fields?.filter(f => f.type !== 'text_multiline').map((field) => (
                  <div key={field.id} className="flex flex-col gap-1.5">
                    <Label className="text-sm font-medium">
                      {field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
              {section.fields?.filter(f => f.type === 'text_multiline').map((field) => (
                <div key={field.id} className="flex flex-col gap-2 w-full">
                  <Label className="text-sm font-semibold text-foreground">
                    {field.name}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {renderField(field)}
                </div>
              ))}
           </div>
         </CardContent>
       </Card>
     );
   };
 
   return (
     <div className="space-y-4">
       {/* Toolbar */}
       <div className="flex justify-between items-center pb-4 border-b">
         <div className="text-sm text-muted-foreground">
           Complete los campos para probar la plantilla. Los datos no se guardarán.
         </div>
         <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={handleReset}>
             <RotateCcw className="h-4 w-4 mr-1" />
             Reiniciar
           </Button>
           <Button 
             variant="outline" 
             size="sm" 
             onClick={handleGeneratePDF}
             className="bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 text-green-700"
           >
             <FileDown className="h-4 w-4 mr-1" />
             Generar PDF
           </Button>
           <Button variant="default" size="sm" onClick={onClose}>
             Cerrar
           </Button>
         </div>
       </div>
 
       {/* Header Preview */}
       <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 rounded-lg border">
         <div className="flex items-center gap-4">
           {template.header_config?.logo_url && (
             <img 
               src={template.header_config.logo_url} 
               alt="Logo" 
               className="h-12 w-auto object-contain"
             />
           )}
           <div>
             <h3 className="font-bold text-lg">{template.header_config?.title || template.name}</h3>
             <p className="text-sm text-muted-foreground">
               Número de registro: {template.header_config?.record_number_prefix || 'HC'}-{'0'.repeat((template.header_config?.record_number_zeros || 6) - 4)}0001
             </p>
           </div>
         </div>
       </div>
 
       {/* Form Sections */}
       <div className="max-h-[50vh] overflow-y-auto pr-2">
         {template.body_config?.map((section) => renderSection(section))}
         
         {(!template.body_config || template.body_config.length === 0) && (
           <div className="text-center py-8 text-muted-foreground">
             Esta plantilla no tiene secciones configuradas.
           </div>
         )}
       </div>
 
       {/* Footer Preview */}
       {(template.footer_config?.text || template.footer_config?.signature_url) && (
        <div className="bg-muted/50 p-4 rounded-lg border-t mt-4">
           {template.footer_config?.signature_url && (
             <div className="flex justify-end mb-2">
               <img 
                 src={template.footer_config.signature_url} 
                 alt="Firma" 
                 className="h-16 w-auto"
               />
             </div>
           )}
           {template.footer_config?.text && (
            <p className="text-sm text-muted-foreground text-center">{template.footer_config.text}</p>
           )}
         </div>
       )}
     </div>
   );
 }