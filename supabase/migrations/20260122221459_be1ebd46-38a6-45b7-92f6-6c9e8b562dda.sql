-- Create table for consulting room stock allocation
CREATE TABLE public.supplies_consulting_room_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consulting_room_id UUID NOT NULL REFERENCES public.consulting_rooms(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.pharmacy_medications(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(consulting_room_id, medication_id)
);

-- Create table for supplies outputs to consulting rooms (replaces comprobante-based outputs)
CREATE TABLE public.supplies_consulting_room_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  output_number VARCHAR(50) NOT NULL UNIQUE,
  consulting_room_id UUID NOT NULL REFERENCES public.consulting_rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  status VARCHAR(50) DEFAULT 'Pendiente',
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create table for output items (detail of each output)
CREATE TABLE public.supplies_consulting_room_output_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  output_id UUID NOT NULL REFERENCES public.supplies_consulting_room_outputs(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.pharmacy_medications(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  product_code VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for attention supplies consumption (links supplies to medical attentions)
CREATE TABLE public.supplies_attention_consumption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medical_record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.pharmacy_medications(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  tipo_atencion VARCHAR(100), -- 'Cita', 'Procedimiento', 'Atención'
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all new tables
ALTER TABLE public.supplies_consulting_room_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies_consulting_room_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies_consulting_room_output_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies_attention_consumption ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
CREATE POLICY "Authenticated users can manage consulting room stock"
ON public.supplies_consulting_room_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage consulting room outputs"
ON public.supplies_consulting_room_outputs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage output items"
ON public.supplies_consulting_room_output_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage attention consumption"
ON public.supplies_attention_consumption FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create trigger for updated_at on consulting room stock
CREATE TRIGGER update_supplies_consulting_room_stock_updated_at
BEFORE UPDATE ON public.supplies_consulting_room_stock
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on consulting room outputs
CREATE TRIGGER update_supplies_consulting_room_outputs_updated_at
BEFORE UPDATE ON public.supplies_consulting_room_outputs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();