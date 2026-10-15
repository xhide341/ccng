-- Migration: Add discord_webhook_url to spaces table
alter table public.spaces add column if not exists discord_webhook_url text default null;
