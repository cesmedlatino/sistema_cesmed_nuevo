
-- Crear el bucket para almacenar las imágenes de las plantillas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-images',
  'template-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Crear políticas de seguridad para el bucket template-images
CREATE POLICY "Allow authenticated users to upload template images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'template-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow public access to template images"
ON storage.objects FOR SELECT
USING (bucket_id = 'template-images');

CREATE POLICY "Allow authenticated users to update their template images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'template-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated users to delete template images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'template-images' 
  AND auth.uid() IS NOT NULL
);
