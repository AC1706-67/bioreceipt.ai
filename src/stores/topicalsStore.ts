/**
 * Topicals Store (Zustand)
 * State management for topical products, use events, and effect check-ins
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  TopicalsState, 
  TopicalsAction, 
  TopicalProduct, 
  UseEvent, 
  EffectCheckin,
  TopicalCategory,
  TopicalTimeline,
} from '../types/topicals';

interface TopicalsStore extends TopicalsState {
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: TopicalCategory | 'all') => void;
  setBarcodeScanning: (scanning: boolean) => void;
  
  // Product actions
  addProduct: (product: Omit<TopicalProduct, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<TopicalProduct>;
  updateProduct: (id: string, updates: Partial<TopicalProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  setProducts: (products: TopicalProduct[]) => void;
  getProduct: (id: string) => TopicalProduct | undefined;
  getProductsByCategory: (category: TopicalCategory) => TopicalProduct[];
  searchProducts: (query: string) => TopicalProduct[];
  
  // Use event actions
  addUseEvent: (useEvent: Omit<UseEvent, 'id' | 'timestamp' | 'userId'>) => Promise<UseEvent>;
  updateUseEvent: (id: string, updates: Partial<UseEvent>) => Promise<void>;
  deleteUseEvent: (id: string) => Promise<void>;
  setUseEvents: (useEvents: UseEvent[]) => void;
  getUseEvent: (id: string) => UseEvent | undefined;
  getUseEventsByProduct: (productId: string) => UseEvent[];
  
  // Effect check-in actions
  addEffectCheckin: (checkin: Omit<EffectCheckin, 'id' | 'timestamp' | 'userId'>) => Promise<EffectCheckin>;
  updateEffectCheckin: (id: string, updates: Partial<EffectCheckin>) => Promise<void>;
  deleteEffectCheckin: (id: string) => Promise<void>;
  setEffectCheckins: (checkins: EffectCheckin[]) => void;
  getEffectCheckin: (id: string) => EffectCheckin | undefined;
  getEffectCheckinsByUseEvent: (useEventId: string) => EffectCheckin[];
  
  // Timeline and analytics
  getProductTimeline: (productId: string) => TopicalTimeline[];
  getRecentActivity: (days?: number) => (UseEvent | EffectCheckin)[];
  getProductStats: (productId: string) => {
    totalUses: number;
    averageRating: number;
    commonSymptoms: string[];
    lastUsed?: string;
  };
  
  // Utility actions
  clearAll: () => void;
  syncWithServer: () => Promise<void>;
}

// Generate unique ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get current user ID (mock for now)
const getCurrentUserId = (): string => {
  return 'user-123'; // In real app, get from auth context
};

export const useTopicalsStore = create<TopicalsStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        products: {},
        useEvents: {},
        effectCheckins: {},
        isLoading: false,
        error: null,
        searchQuery: '',
        selectedCategory: 'all',
        barcodeScanning: false,

        // Basic actions
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        setSearchQuery: (query) => set({ searchQuery: query }),
        setSelectedCategory: (category) => set({ selectedCategory: category }),
        setBarcodeScanning: (scanning) => set({ barcodeScanning: scanning }),

        // Product actions
        addProduct: async (productData) => {
          const product: TopicalProduct = {
            ...productData,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: getCurrentUserId(),
          };

          set((state) => {
            state.products[product.id] = product;
          });

          return product;
        },

        updateProduct: async (id, updates) => {
          set((state) => {
            if (state.products[id]) {
              state.products[id] = {
                ...state.products[id],
                ...updates,
                updatedAt: new Date().toISOString(),
              };
            }
          });
        },

        deleteProduct: async (id) => {
          set((state) => {
            delete state.products[id];
            
            // Also delete related use events and effect check-ins
            Object.keys(state.useEvents).forEach(eventId => {
              if (state.useEvents[eventId].productId === id) {
                delete state.useEvents[eventId];
                
                // Delete related effect check-ins
                Object.keys(state.effectCheckins).forEach(checkinId => {
                  if (state.effectCheckins[checkinId].useEventId === eventId) {
                    delete state.effectCheckins[checkinId];
                  }
                });
              }
            });
          });
        },

        setProducts: (products) => {
          set((state) => {
            state.products = {};
            products.forEach(product => {
              state.products[product.id] = product;
            });
          });
        },

        getProduct: (id) => {
          return get().products[id];
        },

        getProductsByCategory: (category) => {
          const products = Object.values(get().products);
          return products.filter(product => product.category === category);
        },

        searchProducts: (query) => {
          const products = Object.values(get().products);
          const lowercaseQuery = query.toLowerCase();
          
          return products.filter(product => 
            product.name.toLowerCase().includes(lowercaseQuery) ||
            product.brand?.toLowerCase().includes(lowercaseQuery) ||
            product.category.toLowerCase().includes(lowercaseQuery)
          );
        },

        // Use event actions
        addUseEvent: async (useEventData) => {
          const useEvent: UseEvent = {
            ...useEventData,
            id: generateId(),
            timestamp: new Date().toISOString(),
            userId: getCurrentUserId(),
          };

          set((state) => {
            state.useEvents[useEvent.id] = useEvent;
          });

          return useEvent;
        },

        updateUseEvent: async (id, updates) => {
          set((state) => {
            if (state.useEvents[id]) {
              state.useEvents[id] = {
                ...state.useEvents[id],
                ...updates,
              };
            }
          });
        },

        deleteUseEvent: async (id) => {
          set((state) => {
            delete state.useEvents[id];
            
            // Also delete related effect check-ins
            Object.keys(state.effectCheckins).forEach(checkinId => {
              if (state.effectCheckins[checkinId].useEventId === id) {
                delete state.effectCheckins[checkinId];
              }
            });
          });
        },

        setUseEvents: (useEvents) => {
          set((state) => {
            state.useEvents = {};
            useEvents.forEach(useEvent => {
              state.useEvents[useEvent.id] = useEvent;
            });
          });
        },

        getUseEvent: (id) => {
          return get().useEvents[id];
        },

        getUseEventsByProduct: (productId) => {
          const useEvents = Object.values(get().useEvents);
          return useEvents
            .filter(event => event.productId === productId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        },

        // Effect check-in actions
        addEffectCheckin: async (checkinData) => {
          const checkin: EffectCheckin = {
            ...checkinData,
            id: generateId(),
            timestamp: new Date().toISOString(),
            userId: getCurrentUserId(),
          };

          set((state) => {
            state.effectCheckins[checkin.id] = checkin;
          });

          return checkin;
        },

        updateEffectCheckin: async (id, updates) => {
          set((state) => {
            if (state.effectCheckins[id]) {
              state.effectCheckins[id] = {
                ...state.effectCheckins[id],
                ...updates,
              };
            }
          });
        },

        deleteEffectCheckin: async (id) => {
          set((state) => {
            delete state.effectCheckins[id];
          });
        },

        setEffectCheckins: (checkins) => {
          set((state) => {
            state.effectCheckins = {};
            checkins.forEach(checkin => {
              state.effectCheckins[checkin.id] = checkin;
            });
          });
        },

        getEffectCheckin: (id) => {
          return get().effectCheckins[id];
        },

        getEffectCheckinsByUseEvent: (useEventId) => {
          const checkins = Object.values(get().effectCheckins);
          return checkins
            .filter(checkin => checkin.useEventId === useEventId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        },

        // Timeline and analytics
        getProductTimeline: (productId) => {
          const useEvents = get().getUseEventsByProduct(productId);
          
          return useEvents.map(useEvent => ({
            useEvent,
            effectCheckins: get().getEffectCheckinsByUseEvent(useEvent.id),
          }));
        },

        getRecentActivity: (days = 7) => {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          
          const useEvents = Object.values(get().useEvents);
          const checkins = Object.values(get().effectCheckins);
          
          const recentUseEvents = useEvents.filter(
            event => new Date(event.timestamp) >= cutoffDate
          );
          
          const recentCheckins = checkins.filter(
            checkin => new Date(checkin.timestamp) >= cutoffDate
          );
          
          return [...recentUseEvents, ...recentCheckins]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        },

        getProductStats: (productId) => {
          const useEvents = get().getUseEventsByProduct(productId);
          const allCheckins = Object.values(get().effectCheckins);
          
          const productCheckins = allCheckins.filter(checkin => 
            useEvents.some(event => event.id === checkin.useEventId)
          );
          
          const totalUses = useEvents.length;
          const averageRating = productCheckins.length > 0
            ? productCheckins.reduce((sum, checkin) => sum + checkin.overallRating, 0) / productCheckins.length
            : 0;
          
          // Find most common symptoms (rating > 1)
          const symptomCounts: Record<string, number> = {};
          productCheckins.forEach(checkin => {
            Object.entries(checkin.symptoms).forEach(([symptom, rating]) => {
              if (rating > 1) {
                symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
              }
            });
          });
          
          const commonSymptoms = Object.entries(symptomCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([symptom]) => symptom);
          
          const lastUsed = useEvents.length > 0 ? useEvents[0].timestamp : undefined;
          
          return {
            totalUses,
            averageRating,
            commonSymptoms,
            lastUsed,
          };
        },

        // Utility actions
        clearAll: () => {
          set({
            products: {},
            useEvents: {},
            effectCheckins: {},
            isLoading: false,
            error: null,
            searchQuery: '',
            selectedCategory: 'all',
            barcodeScanning: false,
          });
        },

        syncWithServer: async () => {
          // TODO: Implement server sync
          set({ isLoading: true });
          try {
            // Sync logic here
            await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
          } catch (error) {
            set({ error: 'Failed to sync with server' });
          } finally {
            set({ isLoading: false });
          }
        },
      })),
      {
        name: 'topicals-store',
        partialize: (state) => ({
          products: state.products,
          useEvents: state.useEvents,
          effectCheckins: state.effectCheckins,
        }),
      }
    ),
    { name: 'topicals-store' }
  )
);

// Selectors for common queries
export const topicalsSelectors = {
  // Get filtered products based on search and category
  getFilteredProducts: (state: TopicalsStore) => {
    let products = Object.values(state.products);
    
    // Filter by category
    if (state.selectedCategory !== 'all') {
      products = products.filter(product => product.category === state.selectedCategory);
    }
    
    // Filter by search query
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    }
    
    return products.sort((a, b) => a.name.localeCompare(b.name));
  },
  
  // Get products with recent activity
  getActiveProducts: (state: TopicalsStore, days = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentUseEvents = Object.values(state.useEvents).filter(
      event => new Date(event.timestamp) >= cutoffDate
    );
    
    const activeProductIds = new Set(recentUseEvents.map(event => event.productId));
    
    return Object.values(state.products).filter(product => 
      activeProductIds.has(product.id)
    );
  },
  
  // Get products that need effect check-ins
  getProductsNeedingCheckins: (state: TopicalsStore, hoursThreshold = 24) => {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursThreshold);
    
    const recentUseEvents = Object.values(state.useEvents).filter(
      event => new Date(event.timestamp) >= cutoffDate
    );
    
    const eventsWithoutCheckins = recentUseEvents.filter(event => {
      const checkins = Object.values(state.effectCheckins).filter(
        checkin => checkin.useEventId === event.id
      );
      return checkins.length === 0;
    });
    
    const productIds = new Set(eventsWithoutCheckins.map(event => event.productId));
    
    return Object.values(state.products).filter(product => 
      productIds.has(product.id)
    );
  },
};