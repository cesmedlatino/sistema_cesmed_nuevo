 import React from 'react';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Plus, Minus, Eye, Activity } from 'lucide-react';
 import { cn } from '@/lib/utils';
import { groupFieldsByEye, type EyeFieldGroup } from './OphthalmologyTableDetector';
 import type { TemplateSection } from '../MedicalRecordTemplateDesigner';
 
 interface GenericOphthalmologyTableProps {
   section: TemplateSection;
   formData: Record<string, any>;
   onFieldChange: (fieldId: string, value: any) => void;
   title?: string;
   icon?: React.ReactNode;
   colorScheme?: 'blue' | 'purple' | 'green' | 'orange' | 'teal';
  hideTitle?: boolean;
 }
 
 const COLOR_SCHEMES = {
   blue: {
     iconBg: 'from-blue-500/20 to-cyan-500/20',
     iconColor: 'text-blue-600',
     headerBg: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
   },
   purple: {
     iconBg: 'from-purple-500/20 to-pink-500/20',
     iconColor: 'text-purple-600',
     headerBg: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
   },
   green: {
     iconBg: 'from-green-500/20 to-emerald-500/20',
     iconColor: 'text-green-600',
     headerBg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
   },
   orange: {
     iconBg: 'from-orange-500/20 to-amber-500/20',
     iconColor: 'text-orange-600',
     headerBg: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
   },
   teal: {
     iconBg: 'from-teal-500/20 to-cyan-500/20',
     iconColor: 'text-teal-600',
     headerBg: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20',
   },
 };
 
 export function GenericOphthalmologyTable({ 
   section, 
   formData, 
   onFieldChange,
   title,
   icon,
  colorScheme = 'blue',
  hideTitle = false
 }: GenericOphthalmologyTableProps) {
   const groups = groupFieldsByEye(section);
   const colors = COLOR_SCHEMES[colorScheme];
   
   if (groups.length === 0) return null;
 
   const getNumericValue = (raw: any, unit: string = ''): number => {
     const s = String(raw ?? '')
       .replace(new RegExp(unit.replace(/[°µ]/g, ''), 'gi'), '')
       .replace(',', '.')
       .trim();
     const n = parseFloat(s);
     return Number.isNaN(n) ? 0 : n;
   };
 
   const formatValue = (value: number, unit: string, step: number): string => {
     if (value === 0) return '';
     const precision = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
     const formatted = precision === 0 ? Math.round(value).toString() : value.toFixed(precision);
     return unit ? `${formatted}${unit}` : formatted;
   };
 
   const renderInput = (fieldId: string | undefined, group: EyeFieldGroup) => {
     if (!fieldId) return <span className="text-muted-foreground text-center block">—</span>;
     
     const value = formData[fieldId] || '';
     const unit = group.unit || '';
     const step = group.step || 1;
 
     const handleIncrement = () => {
       const current = getNumericValue(value, unit);
       const next = current + step;
       onFieldChange(fieldId, formatValue(next, unit, step));
     };
 
     const handleDecrement = () => {
       const current = getNumericValue(value, unit);
       const next = current - step;
       onFieldChange(fieldId, formatValue(next, unit, step));
     };
 
     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       onFieldChange(fieldId, e.target.value);
     };
 
     const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
       const raw = e.currentTarget.value.trim();
       if (raw === '') return;
       const num = getNumericValue(raw, unit);
       if (!Number.isNaN(num) && num !== 0) {
         onFieldChange(fieldId, formatValue(num, unit, step));
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
           placeholder={unit || '—'}
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
 
   return (
     <div className="space-y-3">
      {!hideTitle && (
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br',
            colors.iconBg,
            colors.iconColor
          )}>
            {icon || <Activity className="h-5 w-5" />}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{title || section.title}</h4>
          </div>
        </div>
      )}
 
       <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
         <Table>
           <TableHeader>
             <TableRow className={cn('bg-gradient-to-r border-b', colors.headerBg)}>
               <TableHead className="font-semibold text-foreground w-[35%]">
                 Parámetro
               </TableHead>
               <TableHead className="text-center font-semibold text-foreground">
                 <div className="flex items-center justify-center gap-1.5">
                   <Eye className={cn('h-4 w-4', colors.iconColor)} />
                   <span>OD</span>
                 </div>
               </TableHead>
               <TableHead className="text-center font-semibold text-foreground">
                 <div className="flex items-center justify-center gap-1.5">
                   <Eye className={cn('h-4 w-4', colors.iconColor)} />
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
                   <div className="flex items-center gap-2">
                     <span className="font-medium text-sm">{group.label}</span>
                     {group.unit && (
                       <span className="text-xs text-primary/70 font-mono">[{group.unit}]</span>
                     )}
                   </div>
                 </TableCell>
                 <TableCell className="py-3">
                   <div className="flex justify-center">
                     {renderInput(group.odFieldId, group)}
                   </div>
                 </TableCell>
                 <TableCell className="py-3">
                   <div className="flex justify-center">
                     {renderInput(group.oiFieldId, group)}
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