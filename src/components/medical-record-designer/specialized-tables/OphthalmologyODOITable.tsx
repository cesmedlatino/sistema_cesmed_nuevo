 import React from 'react';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Plus, Minus, Eye } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import type { EyeFieldGroup } from './OphthalmologyTableDetector';
 
 interface OphthalmologyODOITableProps {
   title: string;
   description?: string;
   icon?: React.ReactNode;
   groups: EyeFieldGroup[];
   formData: Record<string, any>;
   onFieldChange: (fieldId: string, value: any) => void;
   className?: string;
   variant?: 'default' | 'compact' | 'detailed';
 }
 
 // Escala Snellen para agudeza visual
 const VISUAL_ACUITY_OPTIONS = [
   '20/10', '20/15', '20/20', '20/25', '20/30', '20/40', '20/50',
   '20/60', '20/70', '20/80', '20/100', '20/150', '20/200', '20/300',
   '20/400', 'CD', 'MM', 'PL', 'NPL'
 ];
 
 export function OphthalmologyODOITable({
   title,
   description,
   icon,
   groups,
   formData,
   onFieldChange,
   className,
   variant = 'default',
 }: OphthalmologyODOITableProps) {
   
   const getNumericValue = (raw: any, unit: string = ''): number => {
     const s = String(raw ?? '')
       .replace(new RegExp(unit, 'gi'), '')
       .replace(',', '.')
       .trim();
     const n = parseFloat(s);
     return Number.isNaN(n) ? 0 : n;
   };
 
   const formatValue = (value: number, unit: string = '', precision: number = 2): string => {
     if (value === 0) return '';
     const formatted = precision === 0 ? Math.round(value).toString() : value.toFixed(precision);
     return unit ? `${formatted}${unit}` : formatted;
   };
 
   const isVisualAcuityField = (label: string): boolean => {
     const normalized = label.toLowerCase();
     return normalized.includes('agudeza') || 
            normalized.includes('av ') || 
            normalized.includes('avsc') || 
            normalized.includes('avcc');
   };
 
   const renderFieldInput = (
     fieldId: string | undefined,
     group: EyeFieldGroup,
     eye: 'od' | 'oi'
   ) => {
     if (!fieldId) {
       return <span className="text-muted-foreground text-center block">—</span>;
     }
 
     const value = formData[fieldId] || '';
     const unit = group.unit || '';
     const step = group.step || 0.25;
     const precision = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
 
     // Si es agudeza visual, usar selector
     if (isVisualAcuityField(group.label)) {
       return (
         <Select value={value} onValueChange={(val) => onFieldChange(fieldId, val)}>
           <SelectTrigger className="h-9 text-center border-primary/20 focus:border-primary bg-background">
             <SelectValue placeholder="Seleccionar" />
           </SelectTrigger>
           <SelectContent>
             {VISUAL_ACUITY_OPTIONS.map(opt => (
               <SelectItem key={opt} value={opt}>{opt}</SelectItem>
             ))}
           </SelectContent>
         </Select>
       );
     }
 
     const handleIncrement = () => {
       const current = getNumericValue(value, unit);
       const next = current + step;
       onFieldChange(fieldId, formatValue(next, unit, precision));
     };
 
     const handleDecrement = () => {
       const current = getNumericValue(value, unit);
       const next = current - step;
       onFieldChange(fieldId, formatValue(next, unit, precision));
     };
 
     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       const inputValue = e.target.value;
       if (inputValue === '') {
         onFieldChange(fieldId, '');
         return;
       }
       onFieldChange(fieldId, inputValue);
     };
 
     const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
       const raw = e.currentTarget.value.trim();
       if (raw === '') return;
       
       const num = getNumericValue(raw, unit);
       if (!Number.isNaN(num) && num !== 0) {
         const formatted = formatValue(num, unit, precision);
         if (formatted !== value) {
           onFieldChange(fieldId, formatted);
         }
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
           variant="outline"
           size="icon"
           className="h-8 w-8 shrink-0 rounded-full border-primary/20 hover:bg-primary/10 hover:border-primary"
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
           className="h-9 text-center font-mono text-sm border-primary/20 focus:border-primary bg-background min-w-[80px]"
           placeholder={unit || '—'}
         />
         <Button
           type="button"
           variant="outline"
           size="icon"
           className="h-8 w-8 shrink-0 rounded-full border-primary/20 hover:bg-primary/10 hover:border-primary"
           onClick={handleIncrement}
         >
           <Plus className="h-3 w-3" />
         </Button>
       </div>
     );
   };
 
   return (
     <div className={cn('space-y-3', className)}>
       {/* Header */}
       <div className="flex items-center gap-3">
         {icon && (
           <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
             {icon}
           </div>
         )}
         <div>
           <h4 className="font-semibold text-foreground">{title}</h4>
           {description && (
             <p className="text-xs text-muted-foreground">{description}</p>
           )}
         </div>
       </div>
 
       {/* Table */}
       <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
         <Table>
           <TableHeader>
             <TableRow className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/10">
               <TableHead className="font-semibold text-foreground w-[35%]">
                 Parámetro
               </TableHead>
               <TableHead className="text-center font-semibold text-foreground">
                 <div className="flex items-center justify-center gap-2">
                   <Eye className="h-4 w-4" />
                   <span>OD</span>
                 </div>
               </TableHead>
               <TableHead className="text-center font-semibold text-foreground">
                 <div className="flex items-center justify-center gap-2">
                   <Eye className="h-4 w-4" />
                   <span>OI</span>
                 </div>
               </TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {groups.map((group, index) => (
               <TableRow 
                 key={index} 
                 className={cn(
                   'transition-colors hover:bg-muted/50',
                   index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                 )}
               >
                 <TableCell className="py-3">
                   <div className="space-y-0.5">
                     <span className="font-medium text-sm text-foreground block">
                       {group.label}
                     </span>
                     {group.description && variant === 'detailed' && (
                       <span className="text-xs text-muted-foreground block">
                         {group.description}
                       </span>
                     )}
                     {group.unit && (
                       <span className="text-xs text-primary/70 font-mono">
                         [{group.unit}]
                       </span>
                     )}
                   </div>
                 </TableCell>
                 <TableCell className="py-3">
                   <div className="flex justify-center">
                     {renderFieldInput(group.odFieldId, group, 'od')}
                   </div>
                 </TableCell>
                 <TableCell className="py-3">
                   <div className="flex justify-center">
                     {renderFieldInput(group.oiFieldId, group, 'oi')}
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