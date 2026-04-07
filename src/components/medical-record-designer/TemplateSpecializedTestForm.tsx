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
 import { CalendarIcon, FileDown, RotateCcw, Table2 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { useToast } from '@/hooks/use-toast';
 import { useTemplatePDFGenerator } from './TemplatePDFGenerator';
 import { BiomicroscopicExamTable } from '../medical-records/BiomicroscopicExamTable';
 import { RefractionTable } from '../medical-records/RefractionTable';
 import { PreSurgicalEvaluationTable } from '../medical-records/PreSurgicalEvaluationTable';
 import { KeratometryTable } from '../medical-records/KeratometryTable';
 import { ScotopicPupilDiameterTable } from '../medical-records/ScotopicPupilDiameterTable';
 import { KappaAngleTable } from '../medical-records/KappaAngleTable';
 import { CCTTable } from '../medical-records/CCTTable';
 import { Z40Table } from '../medical-records/Z40Table';
 import { WWTable } from '../medical-records/WWTable';
 import { VacuumRingML7Table } from '../medical-records/VacuumRingML7Table';
 import { FinalRefractionCorrectionTable } from '../medical-records/FinalRefractionCorrectionTable';
 import { CorrectionMethodsTable } from '../medical-records/CorrectionMethodsTable';
 import { PrescriptionLensesTable } from '../medical-records/PrescriptionLensesTable';
 import type { MedicalRecordTemplate, TemplateSection, TemplateField } from './MedicalRecordTemplateDesigner';
 
 interface TemplateSpecializedTestFormProps {
   template: MedicalRecordTemplate;
   onClose: () => void;
 }
 
 // Detect if a section should use a specialized table
 function detectSpecializedTable(section: TemplateSection): string | null {
   const title = section.title?.toLowerCase() || '';
   const sectionId = section.id || '';
   
   // Biomicroscopic exam
   if (sectionId === '4416ab77-a41a-49db-9736-c69a570c39d7' || 
       title.includes('examen biomicroscópico') ||
       title.includes('biomicroscópico')) {
     return 'biomicroscopic';
   }
   
   // Keratometry
   if (title.includes('queratometría') || 
       section.roman_numeral === 'III') {
     return 'keratometry';
   }
   
   // Pre-surgical evaluation
   if (title.includes('exámenes preoperatorios') ||
       title.includes('evaluación prequirúrgica')) {
     return 'presurgical';
   }
   
   // Scotopic pupil diameter
   if (title.includes('diámetro pupilar') ||
       title.includes('pupila escotópica')) {
     return 'scotopic';
   }
   
   // Kappa angle
   if (title.includes('ángulo kappa') ||
       title.includes('angulo kappa')) {
     return 'kappa';
   }
   
   // CCT
   if (title.includes('cct') || title.includes('paquimetría')) {
     return 'cct';
   }
   
   // Z40
   if (title.includes('z 4.0') || title.includes('z40') || title.includes('z4.0')) {
     return 'z40';
   }
   
   // WW
   if (title.includes('w-w') || title.includes('ww') || title.includes('white to white')) {
     return 'ww';
   }
   
   // Vacuum ring
   if (title.includes('anillo de vacío') || title.includes('vacuum ring')) {
     return 'vacuumring';
   }
   
   // Final refraction correction
   if (title.includes('refracción final') || title.includes('corrección final')) {
     return 'finalrefraction';
   }
   
   // Correction methods
   if (title.includes('método de corrección') || title.includes('métodos de corrección')) {
     return 'correctionmethods';
   }
   
   // Prescription lenses
   if (title.includes('lentes') && (title.includes('prescripción') || title.includes('receta'))) {
     return 'prescriptionlenses';
   }
   
   // Check for refraction fields in section
   const hasRefractionFields = section.fields?.some((field: any) => 
     field.name?.toLowerCase().includes('refracción av sc') ||
     field.name?.toLowerCase().includes('refracción av cc')
   );
   if (hasRefractionFields) {
     return 'refraction';
   }
   
   return null;
 }
 
 export function TemplateSpecializedTestForm({ template, onClose }: TemplateSpecializedTestFormProps) {
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
 
   const renderStandardField = (field: TemplateField) => {
     const value = formData[field.id] || '';
     const fieldWidth = field.width || 200;
     const fieldStyle: React.CSSProperties = field.responsive !== false
       ? { minWidth: `${Math.min(fieldWidth, 300)}px`, flex: '1' }
       : { width: `${Math.min(fieldWidth, 400)}px` };
 
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
             rows={3}
             style={fieldStyle}
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
 
   const renderSpecializedTable = (section: TemplateSection, tableType: string) => {
     const commonProps = {
       formData,
       onFieldChange: handleFieldChange,
       section
     };
 
     switch (tableType) {
       case 'biomicroscopic':
         return <BiomicroscopicExamTable {...commonProps} />;
       case 'refraction':
         return <RefractionTable {...commonProps} />;
       case 'presurgical':
         return <PreSurgicalEvaluationTable {...commonProps} />;
       case 'keratometry':
         return <KeratometryTable {...commonProps} />;
       case 'scotopic':
         return <ScotopicPupilDiameterTable {...commonProps} />;
       case 'kappa':
         return <KappaAngleTable {...commonProps} />;
       case 'cct':
         return <CCTTable {...commonProps} />;
       case 'z40':
         return <Z40Table {...commonProps} />;
       case 'ww':
         return <WWTable {...commonProps} />;
       case 'vacuumring':
         return <VacuumRingML7Table {...commonProps} />;
       case 'finalrefraction':
         return <FinalRefractionCorrectionTable {...commonProps} />;
       case 'correctionmethods':
         return <CorrectionMethodsTable {...commonProps} />;
       case 'prescriptionlenses':
         return <PrescriptionLensesTable {...commonProps} />;
       default:
         return null;
     }
   };
 
   const renderSection = (section: TemplateSection) => {
     const specializedTable = detectSpecializedTable(section);
     
     if (specializedTable) {
       return (
         <Card key={section.id} className="mb-4 border-2 border-primary/20">
           <CardHeader className="py-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
             <CardTitle className="text-base font-semibold flex items-center gap-2">
               <Table2 className="h-4 w-4 text-primary" />
               <span className="text-primary">{section.roman_numeral}.</span>
               {section.title}
               <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                 Tabla Especializada
               </span>
             </CardTitle>
           </CardHeader>
           <CardContent className="py-4">
             {renderSpecializedTable(section, specializedTable)}
           </CardContent>
         </Card>
       );
     }
 
     // Standard section rendering
     return (
       <Card key={section.id} className="mb-4">
         <CardHeader className="py-3 bg-gradient-to-r from-primary/10 to-secondary/10">
           <CardTitle className="text-base font-semibold flex items-center gap-2">
             <span className="text-primary">{section.roman_numeral}.</span>
             {section.title}
           </CardTitle>
         </CardHeader>
         <CardContent className="py-4">
           <div className="flex flex-wrap gap-4">
             {section.fields?.map((field) => (
               <div key={field.id} className="flex flex-col gap-1">
                 <Label className="text-sm font-medium">
                   {field.name}
                   {field.required && <span className="text-red-500 ml-1">*</span>}
                 </Label>
                 {renderStandardField(field)}
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
         <div className="flex items-center gap-2">
           <Table2 className="h-5 w-5 text-primary" />
           <div className="text-sm text-muted-foreground">
             <span className="font-medium text-foreground">Modo Especializado:</span> Tablas oftalmológicas con controles OD/OI
           </div>
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