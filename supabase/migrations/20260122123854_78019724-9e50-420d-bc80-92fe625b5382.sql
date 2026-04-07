-- Asegurar search_path fijo en update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Endurecer RLS de supplies_categories
DROP POLICY IF EXISTS "Authenticated users can insert supplies categories" ON public.supplies_categories;
CREATE POLICY "Admins can insert supplies categories"
ON public.supplies_categories
FOR INSERT
WITH CHECK (public.is_admin_by_role());

DROP POLICY IF EXISTS "Authenticated users can update supplies categories" ON public.supplies_categories;
CREATE POLICY "Admins can update supplies categories"
ON public.supplies_categories
FOR UPDATE
USING (public.is_admin_by_role());

DROP POLICY IF EXISTS "Authenticated users can delete supplies categories" ON public.supplies_categories;
CREATE POLICY "Admins can delete supplies categories"
ON public.supplies_categories
FOR DELETE
USING (public.is_admin_by_role());
