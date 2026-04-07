
ALTER TABLE public.pharmacy_inventory_movements 
DROP CONSTRAINT pharmacy_inventory_movements_movement_reason_check;

ALTER TABLE public.pharmacy_inventory_movements 
ADD CONSTRAINT pharmacy_inventory_movements_movement_reason_check 
CHECK (movement_reason = ANY (ARRAY[
  'Compra', 'Reposición', 'Uso Interno', 'Devolución', 
  'Venta Externa', 'Vencimiento', 'Pérdida', 'Ajuste',
  'Ajuste Manual', 'Venta', 'Entrada', 'Donación',
  'Salida por comprobante', 'Salida por ajuste', 'Salida por merma',
  'Salida por devolución', 'Salida por transferencia', 'Salida por consumo interno',
  'Transferencia', 'Otro'
]));
