-- Make medical_record_id optional in supplies_attention_consumption table
-- This allows consumption records to be linked to appointments without requiring a medical record
ALTER TABLE public.supplies_attention_consumption 
ALTER COLUMN medical_record_id DROP NOT NULL;