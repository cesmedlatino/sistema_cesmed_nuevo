 import React from 'react';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Eye, Glasses } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { normalize } from './OphthalmologyTableDetector';
 import type { TemplateSection } from '../MedicalRecordTemplateDesigner';
 
 interface VisualAcuityTableProps {
   section: TemplateSection;
   formData: Record<string, any>;
   onFieldChange: (fieldId: string, value: any) => void;
 }
 
 const VISUAL_ACUITY_OPTIONS = [
   '20/10', '20/15', '20/20', '20/25', '20/30', '20/40', '20/50',
   '20/60', '20/70', '20/80', '20/100', '20/150', '20/200', '20/300',
   '20/400', 'CD', 'MM', 'PL', 'NPL'
 ];
 
 export function VisualAcuityTable({ section, formData, onFieldChange }: VisualAcuityTableProps) {
   // Mapear campos a posiciones de la tabla
   const fields = section.fields || [];
   
   const findField = (type: 'sc' | 'cc', eye: 'od' | 'oi'): string | undefined => {
     const typePatterns = type === 'sc' ? ['sc', 'sin correccion', 'sin correcion'] : ['cc', 'con correccion', 'con correcion'];
     const eyePatterns = eye === 'od' ? ['od', 'ojo derecho', 'derecho'] : ['oi', 'ojo izquierdo', 'izquierdo'];
     
     const match = fields.find(f => {
       const name = normalize(f.name || '');
       const hasType = typePatterns.some(p => name.includes(p));
       const hasEye = eyePatterns.some(p => name.includes(p));
       return hasType && hasEye;
     });
     
     return match?.id;
   };
 
   const renderSelect = (fieldId: string | undefined) => {
     if (!fieldId) return <span className="text-muted-foreground">—</span>;
     
     return (
       <Select 
         value={formData[fieldId] || ''} 
         onValueChange={(val) => onFieldChange(fieldId, val)}
       >
         <SelectTrigger className="h-10 text-center border-primary/20 focus:border-primary bg-background font-mono">
           <SelectValue placeholder="—" />
         </SelectTrigger>
         <SelectContent>
           {VISUAL_ACUITY_OPTIONS.map(opt => (
             <SelectItem key={opt} value={opt} className="font-mono">
               {opt}
             </SelectItem>
           ))}
         </SelectContent>
       </Select>
     );
   };
 
   const rows = [
     { 
       label: 'AV Sin Corrección', 
       abbrev: 'AVSC',
       description: 'Agudeza visual sin lentes',
       icon: <Eye className="h-4 w-4" />,
       odField: findField('sc', 'od'),
       oiField: findField('sc', 'oi'),
     },
     { 
       label: 'AV Con Corrección', 
       abbrev: 'AVCC',
       description: 'Agudeza visual con lentes',
       icon: <Glasses className="h-4 w-4" />,
       odField: findField('cc', 'od'),
       oiField: findField('cc', 'oi'),
     },
   ];
 
   return (
     <div className="space-y-3">
       <div className="flex items-center gap-3">
         <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-600">
           <Eye className="h-5 w-5" />
         </div>
         <div>
           <h4 className="font-semibold text-foreground">Agudeza Visual</h4>
           <p className="text-xs text-muted-foreground">Escala Snellen (20/X)</p>
         </div>
       </div>
 
       <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
         <Table>
           <TableHeader>
             <TableRow className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-b">
               <TableHead className="font-semibold text-foreground w-[40%]">
                 Medición
               </TableHead>
               <TableHead className="text-center font-semibold text-foreground">
                 <div className="flex items-center justify-center gap-1.5">
                   <Eye className="h-4 w-4 text-blue-600" />
                   <span>OD</span>
                 </div>
               </TableHead>
               <TableHead className="text-center font-semibold text-foreground">
                 <div className="flex items-center justify-center gap-1.5">
                   <Eye className="h-4 w-4 text-blue-600" />
                   <span>OI</span>
                 </div>
               </TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {rows.map((row, index) => (
               <TableRow 
                 key={index}
                 className={cn(
                   'transition-colors hover:bg-muted/50',
                   index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                 )}
               >
                 <TableCell className="py-4">
                   <div className="flex items-center gap-3">
                     <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/5 text-primary">
                       {row.icon}
                     </div>
                     <div>
                       <span className="font-medium text-sm block">{row.label}</span>
                       <span className="text-xs text-muted-foreground">{row.description}</span>
                     </div>
                   </div>
                 </TableCell>
                 <TableCell className="py-4">
                   <div className="max-w-[140px] mx-auto">
                     {renderSelect(row.odField)}
                   </div>
                 </TableCell>
                 <TableCell className="py-4">
                   <div className="max-w-[140px] mx-auto">
                     {renderSelect(row.oiField)}
                   </div>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </div>
     </div>
   );
 }