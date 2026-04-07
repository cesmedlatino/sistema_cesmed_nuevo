-- Add IGV and Total a Pagar columns to invoice_headers
ALTER TABLE invoice_headers
ADD COLUMN igv numeric DEFAULT 0,
ADD COLUMN total_a_pagar numeric DEFAULT 0;