ALTER TABLE public.optics_label_templates
ADD COLUMN catalog_target text NOT NULL DEFAULT 'optica'
CHECK (catalog_target IN ('optica', 'general'));