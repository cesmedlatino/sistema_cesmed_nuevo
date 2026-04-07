
-- Crear tabla de proveedores de medicamentos
CREATE TABLE public.pharmacy_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  status TEXT DEFAULT 'Activo' CHECK (status IN ('Activo', 'Inactivo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Crear tabla de medicamentos
CREATE TABLE public.pharmacy_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commercial_name TEXT NOT NULL,
  active_ingredient TEXT NOT NULL,
  presentation TEXT NOT NULL, -- tabletas, jarabe, cápsulas, etc.
  concentration TEXT NOT NULL, -- mg, %, ml, etc.
  barcode TEXT UNIQUE,
  supplier_id UUID REFERENCES public.pharmacy_suppliers(id),
  batch_number TEXT NOT NULL,
  expiration_date DATE NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 10,
  purchase_price DECIMAL(10,2) NOT NULL,
  reference_sale_price DECIMAL(10,2),
  days_before_expiry_alert INTEGER DEFAULT 30,
  status TEXT DEFAULT 'Activo' CHECK (status IN ('Activo', 'Inactivo', 'Vencido')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Crear tabla de movimientos de inventario
CREATE TABLE public.pharmacy_inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID NOT NULL REFERENCES public.pharmacy_medications(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('Entrada', 'Salida')),
  movement_reason TEXT NOT NULL CHECK (movement_reason IN ('Compra', 'Reposición', 'Uso Interno', 'Devolución', 'Venta Externa', 'Vencimiento', 'Pérdida', 'Ajuste')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  observations TEXT,
  reference_document TEXT, -- número de factura, orden, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_pharmacy_medications_barcode ON public.pharmacy_medications(barcode);
CREATE INDEX idx_pharmacy_medications_expiration ON public.pharmacy_medications(expiration_date);
CREATE INDEX idx_pharmacy_medications_stock ON public.pharmacy_medications(stock_quantity);
CREATE INDEX idx_pharmacy_inventory_movements_medication ON public.pharmacy_inventory_movements(medication_id);
CREATE INDEX idx_pharmacy_inventory_movements_date ON public.pharmacy_inventory_movements(created_at);

-- Crear función para generar código de medicamento automáticamente
CREATE OR REPLACE FUNCTION public.generate_medication_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'MED-' || LPAD((FLOOR(RANDOM() * 999999) + 1)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM pharmacy_medications WHERE barcode = new_code) INTO code_exists;
        IF NOT code_exists THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN new_code;
END;
$$;

-- Crear trigger para generar código automáticamente si no se proporciona
CREATE OR REPLACE FUNCTION public.set_medication_barcode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.barcode IS NULL OR NEW.barcode = '' THEN
    NEW.barcode := generate_medication_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_medication_barcode_trigger
  BEFORE INSERT ON public.pharmacy_medications
  FOR EACH ROW
  EXECUTE FUNCTION set_medication_barcode();

-- Crear función para obtener medicamentos con alertas
CREATE OR REPLACE FUNCTION public.get_pharmacy_alerts()
RETURNS TABLE(
  medication_id UUID,
  commercial_name TEXT,
  alert_type TEXT,
  current_stock INTEGER,
  min_stock_level INTEGER,
  expiration_date DATE,
  days_to_expiry INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as medication_id,
    m.commercial_name,
    CASE 
      WHEN m.stock_quantity <= m.min_stock_level THEN 'Stock Bajo'
      WHEN (m.expiration_date - CURRENT_DATE) <= m.days_before_expiry_alert THEN 'Próximo a Vencer'
      ELSE 'Normal'
    END as alert_type,
    m.stock_quantity as current_stock,
    m.min_stock_level,
    m.expiration_date,
    (m.expiration_date - CURRENT_DATE)::INTEGER as days_to_expiry
  FROM public.pharmacy_medications m
  WHERE m.status = 'Activo'
  AND (
    m.stock_quantity <= m.min_stock_level 
    OR (m.expiration_date - CURRENT_DATE) <= m.days_before_expiry_alert
  )
  ORDER BY 
    CASE WHEN m.stock_quantity <= m.min_stock_level THEN 1 ELSE 2 END,
    m.expiration_date ASC;
END;
$$;

-- Crear función para obtener estadísticas del inventario
CREATE OR REPLACE FUNCTION public.get_pharmacy_stats()
RETURNS TABLE(
  total_medications BIGINT,
  low_stock_count BIGINT,
  near_expiry_count BIGINT,
  total_inventory_value DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.pharmacy_medications WHERE status = 'Activo') as total_medications,
    (SELECT COUNT(*) FROM public.pharmacy_medications WHERE status = 'Activo' AND stock_quantity <= min_stock_level) as low_stock_count,
    (SELECT COUNT(*) FROM public.pharmacy_medications WHERE status = 'Activo' AND (expiration_date - CURRENT_DATE) <= days_before_expiry_alert) as near_expiry_count,
    (SELECT COALESCE(SUM(stock_quantity * purchase_price), 0) FROM public.pharmacy_medications WHERE status = 'Activo') as total_inventory_value;
END;
$$;

-- Habilitar RLS en las tablas
ALTER TABLE public.pharmacy_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory_movements ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS básicas (permitir todo a usuarios autenticados por ahora)
CREATE POLICY "Allow all for authenticated users" ON public.pharmacy_suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.pharmacy_medications FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.pharmacy_inventory_movements FOR ALL TO authenticated USING (true);
