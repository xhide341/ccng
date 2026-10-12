-- Migration: Drop Routines and Routine Checkins

-- Drop tables and associated triggers/policies/indexes.
-- PostgreSQL automatically cleans up foreign keys (via cascade) and removes them from publications (supabase_realtime).
drop table if exists public.routine_checkins cascade;
drop table if exists public.routines cascade;
