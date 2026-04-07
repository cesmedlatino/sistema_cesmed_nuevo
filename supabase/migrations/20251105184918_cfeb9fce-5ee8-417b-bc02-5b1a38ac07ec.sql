-- Agregar columnas a pharmacy_outputs
ALTER TABLE pharmacy_outputs 
ADD COLUMN tipo_salida TEXT DEFAULT 'Salida por comprobante',
ADD COLUMN nro_comprobante TEXT,
ADD COLUMN patient_id UUID REFERENCES patients(id),
ADD COLUMN supplier_id UUID REFERENCES pharmacy_suppliers(id),
ADD COLUMN motivo_ajuste TEXT,
ADD COLUMN medications JSONB DEFAULT '[]'::jsonb;

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_pharmacy_outputs_patient_id ON pharmacy_outputs(patient_id);
CREATE INDEX idx_pharmacy_outputs_supplier_id ON pharmacy_outputs(supplier_id);
CREATE INDEX idx_pharmacy_outputs_tipo_salida ON pharmacy_outputs(tipo_salida);