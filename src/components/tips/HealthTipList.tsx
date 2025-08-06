/**
 * Health Tip List Component
 * Displays a list of health tips with filtering, sorting, and pagination
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { HealthTip, HealthTipCategory, DifficultyLevel, HealthTipFilter, HealthTipSortOptions } from '../../models/HealthTip';
import { healthTipService } from '../../services/content/healthTipService';
import { analyticsService } from '../../services/analytics/analyticsService';
import HealthTipCard from './HealthTipCard';

interface HealthTipListProps {
  userId: string;
  initialFilter?: HealthTipFilter;
  initialSort?: HealthTipSortOptions;
  showSearch?: boolean;
  showFilters?: boolean;
  onTipPress?: (tip: HealthTip) => void;
  style?: any;
}

const HealthTipList: React.FC<HealthTipListProps> = ({
  userId,
  initialFilter,
  initialSort = { field: 'createdAt', direction: 'desc' },
  showSearch = true,
  showFilters = true,
  onTipPress,
  style
}) => {
  const [tips, setTips] = useState<HealthTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HealthTipCategory | undefined>(initialFilter?.category);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | undefined>(initialFilter?.difficulty);
  const [sortOptions, setSortOptions] = useState<HealthTipSortOptions>(initialSort);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  // Memoized filter object
  const currentFilter = useMemo((): HealthTipFilter => ({
    ...initialFilter,
    category: selectedCategory,
    difficulty: selectedDifficulty,
    searchQuery: searchQuery.trim() || undefined,
    isActive: true
  }), [initialFilter, selectedCategory, selectedDifficulty, searchQuery]);

  // Load tips
  const loadTips = useCallback(async (page: number = 0, append: boolean = false) => {
    try {
      if (page === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const result = await healthTipService.getHealthTips(
        currentFilter,
        sortOptions,
        pageSize,
        page * pageSize
      );

      if (append) {
        setTips(prevTips => [...prevTips, ...result.tips]);
      } else {
        setTips(result.tips);
      }

      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error loading tips:', err);
      setError('Failed to load health tips. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [currentFilter, sortOptions, pageSize]);

  // Initial load
  useEffect(() => {
    loadTips(0, false);
  }, [loadTips]);

  // Refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTips(0, false);
  }, [loadTips]);

  // Load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadTips(currentPage + 1, true);
    }
  }, [loadTips, loadingMore, hasMore, currentPage]);

  // Search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    // Track search analytics
    if (query.trim()) {
      analyticsService.trackSearch(query, tips.length, userId);
    }
  }, [tips.length, userId]);

  // Filter changes
  const handleCategoryChange = useCallback((category: HealthTipCategory | undefined) => {
    setSelectedCategory(category);
    
    // Track category filter analytics
    analyticsService.trackEvent('category_filter', {
      category: category || 'all',
      userId
    });
  }, [userId]);

  const handleDifficultyChange = useCallback((difficulty: DifficultyLevel | undefined) => {
    setSelectedDifficulty(difficulty);
  }, []);

  const handleSortChange = useCallback((sort: HealthTipSortOptions) => {
    setSortOptions(sort);
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(undefined);
    setSelectedDifficulty(undefined);
    setSortOptions({ field: 'createdAt', direction: 'desc' });
  }, []);

  // Render item
  const renderTipItem = useCallback(({ item }: { item: HealthTip }) => (
    <HealthTipCard
      tip={item}
      userId={userId}
      onPress={onTipPress}
      onInteraction={(interaction) => {
        // Handle interaction if needed
        console.log('Tip interaction:', interaction);
      }}
    />
  ), [userId, onTipPress]);

  // Render empty state
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No tips found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery || selectedCategory || selectedDifficulty
          ? 'Try adjusting your filters to see more results.'
          : 'Check back later for new health tips!'}
      </Text>
      {(searchQuery || selectedCategory || selectedDifficulty) && (
        <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
          <Text style={styles.clearFiltersText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [searchQuery, selectedCategory, selectedDifficulty, clearFilters]);

  // Render error state
  const renderErrorState = useCallback(() => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => loadTips(0, false)}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  ), [error, loadTips]);

  // Render footer
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#666" />
        <Text style={styles.loadingText}>Loading more tips...</Text>
      </View>
    );
  }, [loadingMore]);

  // Render search bar
  const renderSearchBar = useCallback(() => {
    if (!showSearch) return null;

    return (
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search health tips..."
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
      </View>
    );
  }, [showSearch, searchQuery, handleSearch]);

  // Render filter panel
  const renderFilterPanel = useCallback(() => {
    if (!showFilters || !showFilterPanel) return null;

    return (
      <View style={styles.filterPanel}>
        {/* Category filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[styles.filterOption, !selectedCategory && styles.filterOptionActive]}
              onPress={() => handleCategoryChange(undefined)}
            >
              <Text style={[styles.filterOptionText, !selectedCategory && styles.filterOptionTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {Object.values(HealthTipCategory).map(category => (
              <TouchableOpacity
                key={category}
                style={[styles.filterOption, selectedCategory === category && styles.filterOptionActive]}
                onPress={() => handleCategoryChange(category)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedCategory === category && styles.filterOptionTextActive
                ]}>
                  {category.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Difficulty filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Difficulty</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[styles.filterOption, !selectedDifficulty && styles.filterOptionActive]}
              onPress={() => handleDifficultyChange(undefined)}
            >
              <Text style={[styles.filterOptionText, !selectedDifficulty && styles.filterOptionTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {Object.values(DifficultyLevel).map(difficulty => (
              <TouchableOpacity
                key={difficulty}
                style={[styles.filterOption, selectedDifficulty === difficulty && styles.filterOptionActive]}
                onPress={() => handleDifficultyChange(difficulty)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedDifficulty === difficulty && styles.filterOptionTextActive
                ]}>
                  {difficulty}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sort options */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Sort by</Text>
          <View style={styles.filterOptions}>
            {[
              { field: 'createdAt', label: 'Newest' },
              { field: 'engagementScore', label: 'Popular' },
              { field: 'averageRating', label: 'Highest Rated' },
              { field: 'priority', label: 'Priority' }
            ].map(option => (
              <TouchableOpacity
                key={option.field}
                style={[
                  styles.filterOption,
                  sortOptions.field === option.field && styles.filterOptionActive
                ]}
                onPress={() => handleSortChange({ field: option.field as any, direction: 'desc' })}
              >
                <Text style={[
                  styles.filterOptionText,
                  sortOptions.field === option.field && styles.filterOptionTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }, [showFilters, showFilterPanel, selectedCategory, selectedDifficulty, sortOptions, handleCategoryChange, handleDifficultyChange, handleSortChange]);

  if (loading && tips.length === 0) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <ActivityIndicator size="large" color="#666" />
        <Text style={styles.loadingText}>Loading health tips...</Text>
      </View>
    );
  }

  if (error && tips.length === 0) {
    return (
      <View style={[styles.container, style]}>
        {renderErrorState()}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {renderSearchBar()}
      
      {showFilters && (
        <View style={styles.filterHeader}>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowFilterPanel(!showFilterPanel)}
          >
            <Text style={styles.filterToggleText}>
              Filters {showFilterPanel ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          
          {(selectedCategory || selectedDifficulty || searchQuery) && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {renderFilterPanel()}

      <FlatList
        data={tips}
        renderItem={renderTipItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#666']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tips.length === 0 ? styles.emptyContainer : undefined}
        testID="tips-flatlist"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterToggle: {
    paddingVertical: 8,
  },
  filterToggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterPanel: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterOptionActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1976d2',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  filterOptionTextActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1976d2',
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});

export default HealthTipList;