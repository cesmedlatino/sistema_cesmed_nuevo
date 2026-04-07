-- Create pharmacy_entries table (Entradas)
CREATE TABLE public.pharmacy_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.pharmacy_suppliers(id),
  invoice_number TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  num_boxes INTEGER,
  medication_id UUID REFERENCES public.pharmacy_medications(id),
  product_code TEXT,
  description TEXT,
  pharmaceutical_form TEXT,
  laboratory TEXT,
  batch TEXT,
  nsoc_rs TEXT,
  expiry_date DATE,
  presentation TEXT,
  quantity_requested INTEGER,
  quantity_received INTEGER,
  is_accepted BOOLEAN,
  observations TEXT,
  purchase_cost_per_unit NUMERIC,
  payment_type TEXT, -- 'Credito' or 'Contado'
  total_amount NUMERIC,
  invoice_due_date DATE,
  payment_status TEXT DEFAULT 'Pendiente', -- 'Pendiente' or 'Cancelado'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Create pharmacy_outputs table (Salidas)
CREATE TABLE public.pharmacy_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  medication_id UUID REFERENCES public.pharmacy_medications(id),
  product_code TEXT,
  description TEXT,
  quantity INTEGER NOT NULL,
  sale_cost_per_unit NUMERIC,
  total NUMERIC,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.pharmacy_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_outputs ENABLE ROW LEVEL SECURITY;

-- Create policies for pharmacy_entries
CREATE POLICY "Allow all for authenticated users on pharmacy_entries"
ON public.pharmacy_entries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policies for pharmacy_outputs
CREATE POLICY "Allow all for authenticated users on pharmacy_outputs"
ON public.pharmacy_outputs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_pharmacy_entries_date ON public.pharmacy_entries(date);
CREATE INDEX idx_pharmacy_entries_supplier ON public.pharmacy_entries(supplier_id);
CREATE INDEX idx_pharmacy_entries_medication ON public.pharmacy_entries(medication_id);
CREATE INDEX idx_pharmacy_outputs_date ON public.pharmacy_outputs(date);
CREATE INDEX idx_pharmacy_outputs_medication ON public.pharmacy_outputs(medication_id);