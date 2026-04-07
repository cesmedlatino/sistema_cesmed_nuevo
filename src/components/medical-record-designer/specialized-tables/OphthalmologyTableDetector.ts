 // Detector de tablas especializadas para oftalmología
 // Identifica qué tipo de tabla especializada corresponde a cada sección
 
 import type { TemplateSection } from '../MedicalRecordTemplateDesigner';
 
 export type SpecializedTableType = 
   | 'visual_acuity'
   | 'refraction'
   | 'keratometry'
   | 'biomicroscopic'
   | 'iop'
   | 'cct'
   | 'pupil_diameter'
   | 'kappa_angle'
   | 'ww'
   | 'z40'
   | 'vacuum_ring'
   | 'presurgical'
   | 'final_refraction'
   | 'correction_methods'
   | 'prescription_lenses'
   | null;
 
 // Normaliza textos para comparación
 export const normalize = (s: string): string =>
   String(s || '')
     .toLowerCase()
     .normalize('NFD')
     .replace(/[\u0300-\u036f]/g, '')
     .replace(/[^a-z0-9\s]/g, ' ')
     .replace(/\s+/g, ' ')
     .trim();
 
 // Patrones de detección para cada tipo de tabla
 const TABLE_PATTERNS: Record<Exclude<SpecializedTableType, null>, string[]> = {
   visual_acuity: ['agudeza visual', 'av sc', 'av cc', 'avsc', 'avcc'],
   refraction: ['refraccion', 'esfera', 'cilindro', 'eje', 'add'],
   keratometry: ['queratometria', 'flat k', 'steep k', 'k plano', 'k curvo'],
   biomicroscopic: ['biomicroscopico', 'biomicroscopia', 'lampara de hendidura'],
   iop: ['pio', 'presion intraocular', 'tonometria'],
   cct: ['cct', 'paquimetria', 'espesor corneal', 'grosor corneal'],
   pupil_diameter: ['diametro pupilar', 'pupila escotopica', 'pupila mesopica'],
   kappa_angle: ['angulo kappa', 'angulo k'],
   ww: ['w-w', 'w w', 'white to white', 'blanco a blanco'],
   z40: ['z 4.0', 'z4.0', 'z40', 'z 40'],
   vacuum_ring: ['anillo de vacio', 'vacuum ring', 'ml7'],
   presurgical: ['examen preoperatorio', 'evaluacion prequirurgica', 'preoperatorio'],
   final_refraction: ['refraccion final', 'correccion final'],
   correction_methods: ['metodo de correccion', 'metodos de correccion'],
   prescription_lenses: ['lentes de prescripcion', 'receta de lentes', 'prescripcion optica'],
 };
 
 // Detecta el tipo de tabla especializada basado en el título y campos de la sección
 export function detectSpecializedTable(section: TemplateSection): SpecializedTableType {
   const title = normalize(section.title || '');
   const sectionId = section.id || '';
   
   // Buscar coincidencias en el título
   for (const [tableType, patterns] of Object.entries(TABLE_PATTERNS)) {
     for (const pattern of patterns) {
       if (title.includes(normalize(pattern))) {
         return tableType as SpecializedTableType;
       }
     }
   }
   
   // Buscar coincidencias en los nombres de campos
   const fieldNames = section.fields?.map(f => normalize(f.name || '')).join(' ') || '';
   for (const [tableType, patterns] of Object.entries(TABLE_PATTERNS)) {
     for (const pattern of patterns) {
       if (fieldNames.includes(normalize(pattern))) {
         return tableType as SpecializedTableType;
       }
     }
   }
   
   // Detección por ID específico (para plantillas existentes)
   const knownSectionMappings: Record<string, SpecializedTableType> = {
     '4416ab77-a41a-49db-9736-c69a570c39d7': 'biomicroscopic',
   };
   
   if (knownSectionMappings[sectionId]) {
     return knownSectionMappings[sectionId];
   }
   
   return null;
 }
 
 // Agrupa campos por ojo (OD/OI)
 export interface EyeFieldGroup {
   label: string;
   description?: string;
   odFieldId?: string;
   oiFieldId?: string;
   unit?: string;
   step?: number;
 }
 
 export function groupFieldsByEye(section: TemplateSection): EyeFieldGroup[] {
   const fields = section.fields || [];
   const groups: Map<string, EyeFieldGroup> = new Map();
   
   fields.forEach(field => {
     const name = normalize(field.name || '');
     const isOD = name.includes('od') || name.includes('ojo derecho') || name.includes('derecho');
     const isOI = name.includes('oi') || name.includes('ojo izquierdo') || name.includes('izquierdo');
     
     // Extraer el nombre base sin el indicador de ojo
     let baseName = name
       .replace(/\s*od\s*/g, ' ')
       .replace(/\s*oi\s*/g, ' ')
       .replace(/\s*ojo derecho\s*/g, ' ')
       .replace(/\s*ojo izquierdo\s*/g, ' ')
       .replace(/\s*derecho\s*/g, ' ')
       .replace(/\s*izquierdo\s*/g, ' ')
       .trim();
     
     if (!baseName) baseName = 'valor';
     
     const existing = groups.get(baseName) || {
       label: field.name.replace(/\s*(OD|OI|Ojo Derecho|Ojo Izquierdo|Derecho|Izquierdo)\s*/gi, '').trim() || 'Valor',
       description: getFieldDescription(baseName),
       unit: getFieldUnit(baseName),
       step: getFieldStep(baseName),
     };
     
     if (isOD) {
       existing.odFieldId = field.id;
     } else if (isOI) {
       existing.oiFieldId = field.id;
     }
     
     groups.set(baseName, existing);
   });
   
   return Array.from(groups.values()).filter(g => g.odFieldId || g.oiFieldId);
 }
 
 function getFieldDescription(fieldName: string): string {
   const descriptions: Record<string, string> = {
     'pio': 'Presión Intraocular',
     'presion intraocular': 'Valores normales: 10-21 mmHg',
     'esfera': 'Componente esférico de la refracción',
     'cilindro': 'Componente cilíndrico del astigmatismo',
     'eje': 'Eje del astigmatismo en grados',
     'agudeza visual': 'Capacidad de discriminación visual',
     'cct': 'Grosor corneal central',
     'queratometria': 'Curvatura corneal',
     'flat k': 'Meridiano más plano',
     'steep k': 'Meridiano más curvo',
   };
   
   for (const [key, desc] of Object.entries(descriptions)) {
     if (fieldName.includes(key)) return desc;
   }
   return '';
 }
 
 function getFieldUnit(fieldName: string): string {
   if (fieldName.includes('pio') || fieldName.includes('presion')) return 'mmHg';
   if (fieldName.includes('esfera') || fieldName.includes('cilindro') || fieldName.includes('add')) return 'D';
   if (fieldName.includes('eje')) return '°';
   if (fieldName.includes('cct') || fieldName.includes('paquimetria') || fieldName.includes('espesor')) return 'µm';
   if (fieldName.includes('diametro') || fieldName.includes('pupil')) return 'mm';
   if (fieldName.includes('queratometria') || fieldName.includes('flat') || fieldName.includes('steep')) return 'D';
   if (fieldName.includes('angulo') || fieldName.includes('kappa')) return '°';
   return '';
 }
 
 function getFieldStep(fieldName: string): number {
   if (fieldName.includes('esfera') || fieldName.includes('cilindro') || fieldName.includes('add')) return 0.25;
   if (fieldName.includes('eje')) return 1;
   if (fieldName.includes('pio') || fieldName.includes('presion')) return 1;
   if (fieldName.includes('cct') || fieldName.includes('paquimetria')) return 1;
   if (fieldName.includes('diametro') || fieldName.includes('pupil')) return 0.1;
   if (fieldName.includes('queratometria') || fieldName.includes('flat') || fieldName.includes('steep')) return 0.01;
   return 0.1;
 }