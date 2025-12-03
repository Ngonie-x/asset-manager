-- Diagnostic script to check current RLS policies
-- Run this in Supabase SQL Editor to see what policies currently exist

-- Check if is_admin function exists
SELECT 
    'Function Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'is_admin' 
            AND pronamespace = 'public'::regnamespace
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as status,
    '' as details
UNION ALL
SELECT 
    'Function Details' as check_type,
    'INFO' as status,
    'Function: ' || proname || ', Security: ' || prosecdef::text || ', Language: ' || prolang::regproc::text
FROM pg_proc 
WHERE proname = 'is_admin' 
AND pronamespace = 'public'::regnamespace
UNION ALL
-- List all policies on profiles table
SELECT 
    'Profiles Policies' as check_type,
    policyname as status,
    'Command: ' || cmd::text || ', Using: ' || COALESCE(qual::text, 'NULL') || ', With Check: ' || COALESCE(with_check::text, 'NULL')
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
UNION ALL
-- List all policies that query profiles (check for direct queries)
SELECT 
    'Policies Querying Profiles' as check_type,
    tablename || '.' || policyname as status,
    'Query: ' || COALESCE(qual::text, with_check::text, 'N/A')
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
    qual::text LIKE '%profiles%' 
    OR with_check::text LIKE '%profiles%'
    OR qual::text LIKE '%FROM public.profiles%'
    OR with_check::text LIKE '%FROM public.profiles%'
)
ORDER BY check_type, status;
