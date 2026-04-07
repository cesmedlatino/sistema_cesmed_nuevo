-- Add number_of_boxes column to pharmacy_entries table
ALTER TABLE public.pharmacy_entries
ADD COLUMN IF NOT EXISTS number_of_boxes INTEGER DEFAULT 0;

-- Add comment to the column
COMMENT ON COLUMN public.pharmacy_entries.number_of_boxes IS 'Number of boxes received in this entry';