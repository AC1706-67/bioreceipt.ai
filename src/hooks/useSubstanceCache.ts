import { useState, useEffect } from 'react';
import { Database } from '../config/supabase';
import { substanceDatabase } from '../services/substance/substanceDatabase';
import { getCachedSubstances, setCachedSubstances } from '../services/substanceCacheService';

type Substance = Database['public']['Tables']['substances']['Row'] & {
  substance_categories: { id: string; name: string };
};

export function useSubstanceCache(): {
  substances: Substance[] | null;
  loading: boolean;
  error?: Error;
} {
  const [substances, setSubstances] = useState<Substance[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    const loadSubstances = async () => {
      setLoading(true);
      setError(undefined);

      try {
        // Try cache first
        const cached = await getCachedSubstances();
        if (cached) {
          setSubstances(cached);
        }

        // Always fetch fresh data in background
        const result = await substanceDatabase.getSupabaseSubstances();
        
        if (result.success && result.data) {
          setSubstances(result.data);
          await setCachedSubstances(result.data);
        } else {
          throw new Error(result.error || 'Failed to load substances');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        
        // If we have cached data, keep it despite the error
        if (!substances) {
          setSubstances(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSubstances();
  }, []);

  return { substances, loading, error };
}