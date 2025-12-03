-- Complete Fix for Infinite Recursion in RLS Policies
-- Run this in Supabase SQL Editor to fix the "infinite recursion detected in policy" error
-- This script will:
-- 1. Drop ALL existing policies that might cause recursion
-- 2. Create a SECURITY DEFINER function that bypasses RLS
-- 3. Recreate all policies using the helper function

-- ============================================================================
-- STEP 1: Drop ALL existing policies that query profiles table
-- ============================================================================

-- Drop all profiles policies
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Drop policies on other tables that query profiles
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can view all assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can delete assets" ON public.assets;

-- ============================================================================
-- STEP 2: Create helper function that bypasses RLS
-- ============================================================================

-- Create a SECURITY DEFINER function to check admin status
-- This function runs with postgres superuser privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- SECURITY DEFINER means this runs as the function owner (postgres)
  -- which has superuser privileges and bypasses RLS
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO result;
  
  RETURN COALESCE(result, false);
EXCEPTION
  WHEN OTHERS THEN
    -- If anything goes wrong, return false (fail closed)
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- ============================================================================
-- STEP 3: Recreate profiles policies (without recursion)
-- ============================================================================

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Admins can view all profiles (using helper function - no recursion)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT
    USING (public.is_admin());

-- Admins can insert profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT
    WITH CHECK (public.is_admin());

-- Admins can update all profiles
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admins can delete profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE
    USING (public.is_admin());

-- ============================================================================
-- STEP 4: Recreate policies for other tables
-- ============================================================================

-- Categories policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone" ON public.categories
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL
    USING (public.is_admin());

-- Departments policies
DROP POLICY IF EXISTS "Departments are viewable by everyone" ON public.departments;
CREATE POLICY "Departments are viewable by everyone" ON public.departments
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments" ON public.departments
    FOR ALL
    USING (public.is_admin());

-- Assets policies
DROP POLICY IF EXISTS "Users can view own assets" ON public.assets;
CREATE POLICY "Users can view own assets" ON public.assets
    FOR SELECT
    USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can create own assets" ON public.assets;
CREATE POLICY "Users can create own assets" ON public.assets
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can view all assets" ON public.assets;
CREATE POLICY "Admins can view all assets" ON public.assets
    FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete assets" ON public.assets;
CREATE POLICY "Admins can delete assets" ON public.assets
    FOR DELETE
    USING (public.is_admin());

-- ============================================================================
-- VERIFICATION (optional - uncomment to test)
-- ============================================================================

-- Test the function (should return true if you're an admin, false otherwise)
-- SELECT public.is_admin();

-- Check all policies are created
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;
