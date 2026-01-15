
-- Create a function to check if any super admin exists (callable without auth)
CREATE OR REPLACE FUNCTION public.has_any_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE is_super_admin = TRUE
  )
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.has_any_super_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.has_any_super_admin() TO authenticated;
