-- Add entry_type column to pharmacy_entries table
ALTER TABLE pharmacy_entries 
ADD COLUMN entry_type text NOT NULL DEFAULT 'Entrada' CHECK (entry_type IN ('Entrada', 'Donación'));