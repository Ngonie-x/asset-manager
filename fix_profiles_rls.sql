-- Fix RLS Policy for Profiles Table
-- Run this in Supabase SQL Editor to allow users to create their own profile

-- Add policy to allow users to insert their own profile
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- This allows users to create their own profile if it doesn't exist
-- The trigger should handle this automatically, but this policy ensures
-- the client-side code can also create it if needed
