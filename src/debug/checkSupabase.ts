import { supabase } from '../lib/supabase';

export async function checkSupabase() {
  try {
    const { data, error } = await supabase.from('tips').select('id').limit(1);
    console.log('SB health:', { rows: data?.length || 0, error });
    return { success: !error, data, error };
  } catch (err) {
    console.log('SB health:', { rows: 0, error: err });
    return { success: false, data: null, error: err };
  }
}