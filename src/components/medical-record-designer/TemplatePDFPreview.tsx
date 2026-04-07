import React, { useRef, useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Label } from '@/components/ui/label';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { FileDown, Loader2, Eye, Table2, Activity } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { jsPDF } from 'jspdf';
 import html2canvas from 'html2canvas';
 import { useToast } from '@/hooks/use-toast';
 import { detectSpecializedTable, groupFieldsByEye, type SpecializedTableType } from './specialized-tables/OphthalmologyTableDetector';
import type { MedicalRecordTemplate, TemplateSection } from './MedicalRecordTemplateDesigner';
 
 interface TemplatePDFPreviewProps {
   template: MedicalRecordTemplate;
   onClose: () => void;
 }
 
 export function TemplatePDFPreview({ template, onClose }: TemplatePDFPreviewProps) {
   const { toast } = useToast();
   const printRef = useRef<HTMLDivElement>(null);
   const [isGenerating, setIsGenerating] = useState(false);
 
   // Detectar si es una sección de evaluación diagnóstica
   const isDiagnosticSection = (section: TemplateSection): boolean => {
     const title = section.title?.toLowerCase() || '';
     return title.includes('evaluación diagnóstica') || title.includes('evaluacion diagnostica') || title.includes('diagnostico');
   };
 
   // Detectar si debemos ocultar el título de la tabla interna
   const shouldHideInternalTableTitle = (section: TemplateSection): boolean => {
     const tableType = detectSpecializedTable(section);
     return tableType === 'presurgical' || tableType === 'biomicroscopic';
   };
 
   // Detectar si tiene campos OD/OI
   const hasODOIFields = (section: TemplateSection): boolean => {
     const groups = groupFieldsByEye(section);
     return groups.some(g => g.odFieldId && g.oiFieldId);
   };
 
   const generatePDF = async () => {
     if (!printRef.current) return;
 
     setIsGenerating(true);
     try {
       toast({
         title: "Generando PDF...",
         description: "Por favor espere mientras se procesa el documento.",
       });
 
       const element = printRef.current;
       const canvas = await html2canvas(element, {
         scale: 2,
         useCORS: true,
         allowTaint: true,
         backgroundColor: '#ffffff',
         logging: false,
       });
 
       const imgData = canvas.toDataURL('image/png');
       const imgWidth = 210;
       const pageHeight = 297;
       const imgHeight = (canvas.height * imgWidth) / canvas.width;
       
       const doc = new jsPDF({
         orientation: 'portrait',
         unit: 'mm',
         format: 'a4'
       });
 
       let heightLeft = imgHeight;
       let position = 0;
 
       doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
       heightLeft -= pageHeight;
 
       while (heightLeft > 0) {
         position = heightLeft - imgHeight;
         doc.addPage();
         doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
         heightLeft -= pageHeight;
       }
 
       const fileName = `plantilla_${template.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
       doc.save(fileName);
 
       toast({
         title: "PDF Generado",
         description: `Se ha descargado el archivo ${fileName}`,
       });
     } catch (error) {
       console.error('Error generating PDF:', error);
       toast({
         title: "Error",
         description: "No se pudo generar el PDF",
         variant: "destructive",
       });
     } finally {
       setIsGenerating(false);
     }
   };
 
   const renderODOITable = (section: TemplateSection, tableType: SpecializedTableType | null) => {
     const groups = groupFieldsByEye(section);
     const hideTitle = shouldHideInternalTableTitle(section);
 
    // Encontrar el índice de "Queratometría" para dividir la tabla
    const splitIndex = groups.findIndex(g => 
      g.label.toLowerCase().includes('queratometria') || 
      g.label.toLowerCase().includes('queratometría')
    );

    // Si encontramos el punto de división, crear dos tablas
    const shouldSplit = splitIndex > 0 && splitIndex < groups.length;
    const firstTableGroups = shouldSplit ? groups.slice(0, splitIndex) : groups;
    const secondTableGroups = shouldSplit ? groups.slice(splitIndex) : [];

    const renderTableSection = (tableGroups: typeof groups, startIndex: number = 0) => (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-primary/5 to-primary/10">
              <TableHead className="font-semibold text-xs w-[35%]">Parámetro</TableHead>
              <TableHead className="text-center font-semibold text-xs">
                <div className="flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>OD</span>
                </div>
              </TableHead>
              <TableHead className="text-center font-semibold text-xs">
                <div className="flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>OI</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableGroups.map((group, index) => (
              <TableRow key={startIndex + index} className={cn(index % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                <TableCell className="py-2 text-xs">
                  <span className="font-medium">{group.label}</span>
                  {group.unit && <span className="text-primary/70 ml-1 text-[10px]">[{group.unit}]</span>}
                </TableCell>
                <TableCell className="py-2 text-center text-xs text-muted-foreground">—</TableCell>
                <TableCell className="py-2 text-center text-xs text-muted-foreground">—</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );

     return (
       <div className="space-y-2">
         {!hideTitle && (
           <div className="flex items-center gap-2">
             <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
               {tableType === 'biomicroscopic' ? <Eye className="h-4 w-4" /> : 
                tableType === 'presurgical' ? <Activity className="h-4 w-4" /> : 
                <Table2 className="h-4 w-4" />}
             </div>
             <span className="font-medium text-sm">{section.title}</span>
           </div>
         )}
        
        {/* Primera tabla */}
        {renderTableSection(firstTableGroups, 0)}
        
        {/* Separador y segunda tabla si hay división */}
        {shouldSplit && secondTableGroups.length > 0 && (
          <>
            {/* Salto de página - espacio para A4 */}
            <div 
              style={{ 
                pageBreakBefore: 'always',
                breakBefore: 'page',
                marginTop: '120px',
                marginBottom: '40px'
              }}
            />
            {renderTableSection(secondTableGroups, splitIndex)}
          </>
        )}
       </div>
     );
   };
 
   const renderDiagnosticSection = (section: TemplateSection) => {
     return (
       <div className="space-y-3">
         {section.fields?.map((field) => (
           <div key={field.id} className="space-y-1.5">
             <Label className="text-xs font-semibold">{field.name}</Label>
             <div className="border rounded-md p-3 min-h-[60px] bg-muted/30 text-xs text-muted-foreground">
               Ingrese {field.name.toLowerCase()}
             </div>
           </div>
         ))}
       </div>
     );
   };
 
   const renderStandardSection = (section: TemplateSection) => {
     const regularFields = section.fields?.filter(f => f.type !== 'text_multiline') || [];
     const textareaFields = section.fields?.filter(f => f.type === 'text_multiline') || [];
 
     return (
       <div className="space-y-3">
         {regularFields.length > 0 && (
           <div className="flex flex-wrap gap-3">
             {regularFields.map((field) => (
               <div key={field.id} className="space-y-1">
                 <Label className="text-xs font-medium">{field.name}</Label>
                 <div className="border rounded px-2 py-1.5 text-xs text-muted-foreground min-w-[100px]">—</div>
               </div>
             ))}
           </div>
         )}
         {textareaFields.map((field) => (
           <div key={field.id} className="space-y-1.5">
             <Label className="text-xs font-semibold">{field.name}</Label>
             <div className="border rounded-md p-3 min-h-[60px] bg-muted/30 text-xs text-muted-foreground w-full">
               Ingrese {field.name.toLowerCase()}
             </div>
           </div>
         ))}
       </div>
     );
   };
 
   const renderSection = (section: TemplateSection) => {
     const tableType = detectSpecializedTable(section);
     const hasODOI = hasODOIFields(section);
    
    // Detectar si es sección biomicroscópica para salto de página
    const isBiomicroscopicSection = tableType === 'biomicroscopic' || 
      section.title?.toLowerCase().includes('biomicroscop') ||
      section.title?.toLowerCase().includes('biomicroscóp');
 
     if (tableType || hasODOI) {
       return (
        <Card 
          key={section.id} 
          className="mb-3 overflow-hidden border border-primary/20"
          style={isBiomicroscopicSection ? {
            pageBreakBefore: 'always',
            breakBefore: 'page',
            marginTop: '120px'
          } : undefined}
        >
           <CardHeader className="py-2 px-3 bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5">
             <CardTitle className="text-xs font-semibold flex items-center gap-2">
               <span className="flex items-center justify-center h-5 w-5 rounded bg-primary/10 text-primary">
                 <Table2 className="h-3 w-3" />
               </span>
               <span className="text-primary">{section.roman_numeral}.</span>
               {section.title}
               <span className="ml-auto text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                 Tabla OD/OI
               </span>
             </CardTitle>
           </CardHeader>
           <CardContent className="py-3 px-3">
             {renderODOITable(section, tableType)}
           </CardContent>
         </Card>
       );
     }
 
     if (isDiagnosticSection(section)) {
       return (
         <Card key={section.id} className="mb-3">
           <CardHeader className="py-2 px-3 bg-gradient-to-r from-primary/10 to-secondary/10">
             <CardTitle className="text-xs font-semibold flex items-center gap-2">
               <span className="text-primary">{section.roman_numeral}.</span>
               {section.title}
             </CardTitle>
           </CardHeader>
           <CardContent className="py-3 px-3">
             {renderDiagnosticSection(section)}
           </CardContent>
         </Card>
       );
     }
 
     return (
       <Card key={section.id} className="mb-3">
         <CardHeader className="py-2 px-3 bg-gradient-to-r from-primary/10 to-secondary/10">
           <CardTitle className="text-xs font-semibold flex items-center gap-2">
             <span className="text-primary">{section.roman_numeral}.</span>
             {section.title}
           </CardTitle>
         </CardHeader>
         <CardContent className="py-3 px-3">
           {renderStandardSection(section)}
         </CardContent>
       </Card>
     );
   };
 
   return (
     <div className="space-y-4">
       {/* Toolbar */}
       <div className="flex justify-between items-center pb-3 border-b">
         <div className="text-sm text-muted-foreground">
           Vista previa del PDF. El documento se generará exactamente como se ve aquí.
         </div>
         <div className="flex gap-2">
           <Button 
             variant="default" 
             size="sm" 
             onClick={generatePDF}
             disabled={isGenerating}
             className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
           >
             {isGenerating ? (
               <Loader2 className="h-4 w-4 mr-1 animate-spin" />
             ) : (
               <FileDown className="h-4 w-4 mr-1" />
             )}
             {isGenerating ? 'Generando...' : 'Descargar PDF'}
           </Button>
           <Button variant="outline" size="sm" onClick={onClose}>
             Cerrar
           </Button>
         </div>
       </div>
 
       {/* PDF Preview Container */}
       <div className="max-h-[60vh] overflow-y-auto border rounded-lg">
         <div 
           ref={printRef}
           className="bg-white p-6 min-h-[800px]"
           style={{ width: '210mm', margin: '0 auto' }}
         >
           {/* Header */}
           <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 rounded-lg border mb-4">
             <div className="flex items-center gap-4">
               {template.header_config?.logo_url && (
                 <img 
                   src={template.header_config.logo_url} 
                   alt="Logo" 
                   className="h-12 w-auto object-contain"
                 />
               )}
               <div className="flex-1">
                 <h3 className="font-bold text-base">{template.header_config?.title || template.name}</h3>
                 <p className="text-xs text-muted-foreground">
                   Número de registro: {template.header_config?.record_number_prefix || 'HC'}-{'0'.repeat((template.header_config?.record_number_zeros || 6) - 4)}0001
                 </p>
               </div>
               <div className="text-right">
                 <div className="text-xs text-primary font-medium">Nro de Historia Clínica:</div>
                 <div className="text-sm font-bold">
                   {template.header_config?.record_number_prefix || 'HC'}-{'0'.repeat((template.header_config?.record_number_zeros || 6) - 4)}0001
                 </div>
               </div>
             </div>
             <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3 text-xs">
               <div><span className="font-medium">Paciente:</span> Juan Carlos Pérez García</div>
               <div><span className="font-medium">DNI:</span> 12345678</div>
               <div><span className="font-medium">Fecha de Visita:</span> {new Date().toLocaleDateString('es-PE')}</div>
               <div><span className="font-medium">Fecha de Creación:</span> {new Date().toLocaleString('es-PE')}</div>
             </div>
           </div>
 
           {/* Body Sections */}
           {template.body_config?.map((section) => renderSection(section))}
 
           {/* Footer */}
           {(template.footer_config?.text || template.footer_config?.signature_url) && (
             <div className="mt-6 pt-4 border-t text-center">
               {template.footer_config?.signature_url && (
                 <div className="mb-2">
                   <img src={template.footer_config.signature_url} alt="Firma" className="h-12 mx-auto" />
                 </div>
               )}
               <div className="w-32 border-t border-foreground/30 mx-auto mb-1" />
               {template.footer_config?.text && (
                 <p className="text-xs text-muted-foreground">{template.footer_config.text}</p>
               )}
             </div>
           )}
         </div>
       </div>
     </div>
   );
 }