-- =====================================================
-- SISTEMA DE ÓPTICA - TABLAS PRINCIPALES
-- =====================================================

-- Tabla de productos de óptica
CREATE TABLE public.optics_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'montura', 'lentes_contacto', 'lentes_graduados', 'gafas_sol', 'accesorio'
  marca TEXT,
  modelo TEXT,
  descripcion TEXT,
  precio_compra NUMERIC DEFAULT 0,
  precio_venta NUMERIC DEFAULT 0,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER DEFAULT 5,
  ubicacion TEXT,
  proveedor_id UUID REFERENCES public.pharmacy_suppliers(id),
  imagen_url TEXT,
  -- Campos específicos para monturas
  material TEXT,
  color TEXT,
  tamanio TEXT,
  genero TEXT, -- 'masculino', 'femenino', 'unisex', 'nino'
  -- Campos específicos para lentes
  indice_refraccion TEXT,
  tratamiento TEXT, -- 'antirreflejo', 'fotocromático', 'blue_block', etc.
  tipo_lente TEXT, -- 'monofocal', 'bifocal', 'progresivo'
  -- Metadatos
  fecha_ingreso DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Activo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Tabla de entradas de productos ópticos
CREATE TABLE public.optics_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_id UUID REFERENCES public.optics_products(id),
  product_code TEXT,
  description TEXT,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  purchase_cost_per_unit NUMERIC DEFAULT 0,
  importe NUMERIC DEFAULT 0,
  invoice_number TEXT,
  invoice_due_date DATE,
  payment_status TEXT DEFAULT 'Pendiente',
  payment_type TEXT,
  supplier_id UUID REFERENCES public.pharmacy_suppliers(id),
  lote TEXT,
  observations TEXT,
  entry_type TEXT DEFAULT 'Entrada',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Tabla de salidas de productos ópticos
CREATE TABLE public.optics_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_id UUID REFERENCES public.optics_products(id),
  product_code TEXT,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  sale_cost_per_unit NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  nro_comprobante TEXT,
  tipo_salida TEXT DEFAULT 'Venta',
  motivo_ajuste TEXT,
  patient_id UUID REFERENCES public.patients(id),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Tabla de movimientos de inventario óptico
CREATE TABLE public.optics_inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.optics_products(id),
  movement_type TEXT NOT NULL, -- 'entrada', 'salida', 'ajuste'
  movement_reason TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  reference_document TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX idx_optics_products_codigo ON public.optics_products(codigo);
CREATE INDEX idx_optics_products_tipo ON public.optics_products(tipo);
CREATE INDEX idx_optics_products_marca ON public.optics_products(marca);
CREATE INDEX idx_optics_products_status ON public.optics_products(status);
CREATE INDEX idx_optics_entries_date ON public.optics_entries(date);
CREATE INDEX idx_optics_entries_product_id ON public.optics_entries(product_id);
CREATE INDEX idx_optics_outputs_date ON public.optics_outputs(date);
CREATE INDEX idx_optics_outputs_product_id ON public.optics_outputs(product_id);
CREATE INDEX idx_optics_movements_product_id ON public.optics_inventory_movements(product_id);

-- =====================================================
-- FUNCIONES
-- =====================================================

-- Función para generar código único de producto óptico
CREATE OR REPLACE FUNCTION public.generate_optics_product_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  new_code TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 3) AS INTEGER)), 0) + 1
  INTO counter
  FROM optics_products
  WHERE codigo ~ '^OP[0-9]+$';
  
  new_code := 'OP' || LPAD(counter::TEXT, 6, '0');
  RETURN new_code;
END;
$$;

-- Trigger para auto-generar código
CREATE OR REPLACE FUNCTION public.set_optics_product_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := generate_optics_product_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_optics_product_code_trigger
  BEFORE INSERT ON public.optics_products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_optics_product_code();

-- Función para recalcular stock de producto óptico
CREATE OR REPLACE FUNCTION public.recalculate_optics_stock(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total_entrada INTEGER;
  v_total_salida INTEGER;
  v_stock_actual INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity_received), 0) INTO v_total_entrada
  FROM optics_entries
  WHERE product_id = p_product_id;
  
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_salida
  FROM optics_outputs
  WHERE product_id = p_product_id;
  
  v_stock_actual := v_total_entrada - v_total_salida;
  
  UPDATE optics_products
  SET 
    stock_actual = v_stock_actual,
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$$;

-- Triggers para recalcular stock automáticamente
CREATE OR REPLACE FUNCTION public.trigger_recalculate_optics_stock_on_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.product_id IS NOT NULL THEN
      PERFORM recalculate_optics_stock(OLD.product_id);
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.product_id IS NOT NULL THEN
      PERFORM recalculate_optics_stock(NEW.product_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER recalculate_optics_stock_on_entry
  AFTER INSERT OR UPDATE OR DELETE ON public.optics_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalculate_optics_stock_on_entry();

CREATE OR REPLACE FUNCTION public.trigger_recalculate_optics_stock_on_output()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.product_id IS NOT NULL THEN
      PERFORM recalculate_optics_stock(OLD.product_id);
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.product_id IS NOT NULL THEN
      PERFORM recalculate_optics_stock(NEW.product_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER recalculate_optics_stock_on_output
  AFTER INSERT OR UPDATE OR DELETE ON public.optics_outputs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalculate_optics_stock_on_output();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_optics_products_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_optics_products_updated_at
  BEFORE UPDATE ON public.optics_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_optics_products_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.optics_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optics_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optics_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optics_inventory_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para optics_products
CREATE POLICY "Allow all for authenticated users on optics_products"
  ON public.optics_products
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para optics_entries
CREATE POLICY "Allow all for authenticated users on optics_entries"
  ON public.optics_entries
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para optics_outputs
CREATE POLICY "Allow all for authenticated users on optics_outputs"
  ON public.optics_outputs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para optics_inventory_movements
CREATE POLICY "Allow all for authenticated users on optics_movements"
  ON public.optics_inventory_movements
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);