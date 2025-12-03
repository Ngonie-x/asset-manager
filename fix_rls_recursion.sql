-- Fix Infinite Recursion in RLS Policies
-- Run this in Supabase SQL Editor to fix the "infinite recursion detected in policy" error
-- This creates a SECURITY DEFINER function that bypasses RLS to check admin status

-- Step 1: Create a helper function to check if current user is admin
-- This function uses SECURITY DEFINER to bypass RLS, preventing infinite recursion
-- SECURITY DEFINER functions run with the privileges of the function owner (postgres superuser)
-- which should bypass RLS. However, to be absolutely sure, we'll query directly without RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Query with SECURITY DEFINER privileges should bypass RLS
  -- But to be extra safe, we'll use a direct query that the function owner can execute
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO result;
  
  RETURN COALESCE(result, false);
EXCEPTION
  WHEN OTHERS THEN
    -- If anything goes wrong, return false
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Step 2: Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;

-- Step 3: Create separate admin policies for each operation to avoid recursion
-- Admin SELECT policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT
    USING (public.is_admin());

-- Admin INSERT policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT
    WITH CHECK (public.is_admin());

-- Admin UPDATE policy
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admin DELETE policy
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE
    USING (public.is_admin());

-- Step 4: Update all other policies that check for admin status to use the helper function

-- Categories admin policy
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
    ON public.categories FOR ALL
    USING (public.is_admin());

-- Departments admin policy
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments"
    ON public.departments FOR ALL
    USING (public.is_admin());

-- Assets admin policies
DROP POLICY IF EXISTS "Admins can view all assets" ON public.assets;
CREATE POLICY "Admins can view all assets"
    ON public.assets FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete assets" ON public.assets;
CREATE POLICY "Admins can delete assets"
    ON public.assets FOR DELETE
    USING (public.is_admin());

-- Verification: Test the function (optional)
-- SELECT public.is_admin();
