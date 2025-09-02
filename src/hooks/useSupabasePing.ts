import { useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../supabase'; // Using our clean supabase.ts

export function useSupabasePing() {
  useEffect(() => {
    (async () => {
      console.log('🔌 Supabase ping starting...');
      
      try {
        // Try to read from substances table (public data, should work for authenticated users)
        const { data, error } = await supabase
          .from('substances')
          .select('name, category')
          .limit(3);

        if (error) {
          console.log('❌ Supabase ping failed:', error.message);
          console.log('Error details:', error);
          Alert.alert('Supabase', `Ping failed: ${error.message}`);
        } else {
          console.log('✅ Supabase ping OK. Sample substances:', data);
          Alert.alert('Supabase', `Ping OK! Found ${data?.length || 0} substances`);
        }
      } catch (err) {
        console.log('❌ Supabase ping threw error:', (err as Error).message);
        Alert.alert('Supabase', `Connection error: ${(err as Error).message}`);
      }
    })();
  }, []);
}