import { createClient } from '@supabase/supabase-js';

// Load environment variables for testing
require('dotenv').config();

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

describe('Supabase Connection', () => {
  test('Supabase is reachable with anon key', async () => {
    const { error } = await client.from('tips').select('*').limit(1);
    expect(error).toBeNull();
  });

  test('Can connect to substances table', async () => {
    const { error } = await client.from('substances').select('*').limit(1);
    expect(error).toBeNull();
  });

  test('Can connect to user_profiles table', async () => {
    const { error } = await client.from('user_profiles').select('*').limit(1);
    expect(error).toBeNull();
  });

  test('Environment variables are properly loaded', () => {
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.SUPABASE_URL).toContain('supabase.co');
    expect(process.env.SUPABASE_ANON_KEY).toMatch(/^eyJ/); // JWT format
  });
});