-- Enable Row Level Security on tips table and allow anonymous read access
-- Run this in your Supabase SQL Editor if you get 401/permission errors

alter table tips enable row level security;

create policy "anon can read tips" on tips for select to anon using (true);