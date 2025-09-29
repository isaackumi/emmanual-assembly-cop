-- Debug script to identify ALL possible sources of recursion
-- Migration: 011_debug_recursion.sql

-- First, let's see what triggers exist
SELECT 
    schemaname,
    tablename,
    triggername,
    triggerdef
FROM pg_triggers 
WHERE schemaname = 'public'
ORDER BY tablename, triggername;

-- Check what functions exist that might cause recursion
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname LIKE '%profile%' 
   OR proname LIKE '%completion%'
   OR proname LIKE '%update%';

-- Check what policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check for any constraints that might cause updates
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('app_users', 'members')
ORDER BY tc.table_name, tc.constraint_type;

-- Check for any rules that might cause recursion
SELECT 
    schemaname,
    tablename,
    rulename,
    definition
FROM pg_rules 
WHERE schemaname = 'public'
ORDER BY tablename, rulename;
