import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

console.log("🔎 Checking Supabase Env Vars...");
console.log("SUPABASE_URL:", SUPABASE_URL ? "✅ Loaded" : "❌ Missing");
console.log("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✅ Loaded" : "❌ Missing");