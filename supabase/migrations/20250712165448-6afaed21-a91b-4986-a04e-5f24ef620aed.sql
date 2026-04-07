-- Actualizar caracteres mal codificados en la tabla patients
-- Reemplazar � con ñ en todos los campos de texto

UPDATE public.patients 
SET 
  first_name = REPLACE(first_name, '�', 'ñ'),
  last_name = REPLACE(last_name, '�', 'ñ'),
  address = REPLACE(address, '�', 'ñ'),
  emergency_contact_name = REPLACE(emergency_contact_name, '�', 'ñ')
WHERE 
  first_name LIKE '%�%' OR 
  last_name LIKE '%�%' OR 
  address LIKE '%�%' OR 
  emergency_contact_name LIKE '%�%';

-- También actualizar otros caracteres mal codificados comunes
UPDATE public.patients 
SET 
  first_name = REPLACE(REPLACE(REPLACE(first_name, 'Ã±', 'ñ'), 'Ã¡', 'á'), 'Ã©', 'é'),
  last_name = REPLACE(REPLACE(REPLACE(last_name, 'Ã±', 'ñ'), 'Ã¡', 'á'), 'Ã©', 'é'),
  address = REPLACE(REPLACE(REPLACE(address, 'Ã±', 'ñ'), 'Ã¡', 'á'), 'Ã©', 'é'),
  emergency_contact_name = REPLACE(REPLACE(REPLACE(emergency_contact_name, 'Ã±', 'ñ'), 'Ã¡', 'á'), 'Ã©', 'é')
WHERE 
  first_name LIKE '%Ã±%' OR first_name LIKE '%Ã¡%' OR first_name LIKE '%Ã©%' OR
  last_name LIKE '%Ã±%' OR last_name LIKE '%Ã¡%' OR last_name LIKE '%Ã©%' OR
  address LIKE '%Ã±%' OR address LIKE '%Ã¡%' OR address LIKE '%Ã©%' OR
  emergency_contact_name LIKE '%Ã±%' OR emergency_contact_name LIKE '%Ã¡%' OR emergency_contact_name LIKE '%Ã©%';