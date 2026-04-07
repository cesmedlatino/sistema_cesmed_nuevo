-- Crear política para permitir lectura de pagos
DROP POLICY IF EXISTS "Users can view pagos" ON pagos;
CREATE POLICY "Users can view pagos with joins"
ON pagos FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Asegurar que las tablas relacionadas tengan políticas de lectura
DROP POLICY IF EXISTS "Users can view conceptos" ON conceptos;
CREATE POLICY "Users can view conceptos"
ON conceptos FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view modalidades_pago" ON modalidades_pago;
CREATE POLICY "Users can view modalidades_pago"
ON modalidades_pago FOR SELECT
USING (auth.uid() IS NOT NULL);