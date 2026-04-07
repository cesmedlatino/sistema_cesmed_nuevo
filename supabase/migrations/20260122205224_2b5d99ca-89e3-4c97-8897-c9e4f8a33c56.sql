-- Add RUC and Razon Social columns to pharmacy_suppliers table
ALTER TABLE public.pharmacy_suppliers 
ADD COLUMN IF NOT EXISTS ruc text,
ADD COLUMN IF NOT EXISTS razon_social text;