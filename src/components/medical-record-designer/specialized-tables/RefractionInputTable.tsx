 import React from 'react';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Plus, Minus, Eye, Focus } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { normalize } from './OphthalmologyTableDetector';
 import type { TemplateSection } from '../MedicalRecordTemplateDesigner';
 
 interface RefractionInputTableProps {
   section: TemplateSection;
   formData: Record<string, any>;
   onFieldChange: (fieldId: string, value: any) => void;
 }
 
 interface RefractionRow {
   label: string;
   key: string;
   unit: string;
   step: number;
   precision: number;
   min?: number;
   max?: number;
 }
 
 const REFRACTION_ROWS: RefractionRow[] = [
   { label: 'Esfera', key: 'esfera', unit: 'D', step: 0.25, precision: 2, min: -30, max: 30 },
   { label: 'Cilindro', key: 'cilindro', unit: 'D', step: 0.25, precision: 2, min: -10, max: 10 },
   { label: 'Eje', key: 'eje', unit: '°', step: 1, precision: 0, min: 0, max: 180 },
   { label: 'ADD', key: 'add', unit: 'D', step: 0.25, precision: 2, min: 0, max: 4 },
   { label: 'DIP', key: 'dip', unit: 'mm', step: 0.5, precision: 1, min: 50, max: 80 },
 ];
 
 export function RefractionInputTable({ section, formData, onFieldChange }: RefractionInputTableProps) {
   const fields = section.fields || [];
   
   const findField = (rowKey: string, eye: 'od' | 'oi'): string | undefined => {
     const rowPatterns = [rowKey];
     const eyePatterns = eye === 'od' ? ['od', 'ojo derecho', 'derecho'] : ['oi', 'ojo izquierdo', 'izquierdo'];
     
     const match = fields.find(f => {
       const name = normalize(f.name || '');
       const hasRow = rowPatterns.some(p => name.includes(normalize(p)));
       const hasEye = eyePatterns.some(p => name.includes(p));
       return hasRow && hasEye;
     });
     
     return match?.id;
   };
 
   const getNumericValue = (raw: any, unit: string): number => {
     const s = String(raw ?? '')
       .replace(new RegExp(unit.replace('°', ''), 'gi'), '')
       .replace(',', '.')
       .trim();
     const n = parseFloat(s);
     return Number.isNaN(n) ? 0 : n;
   };
 
   const formatValue = (value: number, row: RefractionRow): string => {
     if (value === 0 && row.key !== 'eje') return '';
     const prefix = value > 0 && (row.key === 'esfera' || row.key === 'cilindro') ? '+' : '';
     const formatted = row.precision === 0 
       ? Math.round(value).toString() 
       : value.toFixed(row.precision);
     return `${prefix}${formatted}${row.unit}`;
   };
 
   const renderInput = (fieldId: string | undefined, row: RefractionRow) => {
     if (!fieldId) return <span className="text-muted-foreground text-center block">—</span>;
     
     const value = formData[fieldId] || '';
     
     const handleIncrement = () => {
       const current = getNumericValue(value, row.unit);
       const next = Math.min(current + row.step, row.max ?? Infinity);
       onFieldChange(fieldId, formatValue(next, row));
     };
 
     const handleDecrement = () => {
       const current = getNumericValue(value, row.unit);
       const next = Math.max(current - row.step, row.min ?? -Infinity);
       onFieldChange(fieldId, formatValue(next, row));
     };
 
     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       onFieldChange(fieldId, e.target.value);
     };
 
     const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
       const raw = e.currentTarget.value.trim();
       if (raw === '') return;
       
       const num = getNumericValue(raw, row.unit);
       if (!Number.isNaN(num)) {
         onFieldChange(fieldId, formatValue(num, row));
       }
     };
 
     const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
       if (e.key === 'ArrowUp') {
         e.preventDefault();
         handleIncrement();
       } else if (e.key === 'ArrowDown') {
         e.preventDefault();
         handleDecrement();
       }
     };
 
     return (
       <div className="flex items-center gap-1">
         <Button
           type="button"
           variant="ghost"
           size="icon"
           className="h-7 w-7 shrink-0 rounded-full hover:bg-primary/10"
           onClick={handleDecrement}
         >
           <Minus className="h-3 w-3" />
         </Button>
         <Input
           value={value}
           onChange={handleChange}
           onBlur={handleBlur}
           onKeyDown={handleKeyDown}
           inputMode="decimal"
           className="h-9 text-center font-mono text-sm border-primary/20 focus:border-primary bg-background w-24"
           placeholder={row.unit}
         />
         <Button
           type="button"
           variant="ghost"
           size="icon"
           className="h-7 w-7 shrink-0 rounded-full hover:bg-primary/10"
           onClick={handleIncrement}
         >
           <Plus className="h-3 w-3" />
         </Button>
       </div>
     );
   };
 
   // Filtrar solo las filas que tienen campos configurados
   const activeRows = REFRACTION_ROWS.filter(row => 
     findField(row.key, 'od') || findField(row.key, 'oi')
   );
 
   if (activeRows.length === 0) {
     // Fallback: intentar detectar cualquier campo con patrón OD/OI
     return null;
   }
 
   return (
     <div className="space-y-3">
       <div className="flex items-center gap-3">
         <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-600">
           <Focus className="h-5 w-5" />
         </div>
         <div>
           <h4 className="font-semibold text-foreground">Refracción</h4>
           <p className="text-xs text-muted-foreground">Parámetros de corrección óptica</p>
         </div>
       </div>
 
       <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
         <Table>
           <TableHeader>
             <TableRow className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b">
               <TableHead className="font-semibold text-foreground w-[30%]">
                 Parámetro
               </TableHead>
               <TableHead className="text-center font-semibold text-foreground">
                 <div className="flex items-center justify-center gap-1.5">
                   <Eye className="h-4 w-4 text-purple-600" />
                   <span>OD</span>
                 </div>
               </TableHead>
               <TableHead className="text-center font-semibold text-foreground">
                 <div className="flex items-center justify-center gap-1.5">
                   <Eye className="h-4 w-4 text-purple-600" />
                   <span>OI</span>
                 </div>
               </TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {activeRows.map((row, index) => (
               <TableRow 
                 key={row.key}
                 className={cn(
                   'transition-colors hover:bg-muted/50',
                   index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                 )}
               >
                 <TableCell className="py-3">
                   <div className="flex items-center gap-2">
                     <span className="font-medium text-sm">{row.label}</span>
                     <span className="text-xs text-primary/70 font-mono">[{row.unit}]</span>
                   </div>
                 </TableCell>
                 <TableCell className="py-3">
                   <div className="flex justify-center">
                     {renderInput(findField(row.key, 'od'), row)}
                   </div>
                 </TableCell>
                 <TableCell className="py-3">
                   <div className="flex justify-center">
                     {renderInput(findField(row.key, 'oi'), row)}
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