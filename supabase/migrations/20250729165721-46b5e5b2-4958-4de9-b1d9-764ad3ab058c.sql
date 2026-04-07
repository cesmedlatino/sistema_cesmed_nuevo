-- Crear política para permitir lectura de pagos
DROP POLICY IF EXISTS "Users can view pagos" ON pagos;
CREATE POLICY "Users can view pagos with joins"
ON pagos FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Asegurar que las tablas relacionadas tengan políticas de lectura
DROP POLICY IF EXISTS "Users can view concepto" ON concepto;
CREATE POLICY "Users can view concepto"
ON concepto FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view modalidad" ON modalidad;
CREATE POLICY "Users can view modalidad"
ON modalidad FOR SELECT
USING (auth.uid() IS NOT NULL);