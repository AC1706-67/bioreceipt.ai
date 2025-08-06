/**
 * Optimized Substance Selector - Performance-Enhanced Substance Selection
 * Features optimistic updates, intelligent caching, and non-blocking loading states
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { BioPulseTheme } from '../../constants/bioPulseTheme';
import { Database } from '../../config/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useOptimizedSubstanceLoading } from '../../hooks/useOptimizedSubstanceLoading';
import AddSubstanceModal from './AddSubstanceModal';
import SubstanceOperationErrorBoundary from '../error/SubstanceOperationErrorBoundary';

type Substance = Database['public']['Tables']['substances']['Row'] & {
  substance_categories: { id: string; name: string };
};

interface Props {
  selectedSubstance: Substance | null;
  onSelectSubstance: (substance: Substance) => void;
  onSubstanceAdded?: (substance: Substance) => void;
  userId?: string;
}

const OptimizedSubstanceSelector: React.FC<Props> = ({
  selectedSubstance,
  onSelectSubstance,
  onSubstanceAdded,
  userId,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [optimisticUpdateId, setOptimisticUpdateId] = useState<string | null>(null);
  
  const toast = useToast();
  
  // Use optimized loading hook
  const {
    substances,
    loadingState,
    searchResults,
    cacheMetrics,
    loadSubstances,
    refreshSubstances,
    searchSubstances,
    addSubstanceOptimistically,
    confirmOptimisticUpdate,
    failOptimisticUpdate,
    clearError,
  } = useOptimizedSubstanceLoading(userId);

  // Memoized filtered substances for better performance
  const displaySubstances = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    return substances;
  }, [searchQuery, searchResults, substances]);

  // Memoized grouped substances
  const groupedSubstances = useMemo(() => {
    const groups: Record<string, Substance[]> = {};
    
    displaySubstances.forEach(substance => {
      const category = substance.substance_categories.name;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(substance);
    });
    
    // Sort categories and substances within each category
    const sortedGroups: Record<string, Substance[]> = {};
    Object.keys(groups)
      .sort()
      .forEach(category => {
        sortedGroups[category] = groups[category].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
      });
    
    return sortedGroups;
  }, [displaySubstances]);

  // Handle search with debouncing (handled by the hook)
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    searchSubstances(query);
  }, [searchSubstances]);

  // Handle substance selection
  const handleSubstanceSelect = useCallback((substance: Substance) => {
    onSelectSubstance(substance);
    setIsModalVisible(false);
    setSearchQuery('');
  }, [onSelectSubstance]);

  // Handle substance addition with optimistic updates
  const handleSubstanceAdded = useCallback(async (newSubstance: Substance) => {
    try {
      // Close the add modal
      setIsAddModalVisible(false);
      
      // Add optimistic update for immediate UI feedback
      const updateId = addSubstanceOptimistically(newSubstance);
      setOptimisticUpdateId(updateId);
      
      // Auto-select the newly added substance
      onSelectSubstance(newSubstance);
      
      // Clear search query to show the new substance
      setSearchQuery('');
      
      // Notify parent component
      if (onSubstanceAdded) {
        onSubstanceAdded(newSubstance);
      }
      
      // Show success message with enhanced UX
      toast.showSuccess(
        `${newSubstance.name} added and ready to use!`,
        'Start Logging',
        () => {
          setIsModalVisible(false);
        }
      );
      
      // Confirm the optimistic update (in real app, this would be after API confirmation)
      setTimeout(() => {
        if (updateId) {
          confirmOptimisticUpdate(updateId);
          setOptimisticUpdateId(null);
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('Error handling substance addition:', error);
      
      // Fail the optimistic update
      if (optimisticUpdateId) {
        failOptimisticUpdate(optimisticUpdateId);
        setOptimisticUpdateId(null);
      }
      
      toast.showError(
        'Substance was added but there was an issue updating the interface.',
        'Refresh',
        () => refreshSubstances()
      );
    }
  }, [
    addSubstanceOptimistically,
    onSelectSubstance,
    onSubstanceAdded,
    toast,
    optimisticUpdateId,
    confirmOptimisticUpdate,
    failOptimisticUpdate,
    refreshSubstances,
  ]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refreshSubstances();
  }, [refreshSubstances]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    clearError();
    loadSubstances(true);
  }, [clearError, loadSubstances]);

  // Render substance item with optimized performance
  const renderSubstanceItem = useCallback(({ item }: { item: Substance }) => {
    const isSelected = selectedSubstance?.id === item.id;
    const isOptimistic = optimisticUpdateId && item.created_by !== null;
    
    return (
      <TouchableOpacity
        style={[
          styles.substanceItem,
          isSelected && styles.selectedSubstanceItem,
          isOptimistic && styles.optimisticSubstanceItem,
        ]}
        onPress={() => handleSubstanceSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={`Select ${item.name}`}
        accessibilityState={{ selected: isSelected }}
      >
        <View style={styles.substanceInfo}>
          <Text style={[
            styles.substanceName,
            isSelected && styles.selectedSubstanceName,
          ]}>
            {item.name}
          </Text>
          <Text style={[
            styles.substanceCategory,
            isSelected && styles.selectedSubstanceCategory,
          ]}>
            {item.substance_categories.name}
          </Text>
          {item.created_by && (
            <Text style={styles.customLabel}>Custom</Text>
          )}
          {isOptimistic && (
            <View style={styles.optimisticIndicator}>
              <ActivityIndicator size="small" color={BioPulseTheme.colors.primary} />
              <Text style={styles.optimisticText}>Adding...</Text>
            </View>
          )}
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedIndicatorText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedSubstance, optimisticUpdateId, handleSubstanceSelect]);

  // Render category section
  const renderCategorySection = useCallback((category: string, substances: Substance[]) => (
    <View key={category} style={styles.categorySection}>
      <Text style={styles.categoryHeader}>{category}</Text>
      {substances.map(substance => (
        <View key={substance.id}>
          {renderSubstanceItem({ item: substance })}
        </View>
      ))}
    </View>
  ), [renderSubstanceItem]);

  // Render performance metrics (for debugging/monitoring)
  const renderPerformanceMetrics = useCallback(() => {
    if (__DEV__) {
      return (
        <View style={styles.performanceMetrics}>
          <Text style={styles.metricsText}>
            Cache Hit Ratio: {(cacheMetrics.hitRatio * 100).toFixed(1)}%
          </Text>
          <Text style={styles.metricsText}>
            Optimistic Updates: {cacheMetrics.optimisticUpdates}
          </Text>
        </View>
      );
    }
    return null;
  }, [cacheMetrics]);

  return (
    <View style={styles.container}>
      {/* Substance Selection Button */}
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setIsModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Select substance"
      >
        <Text style={styles.selectorButtonText}>
          {selectedSubstance ? selectedSubstance.name : 'Select Substance'}
        </Text>
        <Text style={styles.selectorButtonArrow}>▼</Text>
      </TouchableOpacity>

      {/* Performance Metrics (Debug) */}
      {renderPerformanceMetrics()}

      {/* Substance Selection Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SubstanceOperationErrorBoundary>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Substance</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search substances..."
                value={searchQuery}
                onChangeText={handleSearch}
                accessibilityLabel="Search substances"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {loadingState.isSearching && (
                <ActivityIndicator
                  style={styles.searchLoader}
                  size="small"
                  color={BioPulseTheme.colors.primary}
                />
              )}
            </View>

            {/* Add Custom Substance Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setIsAddModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Add custom substance"
            >
              <Text style={styles.addButtonText}>+ Add Custom Substance</Text>
            </TouchableOpacity>

            {/* Error State */}
            {loadingState.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{loadingState.error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetry}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading substances"
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Substances List */}
            <FlatList
              style={styles.substancesList}
              data={Object.entries(groupedSubstances)}
              keyExtractor={([category]) => category}
              renderItem={({ item: [category, categorySubstances] }) =>
                renderCategorySection(category, categorySubstances)
              }
              refreshControl={
                <RefreshControl
                  refreshing={loadingState.isRefreshing}
                  onRefresh={handleRefresh}
                  colors={[BioPulseTheme.colors.primary]}
                />
              }
              ListEmptyComponent={
                loadingState.isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={BioPulseTheme.colors.primary} />
                    <Text style={styles.loadingText}>Loading substances...</Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {searchQuery ? 'No substances found' : 'No substances available'}
                    </Text>
                  </View>
                )
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        </SubstanceOperationErrorBoundary>
      </Modal>

      {/* Add Substance Modal */}
      <AddSubstanceModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSubstanceAdded={handleSubstanceAdded}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BioPulseTheme.colors.surface,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
    borderRadius: 8,
    padding: 16,
    minHeight: 56,
  },
  selectorButtonText: {
    fontSize: 16,
    color: BioPulseTheme.colors.text,
    flex: 1,
  },
  selectorButtonArrow: {
    fontSize: 12,
    color: BioPulseTheme.colors.textSecondary,
    marginLeft: 8,
  },
  performanceMetrics: {
    marginTop: 4,
    padding: 8,
    backgroundColor: BioPulseTheme.colors.background,
    borderRadius: 4,
  },
  metricsText: {
    fontSize: 10,
    color: BioPulseTheme.colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BioPulseTheme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BioPulseTheme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BioPulseTheme.colors.text,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: BioPulseTheme.colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: BioPulseTheme.colors.text,
  },
  searchLoader: {
    marginRight: 12,
  },
  addButton: {
    backgroundColor: BioPulseTheme.colors.primary,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: BioPulseTheme.colors.error + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.error,
  },
  errorText: {
    color: BioPulseTheme.colors.error,
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: BioPulseTheme.colors.error,
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  substancesList: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BioPulseTheme.colors.text,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  substanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 2,
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BioPulseTheme.colors.border,
  },
  selectedSubstanceItem: {
    backgroundColor: BioPulseTheme.colors.primary + '20',
    borderColor: BioPulseTheme.colors.primary,
  },
  optimisticSubstanceItem: {
    backgroundColor: BioPulseTheme.colors.warning + '10',
    borderColor: BioPulseTheme.colors.warning,
  },
  substanceInfo: {
    flex: 1,
  },
  substanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: BioPulseTheme.colors.text,
    marginBottom: 4,
  },
  selectedSubstanceName: {
    color: BioPulseTheme.colors.primary,
  },
  substanceCategory: {
    fontSize: 14,
    color: BioPulseTheme.colors.textSecondary,
  },
  selectedSubstanceCategory: {
    color: BioPulseTheme.colors.primary + 'CC',
  },
  customLabel: {
    fontSize: 12,
    color: BioPulseTheme.colors.warning,
    fontWeight: '600',
    marginTop: 2,
  },
  optimisticIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  optimisticText: {
    fontSize: 12,
    color: BioPulseTheme.colors.warning,
    marginLeft: 4,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BioPulseTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: BioPulseTheme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: BioPulseTheme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default OptimizedSubstanceSelector;