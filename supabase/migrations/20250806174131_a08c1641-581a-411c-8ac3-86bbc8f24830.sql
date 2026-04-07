-- Create CRefract02 template for ophthalmology
INSERT INTO medical_record_templates (
  name,
  specialty_id,
  is_active,
  header_config,
  body_config,
  footer_config,
  design_config
) VALUES (
  'CRefract02',
  (SELECT id FROM medical_specialties WHERE name ILIKE '%oftalmolog%' LIMIT 1),
  true,
  '{
    "title": "HISTORIA CLÍNICA OFTALMOLÓGICA - REFRACCIÓN",
    "record_number_prefix": "CRef",
    "record_number_zeros": 6
  }',
  '[
    {
      "id": "filiacion",
      "title": "FILIACIÓN",
      "roman_numeral": "I",
      "fields": [
        {"id": "nombre", "name": "Nombre", "type": "text_short", "required": true, "width": 50},
        {"id": "apellidos", "name": "Apellidos", "type": "text_short", "required": true, "width": 50},
        {"id": "edad", "name": "Edad", "type": "text_short", "required": false, "width": 25},
        {"id": "sexo", "name": "Sexo", "type": "select", "required": false, "width": 25, "options": ["Masculino", "Femenino"]},
        {"id": "fecha_nacimiento", "name": "Fecha de Nacimiento", "type": "date", "required": false, "width": 50},
        {"id": "estado_civil", "name": "Estado Civil", "type": "select", "required": false, "width": 50, "options": ["Soltero", "Casado", "Divorciado", "Viudo"]},
        {"id": "ocupacion", "name": "Ocupación", "type": "text_short", "required": false, "width": 50},
        {"id": "telefono", "name": "Teléfono", "type": "text_short", "required": false, "width": 50},
        {"id": "direccion", "name": "Dirección", "type": "text_medium", "required": false, "width": 100}
      ]
    },
    {
      "id": "metodo_correccion",
      "title": "MÉTODO DE CORRECCIÓN",
      "roman_numeral": "II",
      "fields": [
        {"id": "lensometria_od_esfera", "name": "LENSOMETRÍA OD Esfera", "type": "text_short", "required": false, "width": 12.5},
        {"id": "lensometria_od_cilindro", "name": "LENSOMETRÍA OD Cilindro", "type": "text_short", "required": false, "width": 12.5},
        {"id": "lensometria_od_eje", "name": "LENSOMETRÍA OD Eje", "type": "text_short", "required": false, "width": 12.5},
        {"id": "lensometria_od_av", "name": "LENSOMETRÍA OD AV", "type": "text_short", "required": false, "width": 12.5},
        {"id": "lensometria_oi_esfera", "name": "LENSOMETRÍA OI Esfera", "type": "text_short", "required": false, "width": 12.5},
        {"id": "lensometria_oi_cilindro", "name": "LENSOMETRÍA OI Cilindro", "type": "text_short", "required": false, "width": 12.5},
        {"id": "lensometria_oi_eje", "name": "LENSOMETRÍA OI Eje", "type": "text_short", "required": false, "width": 12.5},
        {"id": "lensometria_oi_av", "name": "LENSOMETRÍA OI AV", "type": "text_short", "required": false, "width": 12.5},
        {"id": "aberrometro_od_esfera", "name": "ABERROMETRO OSIRIS OD Esfera", "type": "text_short", "required": false, "width": 12.5},
        {"id": "aberrometro_od_cilindro", "name": "ABERROMETRO OSIRIS OD Cilindro", "type": "text_short", "required": false, "width": 12.5},
        {"id": "aberrometro_od_eje", "name": "ABERROMETRO OSIRIS OD Eje", "type": "text_short", "required": false, "width": 12.5},
        {"id": "aberrometro_od_av", "name": "ABERROMETRO OSIRIS OD AV", "type": "text_short", "required": false, "width": 12.5},
        {"id": "aberrometro_oi_esfera", "name": "ABERROMETRO OSIRIS OI Esfera", "type": "text_short", "required": false, "width": 12.5},
        {"id": "aberrometro_oi_cilindro", "name": "ABERROMETRO OSIRIS OI Cilindro", "type": "text_short", "required": false, "width": 12.5},
        {"id": "aberrometro_oi_eje", "name": "ABERROMETRO OSIRIS OI Eje", "type": "text_short", "required": false, "width": 12.5},
        {"id": "aberrometro_oi_av", "name": "ABERROMETRO OSIRIS OI AV", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_manifiesta_od_esfera", "name": "REFRACCIÓN MANIFIESTA OD Esfera", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_manifiesta_od_cilindro", "name": "REFRACCIÓN MANIFIESTA OD Cilindro", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_manifiesta_od_eje", "name": "REFRACCIÓN MANIFIESTA OD Eje", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_manifiesta_od_av", "name": "REFRACCIÓN MANIFIESTA OD AV", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_manifiesta_oi_esfera", "name": "REFRACCIÓN MANIFIESTA OI Esfera", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_manifiesta_oi_cilindro", "name": "REFRACCIÓN MANIFIESTA OI Cilindro", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_manifiesta_oi_eje", "name": "REFRACCIÓN MANIFIESTA OI Eje", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_manifiesta_oi_av", "name": "REFRACCIÓN MANIFIESTA OI AV", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_cicloplejia_od_esfera", "name": "REFRACCIÓN CON CICLOPLEJIA OD Esfera", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_cicloplejia_od_cilindro", "name": "REFRACCIÓN CON CICLOPLEJIA OD Cilindro", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_cicloplejia_od_eje", "name": "REFRACCIÓN CON CICLOPLEJIA OD Eje", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_cicloplejia_od_av", "name": "REFRACCIÓN CON CICLOPLEJIA OD AV", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_cicloplejia_oi_esfera", "name": "REFRACCIÓN CON CICLOPLEJIA OI Esfera", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_cicloplejia_oi_cilindro", "name": "REFRACCIÓN CON CICLOPLEJIA OI Cilindro", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_cicloplejia_oi_eje", "name": "REFRACCIÓN CON CICLOPLEJIA OI Eje", "type": "text_short", "required": false, "width": 12.5},
        {"id": "refraccion_cicloplejia_oi_av", "name": "REFRACCIÓN CON CICLOPLEJIA OI AV", "type": "text_short", "required": false, "width": 12.5}
      ]
    },
    {
      "id": "queratometria",
      "title": "QUERATOMETRIA",
      "roman_numeral": "III",
      "fields": [
        {"id": "queratometria_flat_k_od", "name": "FLAT K OD (D)", "type": "text_short", "required": false, "width": 25},
        {"id": "queratometria_flat_k_oi", "name": "FLAT K OI (D)", "type": "text_short", "required": false, "width": 25},
        {"id": "queratometria_steep_k_od", "name": "STEEP K OD (D)", "type": "text_short", "required": false, "width": 25},
        {"id": "queratometria_steep_k_oi", "name": "STEEP K OI (D)", "type": "text_short", "required": false, "width": 25}
      ]
    },
    {
      "id": "diametro_pupilar",
      "title": "DIÁMETRO PUPILAR ESCOTÓPICA",
      "roman_numeral": "IV",
      "fields": [
        {"id": "diametro_pupilar_od", "name": "OD (mm)", "type": "text_short", "required": false, "width": 50},
        {"id": "diametro_pupilar_oi", "name": "OI (mm)", "type": "text_short", "required": false, "width": 50}
      ]
    },
    {
      "id": "angulo_kappa",
      "title": "ÁNGULO KAPPA",
      "roman_numeral": "V",
      "fields": [
        {"id": "angulo_kappa_od", "name": "OD (mm)", "type": "text_short", "required": false, "width": 50},
        {"id": "angulo_kappa_oi", "name": "OI (mm)", "type": "text_short", "required": false, "width": 50}
      ]
    },
    {
      "id": "cct",
      "title": "CCT",
      "roman_numeral": "VI",
      "fields": [
        {"id": "cct_od", "name": "OD (um)", "type": "text_short", "required": false, "width": 50},
        {"id": "cct_oi", "name": "OI (um)", "type": "text_short", "required": false, "width": 50}
      ]
    },
    {
      "id": "z4_0",
      "title": "Z4,0",
      "roman_numeral": "VII",
      "fields": [
        {"id": "z4_0_od", "name": "OD", "type": "text_short", "required": false, "width": 50},
        {"id": "z4_0_oi", "name": "OI", "type": "text_short", "required": false, "width": 50}
      ]
    },
    {
      "id": "w_w",
      "title": "W-W",
      "roman_numeral": "VIII",
      "fields": [
        {"id": "w_w_od", "name": "OD (mm)", "type": "text_short", "required": false, "width": 50},
        {"id": "w_w_oi", "name": "OI (mm)", "type": "text_short", "required": false, "width": 50}
      ]
    },
    {
      "id": "anillo_vacio",
      "title": "ANILLO DE VACÍO ml 7",
      "roman_numeral": "IX",
      "fields": [
        {"id": "anillo_vacio_od", "name": "OD", "type": "text_short", "required": false, "width": 50},
        {"id": "anillo_vacio_oi", "name": "OI", "type": "text_short", "required": false, "width": 50}
      ]
    },
    {
      "id": "refraccion_final",
      "title": "REFRACCIÓN FINAL A CORREGIR",
      "roman_numeral": "X",
      "fields": [
        {"id": "refraccion_final_od_esfera", "name": "OD Esfera", "type": "text_short", "required": false, "width": 25},
        {"id": "refraccion_final_od_cilindro", "name": "OD Cilindro", "type": "text_short", "required": false, "width": 25},
        {"id": "refraccion_final_od_eje", "name": "OD Eje", "type": "text_short", "required": false, "width": 25},
        {"id": "refraccion_final_oi_esfera", "name": "OI Esfera", "type": "text_short", "required": false, "width": 25},
        {"id": "refraccion_final_oi_cilindro", "name": "OI Cilindro", "type": "text_short", "required": false, "width": 25},
        {"id": "refraccion_final_oi_eje", "name": "OI Eje", "type": "text_short", "required": false, "width": 25}
      ]
    }
  ]',
  '{"text": "Dr. Especialista en Oftalmología\nColegio Médico del Perú"}',
  '{
    "theme": "medical",
    "colors": {
      "primary": "#1e40af",
      "secondary": "#3b82f6",
      "accent": "#06b6d4",
      "background": "#ffffff",
      "text": "#1f2937"
    },
    "typography": {
      "headingFont": "Arial",
      "bodyFont": "Arial",
      "fontSize": 12
    },
    "layout": {
      "spacing": 8,
      "borderRadius": 4,
      "shadowLevel": 1
    },
    "sections": []
  }'
);