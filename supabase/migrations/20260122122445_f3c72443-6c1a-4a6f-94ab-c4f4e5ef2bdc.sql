-- Tabla para categorías dinámicas del sistema de Suministros
CREATE TABLE IF NOT EXISTS public.supplies_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unicidad por nombre (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS supplies_categories_name_unique_ci
  ON public.supplies_categories (lower(name));

-- Trigger updated_at (reusa función existente si ya está creada)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'update_updated_at_column'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER AS $func$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql
    $sql$;
  END IF;
END $do$;

DROP TRIGGER IF EXISTS update_supplies_categories_updated_at ON public.supplies_categories;
CREATE TRIGGER update_supplies_categories_updated_at
BEFORE UPDATE ON public.supplies_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.supplies_categories ENABLE ROW LEVEL SECURITY;

-- Políticas: cualquier usuario autenticado puede ver y gestionar categorías
DROP POLICY IF EXISTS "Authenticated users can read supplies categories" ON public.supplies_categories;
CREATE POLICY "Authenticated users can read supplies categories"
ON public.supplies_categories
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert supplies categories" ON public.supplies_categories;
CREATE POLICY "Authenticated users can insert supplies categories"
ON public.supplies_categories
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update supplies categories" ON public.supplies_categories;
CREATE POLICY "Authenticated users can update supplies categories"
ON public.supplies_categories
FOR UPDATE
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete supplies categories" ON public.supplies_categories;
CREATE POLICY "Authenticated users can delete supplies categories"
ON public.supplies_categories
FOR DELETE
USING (auth.role() = 'authenticated');

-- Seed: categorías actuales (idempotente)
INSERT INTO public.supplies_categories (name)
SELECT v.name
FROM (VALUES
  ('Material de curación'),
  ('Material descartable'),
  ('Instrumental menor'),
  ('Insumos de limpieza')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.supplies_categories sc WHERE lower(sc.name) = lower(v.name)
);
