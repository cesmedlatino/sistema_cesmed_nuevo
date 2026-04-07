
-- Generate 100 more supplies products with varied categories
DO $$
DECLARE
  cat_rec RECORD;
  cat_ids uuid[];
  cat_names text[];
  cat_count int;
  i int;
  rand_cat_idx int;
  next_code int;
  product_names text[] := ARRAY[
    'Gasa Estéril', 'Algodón Hidrófilo', 'Vendaje Elástico', 'Esparadrapo Médico', 'Guantes Nitrilo',
    'Guantes Látex', 'Mascarilla N95', 'Mascarilla Quirúrgica', 'Jeringa 5ml', 'Jeringa 10ml',
    'Aguja Hipodérmica', 'Catéter Intravenoso', 'Equipo Venoclisis', 'Sonda Foley', 'Sonda Nasogástrica',
    'Bisturí Desechable', 'Sutura Nylon', 'Sutura Seda', 'Apósito Adhesivo', 'Apósito Transparente',
    'Alcohol Gel', 'Alcohol 70%', 'Agua Oxigenada', 'Yodopovidona', 'Clorhexidina',
    'Bata Desechable', 'Gorro Quirúrgico', 'Cubre Zapatos', 'Campo Estéril', 'Bolsa Colostomía',
    'Tubo Endotraqueal', 'Cánula Nasal', 'Nebulizador', 'Oxímetro Descartable', 'Termómetro Digital',
    'Tensiómetro', 'Estetoscopio', 'Otoscopio', 'Pinza Kelly', 'Pinza Mosquito',
    'Tijera Mayo', 'Tijera Metzenbaum', 'Porta Agujas', 'Separador Farabeuf', 'Mango Bisturí',
    'Riñonera Plástica', 'Cubeta Metálica', 'Tambor Acero', 'Bandeja Instrumental', 'Contenedor Punzocortante',
    'Detergente Enzimático', 'Desinfectante Superficies', 'Glutaraldehído', 'Hipoclorito Sodio', 'Esterilizante Químico',
    'Bolsa Roja Biocontaminado', 'Bolsa Negra', 'Bolsa Amarilla', 'Contenedor Residuos', 'Señalética Bioseguridad',
    'Cinta Testigo', 'Indicador Biológico', 'Indicador Químico', 'Papel Crepado', 'Sobre Esterilización',
    'Lanceta Seguridad', 'Tubo Vacutainer', 'Torniquete Látex', 'Algodón Torunda', 'Curita Adhesiva',
    'Micropore', 'Leucoplast', 'Venda Yeso', 'Férula Aluminio', 'Collar Cervical',
    'Camilla Portátil', 'Tabla Espinal', 'Inmovilizador Cabeza', 'Cinturón Araña', 'Bolsa Ambu',
    'Laringoscopio', 'Hoja Laringoscopio', 'Guedel', 'Máscara Laríngea', 'Cricotirotomía Kit',
    'Drenaje Torácico', 'Válvula Heimlich', 'Trampa Agua', 'Sello Pleural', 'Aspirador Secreciones',
    'Electrodos ECG', 'Gel Conductor', 'Papel ECG', 'Cable Paciente', 'Desfibrilador Parches',
    'Suero Fisiológico', 'Dextrosa 5%', 'Lactato Ringer', 'Solución Hartmann', 'Manitol'
  ];
  presentations text[] := ARRAY['Unidad', 'Caja x 10', 'Caja x 50', 'Caja x 100', 'Paquete', 'Rollo', 'Frasco 500ml', 'Galón', 'Bolsa'];
  locations text[] := ARRAY['Estante A1', 'Estante A2', 'Estante B1', 'Estante B2', 'Estante C1', 'Gaveta 1', 'Gaveta 2', 'Almacén Principal', 'Refrigerador'];
BEGIN
  -- Fetch active categories
  SELECT array_agg(id), array_agg(name) INTO cat_ids, cat_names
  FROM supplies_categories WHERE is_active = true;
  
  cat_count := array_length(cat_ids, 1);
  
  IF cat_count IS NULL OR cat_count = 0 THEN
    RAISE EXCEPTION 'No active supplies categories found';
  END IF;

  -- Get the next available code number
  SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '[^0-9]', '', 'g'), '')::int), 200) + 1
  INTO next_code
  FROM pharmacy_medications
  WHERE codigo LIKE 'P%';

  -- Insert 100 new products
  FOR i IN 1..100 LOOP
    rand_cat_idx := floor(random() * cat_count) + 1;
    
    INSERT INTO pharmacy_medications (
      codigo,
      descripcion,
      category,
      presentation,
      ubicacion,
      stock_actual,
      min_stock_level,
      purchase_price,
      precio_venta,
      status,
      laboratorio
    ) VALUES (
      'P' || (next_code + i - 1),
      product_names[((i - 1) % array_length(product_names, 1)) + 1] || ' ' || (floor(random() * 100) + 1)::text || 'u',
      cat_names[rand_cat_idx],
      presentations[floor(random() * array_length(presentations, 1)) + 1],
      locations[floor(random() * array_length(locations, 1)) + 1],
      floor(random() * 500)::int,
      floor(random() * 20 + 5)::int,
      round((random() * 50 + 5)::numeric, 2),
      round((random() * 80 + 10)::numeric, 2),
      'Activo',
      CASE floor(random() * 5)
        WHEN 0 THEN '3M Healthcare'
        WHEN 1 THEN 'Medline'
        WHEN 2 THEN 'Cardinal Health'
        WHEN 3 THEN 'B. Braun'
        ELSE 'Johnson & Johnson'
      END
    );
  END LOOP;
END $$;
