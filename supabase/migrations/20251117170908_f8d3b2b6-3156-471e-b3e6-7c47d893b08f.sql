-- Add new columns to pharmacy_medications for cost calculations
ALTER TABLE pharmacy_medications
ADD COLUMN IF NOT EXISTS igv_unitario NUMERIC,
ADD COLUMN IF NOT EXISTS importe_unitario NUMERIC,
ADD COLUMN IF NOT EXISTS porcentaje_ganancia NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS importe_ganancia NUMERIC;