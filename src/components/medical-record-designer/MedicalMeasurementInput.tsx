import React, { useCallback } from 'react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 // Configuration for ophthalmology measurements
 export interface MeasurementConfig {
   unit: string;
   min: number;
   max: number;
   step: number;
   precision: number;
   defaultValue?: number;
   allowNegative?: boolean;
   prefix?: string;
   options?: string[]; // For visual acuity Snellen values
 }
 
 // Predefined measurement configurations for ophthalmology
 export const OPHTHALMOLOGY_MEASUREMENTS: Record<string, MeasurementConfig> = {
   // Refraction measurements
   sphere: {
     unit: 'D',
     min: -30,
     max: 30,
     step: 0.25,
     precision: 2,
     defaultValue: 0,
     allowNegative: true,
     prefix: ''
   },
   cylinder: {
     unit: 'D',
     min: -12,
     max: 12,
     step: 0.25,
     precision: 2,
     defaultValue: 0,
     allowNegative: true
   },
   axis: {
     unit: '°',
     min: 0,
     max: 180,
     step: 1,
     precision: 0,
     defaultValue: 0
   },
   // Visual Acuity
   visualAcuity: {
     unit: '',
     min: 0,
     max: 0,
     step: 0,
     precision: 0,
     options: [
       '20/10', '20/15', '20/20', '20/25', '20/30', '20/40', '20/50', 
       '20/60', '20/70', '20/80', '20/100', '20/150', '20/200', 
       '20/400', 'CD', 'MM', 'PL', 'NPL'
     ]
   },
   // Intraocular Pressure
   iop: {
     unit: 'mmHg',
     min: 5,
     max: 60,
     step: 1,
     precision: 0,
     defaultValue: 14
   },
   // Keratometry
   keratometry: {
     unit: 'D',
     min: 35,
     max: 55,
     step: 0.25,
     precision: 2,
     defaultValue: 43
   },
   keratometryAxis: {
     unit: '°',
     min: 0,
     max: 180,
     step: 1,
     precision: 0
   },
   // Pachymetry (Corneal Thickness)
   pachymetry: {
     unit: 'µm',
     min: 300,
     max: 700,
     step: 1,
     precision: 0,
     defaultValue: 545
   },
   // Pupil Diameter
   pupilDiameter: {
     unit: 'mm',
     min: 1,
     max: 10,
     step: 0.1,
     precision: 1,
     defaultValue: 4
   },
   // Scotopic Pupil
   scotopicPupil: {
     unit: 'mm',
     min: 2,
     max: 10,
     step: 0.1,
     precision: 1,
     defaultValue: 6
   },
   // DIP (Distancia Interpupilar)
   dip: {
     unit: 'mm',
     min: 50,
     max: 80,
     step: 0.5,
     precision: 1,
     defaultValue: 63
   },
   // ADD (Near Addition)
   add: {
     unit: 'D',
     min: 0,
     max: 4,
     step: 0.25,
     precision: 2,
     defaultValue: 0
   },
   // White-to-White (Corneal Diameter)
   ww: {
     unit: 'mm',
     min: 10,
     max: 14,
     step: 0.1,
     precision: 1,
     defaultValue: 11.5
   },
   // Z40 (Spherical Aberration)
   z40: {
     unit: 'µm',
     min: -1,
     max: 1,
     step: 0.01,
     precision: 3,
     defaultValue: 0,
     allowNegative: true
   },
   // CCT (Central Corneal Thickness)
   cct: {
     unit: 'µm',
     min: 300,
     max: 700,
     step: 1,
     precision: 0,
     defaultValue: 545
   },
   // Kappa Angle
   kappaAngle: {
     unit: '°',
     min: -10,
     max: 10,
     step: 0.1,
     precision: 1,
     defaultValue: 0,
     allowNegative: true
   },
   // Generic distance in mm
   distanceMm: {
     unit: 'mm',
     min: 0,
     max: 100,
     step: 0.1,
     precision: 1,
     defaultValue: 0
   },
   // Age
   age: {
     unit: 'años',
     min: 0,
     max: 120,
     step: 1,
     precision: 0
   }
 };
 
 // Field name to measurement type mapping
 export function detectMeasurementType(fieldName: string): keyof typeof OPHTHALMOLOGY_MEASUREMENTS | null {
   const name = fieldName.toLowerCase();
   
   // Visual Acuity
   if (name.includes('av ') || name.includes('agudeza visual') || 
       name.includes('av sc') || name.includes('av cc') ||
       name.includes('avsc') || name.includes('avcc')) {
     return 'visualAcuity';
   }
   
   // Sphere
   if (name.includes('esfera') || name.includes('sphere') || name.includes('sph')) {
     return 'sphere';
   }
   
   // Cylinder
   if (name.includes('cilindro') || name.includes('cylinder') || name.includes('cyl')) {
     return 'cylinder';
   }
   
   // Axis
   if (name.includes('eje') || name.includes('axis')) {
     return 'axis';
   }
   
   // IOP (Intraocular Pressure)
   if (name.includes('pio') || name.includes('presión intraocular') || 
       name.includes('presion intraocular') || name.includes('iop')) {
     return 'iop';
   }
   
   // Keratometry
   if (name.includes('queratometr') || name.includes('keratometr') || 
       name.includes('k1') || name.includes('k2') || name.includes('km')) {
     if (name.includes('eje') || name.includes('axis')) {
       return 'keratometryAxis';
     }
     return 'keratometry';
   }
   
   // Pachymetry / CCT
   if (name.includes('paquimetr') || name.includes('pachymetr') || 
       name.includes('cct') || name.includes('espesor corneal')) {
     return 'pachymetry';
   }
   
   // Pupil
   if (name.includes('pupil') || name.includes('diámetro pupilar') || 
       name.includes('diametro pupilar')) {
     if (name.includes('escotop') || name.includes('scotop')) {
       return 'scotopicPupil';
     }
     return 'pupilDiameter';
   }
   
   // DIP
   if (name.includes('dip') || name.includes('interpupilar') || name.includes('dnp')) {
     return 'dip';
   }
   
   // ADD
   if (name.includes('add') || name.includes('adición') || name.includes('adicion')) {
     return 'add';
   }
   
   // WW (White-to-White)
   if (name.includes('ww') || name.includes('white') || name.includes('blanco a blanco')) {
     return 'ww';
   }
   
   // Z40
   if (name.includes('z40') || name.includes('aberración esférica') || 
       name.includes('aberracion esferica')) {
     return 'z40';
   }
   
   // Kappa Angle
   if (name.includes('kappa') || name.includes('ángulo kappa')) {
     return 'kappaAngle';
   }
   
   // Age
   if (name === 'edad' || name.includes('edad')) {
     return 'age';
   }
   
   return null;
 }
 
 interface MedicalMeasurementInputProps {
   value: string | number;
   onChange: (value: string | number) => void;
   measurementType: keyof typeof OPHTHALMOLOGY_MEASUREMENTS;
   placeholder?: string;
   className?: string;
   disabled?: boolean;
   showUnit?: boolean;
   size?: 'sm' | 'md' | 'lg';
 }
 
 export function MedicalMeasurementInput({
   value,
   onChange,
   measurementType,
   placeholder,
   className,
   disabled = false,
   showUnit = true,
   size = 'md'
 }: MedicalMeasurementInputProps) {
   const config = OPHTHALMOLOGY_MEASUREMENTS[measurementType];
  
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || config.defaultValue || 0;

  const handleIncrement = useCallback(() => {
    const newValue = Math.min(numericValue + config.step, config.max);
    onChange(Number(newValue.toFixed(config.precision)));
  }, [numericValue, config, onChange]);

  const handleDecrement = useCallback(() => {
    const minVal = config.allowNegative ? config.min : Math.max(0, config.min);
    const newValue = Math.max(numericValue - config.step, minVal);
    onChange(Number(newValue.toFixed(config.precision)));
  }, [numericValue, config, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty, minus sign, or valid number patterns
    if (inputValue === '' || inputValue === '-' || inputValue === '.') {
      onChange(inputValue);
      return;
    }
    
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      onChange(inputValue);
    }
  }, [onChange]);

  const handleBlur = useCallback(() => {
    const parsed = parseFloat(String(value));
    if (isNaN(parsed)) {
      onChange(config.defaultValue || 0);
      return;
    }
    
    // Clamp value to range
    const minVal = config.allowNegative ? config.min : Math.max(0, config.min);
    const clamped = Math.max(minVal, Math.min(parsed, config.max));
    onChange(Number(clamped.toFixed(config.precision)));
  }, [value, config, onChange]);

  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base'
  };

  const buttonSizeClasses = {
    sm: 'h-8 w-6',
    md: 'h-10 w-8',
    lg: 'h-12 w-10'
  };
   
   // If it has predefined options (like visual acuity), render a select
   if (config.options && config.options.length > 0) {
     return (
       <Select 
         value={String(value || '')} 
         onValueChange={onChange}
         disabled={disabled}
       >
         <SelectTrigger className={cn(
           size === 'sm' ? 'h-8 text-xs' : size === 'lg' ? 'h-12 text-base' : 'h-10 text-sm',
           'w-full',
           className
         )}>
           <SelectValue placeholder={placeholder || 'Seleccionar'} />
         </SelectTrigger>
         <SelectContent>
           {config.options.map((option) => (
             <SelectItem key={option} value={option}>
               {option}
             </SelectItem>
           ))}
         </SelectContent>
       </Select>
     );
   }
 
   return (
     <div className={cn('flex items-center gap-1', className)}>
       <div className="flex items-center border rounded-md overflow-hidden bg-background">
         {/* Decrement button */}
         <Button
           type="button"
           variant="ghost"
           size="icon"
           className={cn(
             buttonSizeClasses[size],
             'rounded-none border-r hover:bg-muted'
           )}
           onClick={handleDecrement}
           disabled={disabled}
         >
           <Minus className="h-3 w-3" />
         </Button>
         
         {/* Input field */}
         <Input
           type="text"
           inputMode="decimal"
           value={value}
           onChange={handleInputChange}
           onBlur={handleBlur}
           placeholder={placeholder || String(config.defaultValue || 0)}
           disabled={disabled}
           className={cn(
             sizeClasses[size],
             'w-16 text-center border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0'
           )}
         />
         
         {/* Increment button */}
         <Button
           type="button"
           variant="ghost"
           size="icon"
           className={cn(
             buttonSizeClasses[size],
             'rounded-none border-l hover:bg-muted'
           )}
           onClick={handleIncrement}
           disabled={disabled}
         >
           <Plus className="h-3 w-3" />
         </Button>
       </div>
       
       {/* Unit label */}
       {showUnit && config.unit && (
         <span className={cn(
           'text-muted-foreground font-medium',
           size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
         )}>
           {config.unit}
         </span>
       )}
     </div>
   );
 }
 
 // Helper component for paired OD/OI measurements
 interface OdOiMeasurementInputProps {
   odValue: string | number;
   oiValue: string | number;
   onOdChange: (value: string | number) => void;
   onOiChange: (value: string | number) => void;
   measurementType: keyof typeof OPHTHALMOLOGY_MEASUREMENTS;
   label?: string;
   className?: string;
   disabled?: boolean;
 }
 
 export function OdOiMeasurementInput({
   odValue,
   oiValue,
   onOdChange,
   onOiChange,
   measurementType,
   label,
   className,
   disabled = false
 }: OdOiMeasurementInputProps) {
   return (
     <div className={cn('space-y-2', className)}>
       {label && (
         <div className="text-sm font-medium text-foreground">{label}</div>
       )}
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-1">
           <span className="text-xs font-semibold text-primary">OD</span>
           <MedicalMeasurementInput
             value={odValue}
             onChange={onOdChange}
             measurementType={measurementType}
             disabled={disabled}
             size="sm"
           />
         </div>
         <div className="space-y-1">
           <span className="text-xs font-semibold text-secondary">OI</span>
           <MedicalMeasurementInput
             value={oiValue}
             onChange={onOiChange}
             measurementType={measurementType}
             disabled={disabled}
             size="sm"
           />
         </div>
       </div>
     </div>
   );
 }