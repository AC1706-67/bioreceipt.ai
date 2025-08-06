import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../config/supabase';

type Substance = Database['public']['Tables']['substances']['Row'] & {
  substance_categories: { id: string; name: string };
};

interface CachedData {
  substances: Substance[];
  timestamp: number;
}

const CACHE_KEY = 'cached_substances';
const TTL_MINUTES = 15;
const TTL_MS = TTL_MINUTES * 60 * 1000;

export async function getCachedSubstances(): Promise<Substance[] | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedData = JSON.parse(cached);
    const now = Date.now();
    
    if (now - data.timestamp > TTL_MS) {
      await AsyncStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data.substances;
  } catch (error) {
    console.error('Error getting cached substances:', error);
    return null;
  }
}

export async function setCachedSubstances(items: Substance[]): Promise<void> {
  try {
    const data: CachedData = {
      substances: items,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error setting cached substances:', error);
  }
}