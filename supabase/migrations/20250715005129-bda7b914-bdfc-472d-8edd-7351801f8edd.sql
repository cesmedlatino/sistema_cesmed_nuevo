-- Agregar columna design_config a la tabla medical_record_templates
ALTER TABLE public.medical_record_templates 
ADD COLUMN design_config JSONB DEFAULT '{
  "theme": "modern",
  "colors": {
    "primary": "#5c1c8c",
    "secondary": "#7cc444", 
    "accent": "#e11d48",
    "background": "#ffffff",
    "text": "#1f2937"
  },
  "typography": {
    "headingFont": "Arial",
    "bodyFont": "Arial", 
    "fontSize": 14
  },
  "layout": {
    "spacing": 16,
    "borderRadius": 8,
    "shadowLevel": 1
  },
  "sections": []
}'::jsonb;