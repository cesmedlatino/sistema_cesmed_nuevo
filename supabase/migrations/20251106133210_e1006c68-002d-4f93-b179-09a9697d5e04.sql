-- Permitir valores nulos en modalidad_id y tipo_confirmacion para pagos pendientes
ALTER TABLE pagos 
  ALTER COLUMN modalidad_id DROP NOT NULL,
  ALTER COLUMN tipo_confirmacion DROP NOT NULL;