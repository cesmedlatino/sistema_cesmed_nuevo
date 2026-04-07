-- Política mejorada para permitir lectura de appointments con joins
DROP POLICY IF EXISTS "Users can view appointments" ON appointments;

CREATE POLICY "Users can view appointments with joins"
ON appointments FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Asegurar que las tablas relacionadas tengan políticas de lectura
DROP POLICY IF EXISTS "Users can view patients" ON patients;
CREATE POLICY "Users can view patients"
ON patients FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view specialists" ON specialists;
CREATE POLICY "Users can view specialists"
ON specialists FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view consulting_rooms" ON consulting_rooms;
CREATE POLICY "Users can view consulting_rooms"
ON consulting_rooms FOR SELECT
USING (auth.uid() IS NOT NULL);