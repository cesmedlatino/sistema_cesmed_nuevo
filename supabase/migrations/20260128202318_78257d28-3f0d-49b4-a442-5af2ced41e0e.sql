-- Drop the existing policy
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.pharmacy_medications;

-- Create separate policies for each operation
CREATE POLICY "Allow select for authenticated users" 
ON public.pharmacy_medications 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.pharmacy_medications 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON public.pharmacy_medications 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" 
ON public.pharmacy_medications 
FOR DELETE 
TO authenticated
USING (true);