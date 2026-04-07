-- Drop the old SELECT policy
DROP POLICY IF EXISTS "Users can view their own optics label templates" ON public.optics_label_templates;

-- Create new SELECT policy that includes public templates
CREATE POLICY "Users can view own or public optics label templates" 
ON public.optics_label_templates 
FOR SELECT 
TO authenticated
USING (auth.uid() = created_by OR is_public = true);