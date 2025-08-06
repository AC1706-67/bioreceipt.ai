/**
 * Tips Feed Component
 * Displays a scrollable list of health tips
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { HealthTip, UserAction, HealthCategory, TipDifficulty } from '../../types';
import { TipCard } from './TipCard';
import { ContentFilter } from '../../services/content/contentService';
import { useHealthTips } from '../../hooks/useHealthTips';

interface TipsFeedProps {
  userId: string;
  onTipAction: (tipId: string, action: UserAction) => void;
  initialFilter?: ContentFilter;
}

const CATEGORIES: { value: HealthCategory; label: string }[] = [
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'mental_wellness', label: 'Mental Wellness' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'hygiene', label: 'Hygiene' },
];

const DIFFICULTIES: { value: TipDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export const TipsFeed: React.FC<TipsFeedProps> = ({
  userId,
  onTipAction,
  initialFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HealthCategory | undefined>(
    initialFilter?.category
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<TipDifficulty | undefined>(
    initialFilter?.difficulty
  );
  const [showFilters, setShowFilters] = useState(false);

  // Use the new health tips hook
  const {
    tips,
    loading,
    error,
    refreshTips,
    handleTipAction: hookHandleTipAction,
    updateFilter,
    clearFilter,
  } = useHealthTips({
    filter: {
      category: selectedCategory,
      difficulty: selectedDifficulty,
      searchQuery: searchQuery.trim() || undefined,
    },
    autoLoad: true,
  });

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshTips();
    setRefreshing(false);
  };

  const handleTipAction = async (tipId: string, action: UserAction) => {
    // Use the hook's action handler
    await hookHandleTipAction(tipId, action);
    
    // Also call the parent's action handler
    onTipAction(tipId, action);
  };

  // Update filter when local state changes
  useEffect(() => {
    updateFilter({
      category: selectedCategory,
      difficulty: selectedDifficulty,
      searchQuery: searchQuery.trim() || undefined,
    });
  }, [selectedCategory, selectedDifficulty, searchQuery, updateFilter]);

  const clearFilters = () => {
    setSelectedCategory(undefined);
    setSelectedDifficulty(undefined);
    setSearchQuery('');
    clearFilter();
  };

  const renderTipCard = ({ item }: { item: HealthTip }) => (
    <TipCard
      tip={item}
      onAction={handleTipAction}
      // In a real app, these would come from user interaction state
      isLiked={false}
      isBookmarked={false}
      isCompleted={false}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Health Tips</Text>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tips..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>

      <View style={styles.filterControls}>
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Text>
        </TouchableOpacity>

        {(selectedCategory || selectedDifficulty || searchQuery) && (
          <TouchableOpacity style={styles.clearFilters} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Category:</Text>
            <View style={styles.filterOptions}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.filterOption,
                    selectedCategory === category.value && styles.selectedFilter,
                  ]}
                  onPress={() =>
                    setSelectedCategory(
                      selectedCategory === category.value ? undefined : category.value
                    )
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedCategory === category.value && styles.selectedFilterText,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Difficulty:</Text>
            <View style={styles.filterOptions}>
              {DIFFICULTIES.map((difficulty) => (
                <TouchableOpacity
                  key={difficulty.value}
                  style={[
                    styles.filterOption,
                    selectedDifficulty === difficulty.value && styles.selectedFilter,
                  ]}
                  onPress={() =>
                    setSelectedDifficulty(
                      selectedDifficulty === difficulty.value ? undefined : difficulty.value
                    )
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedDifficulty === difficulty.value && styles.selectedFilterText,
                    ]}
                  >
                    {difficulty.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <Text style={styles.resultsCount}>
        {tips.length} tip{tips.length !== 1 ? 's' : ''} found
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Tips Found</Text>
      <Text style={styles.emptyStateText}>
        Try adjusting your search or filter criteria to find more tips.
      </Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={clearFilters}>
        <Text style={styles.emptyStateButtonText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading health tips...</Text>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to Load Tips</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tips}
        renderItem={renderTipCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  listContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  filterControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3498db',
    borderRadius: 6,
  },
  filterToggleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearFilters: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 6,
  },
  clearFiltersText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#ffffff',
  },
  selectedFilter: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6c757d',
  },
  selectedFilterText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  emptyStateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3498db',
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3498db',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});