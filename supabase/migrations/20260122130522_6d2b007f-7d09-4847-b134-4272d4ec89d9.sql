-- Seed 100 random supplies into shared pharmacy_medications table
DO $$
DECLARE
  base_code integer;
BEGIN
  -- Determine next available numeric code for 'P' prefix
  SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '^P', ''), '')::int), 0)
  INTO base_code
  FROM public.pharmacy_medications
  WHERE codigo LIKE 'P%';

  INSERT INTO public.pharmacy_medications (
    codigo,
    descripcion,
    category,
    presentation,
    stock_actual,
    min_stock_level,
    purchase_price,
    porcentaje_ganancia,
    precio_venta,
    status,
    ubicacion,
    comentarios
  )
  SELECT
    'P' || (base_code + gs.i) AS codigo,
    -- Human-readable random-ish description
    (
      (ARRAY['Gasas','Guantes','Jeringa','Algodón','Venda','Bisturí','Mascarilla','Bata','Cinta','Solución','Esparadrapo','Tijera','Pinza','Compresa','Gorro','Cubrebocas'])[1 + floor(random()*16)::int]
      || ' '
      || (ARRAY['estéril','no estéril','quirúrgico','descartable','de curación','de limpieza','hospitalario','clínico'])[1 + floor(random()*8)::int]
      || ' '
      || (1000 + floor(random()*9000)::int)
    ) AS descripcion,
    (
      SELECT sc.name
      FROM public.supplies_categories sc
      WHERE sc.is_active
      ORDER BY random()
      LIMIT 1
    ) AS category,
    (ARRAY['Unidad','Caja','Paquete','Rollo','Frasco','Bolsa'])[1 + floor(random()*6)::int] AS presentation,
    floor(random()*201)::int AS stock_actual,
    (5 + floor(random()*26)::int) AS min_stock_level,
    round((1 + random()*99)::numeric, 2) AS purchase_price,
    round((10 + random()*60)::numeric, 2) AS porcentaje_ganancia,
    round(
      (1 + random()*99)::numeric * (1 + ((10 + random()*60)::numeric / 100)),
      2
    ) AS precio_venta,
    'Activo'::text AS status,
    (ARRAY['Almacén A','Almacén B','Gabinete 1','Gabinete 2','Cuarto de limpieza','Sala de procedimientos'])[1 + floor(random()*6)::int] AS ubicacion,
    'Generado automáticamente (seed)'::text AS comentarios
  FROM generate_series(1, 100) AS gs(i);
END $$;