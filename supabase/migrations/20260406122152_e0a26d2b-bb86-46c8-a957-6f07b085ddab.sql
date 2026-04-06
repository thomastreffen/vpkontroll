-- Allow master admins to delete tenants
CREATE POLICY "Master admins can delete tenants"
ON public.tenants
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'master_admin'::app_role));