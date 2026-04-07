-- Add category column to pharmacy_medications for supplies classification
ALTER TABLE public.pharmacy_medications 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_pharmacy_medications_category ON public.pharmacy_medications(category);

-- Comment on the column
COMMENT ON COLUMN public.pharmacy_medications.category IS 'Category for product classification: Material de curación, Material descartable, Instrumental menor, Insumos de limpieza, or null for regular medications';