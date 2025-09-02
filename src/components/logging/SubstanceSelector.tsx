/**
 * Substance Selector - Enhanced Substance Selection Component
 * Accessible substance selection with search functionality and custom substance addition
 * Integrated with enhanced validation and service layers
 */

import React, { useState, useEffect } from 'react';
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
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';
import { substanceDatabase } from '../../services/substance/substanceDatabase';
import { getCachedSubstances, setCachedSubstances } from '../../services/substanceCacheService';
import { Database } from '../../config/supabase';
import { useToast } from '../../contexts/ToastContext';
import AddSubstanceModal from './AddSubstanceModal';
import SubstanceOperationErrorBoundary from '../error/SubstanceOperationErrorBoundary';

type Substance = Database['public']['Tables']['substances']['Row'] & {
  substance_categories: { id: string; name: string };
};

interface Props {
  selectedSubstance: Substance | null;
  onSelectSubstance: (substance: Substance) => void;
  onSubstanceAdded?: (substance: Substance) => void;
}

const SubstanceSelector: React.FC<Props> = ({
  selectedSubstance,
  onSelectSubstance,
  onSubstanceAdded,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const toast = useToast();

  // Load substances on component mount
  useEffect(() => {
    loadSubstances();
  }, []);

  const loadSubstances = async (showAlert: boolean = true) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await substanceDatabase.getSupabaseSubstances();
      
      if (result.success && result.data) {
        setSubstances(result.data);
        setError(null);
        
        // Show success feedback for manual refreshes
        if (showAlert && !isLoading) {
          toast.showSuccess('Substances updated successfully!');
        }
      } else {
        const errorMessage = result.error || 'Failed to load substances';
        setError(errorMessage);
        
        if (showAlert) {
          // Enhanced error handling with specific error types
          if (errorMessage.includes('network') || errorMessage.includes('connection')) {
            toast.showError(
              'Connection problem. Please check your internet connection.',
              'Retry',
              () => loadSubstances(true)
            );
          } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            toast.showError(
              'Access denied. Please log in again.',
              'OK'
            );
          } else if (errorMessage.includes('timeout')) {
            toast.showError(
              'Request timed out. Please try again.',
              'Retry',
              () => loadSubstances(true)
            );
          } else {
            toast.showError(
              'Failed to load substances. Please try again.',
              'Retry',
              () => loadSubstances(true)
            );
          }
        }
      }
    } catch (err: any) {
      console.error('Error loading substances:', err);
      
      // Enhanced error classification
      let errorMessage = 'Failed to load substances';
      let actionText = 'Retry';
      
      if (err.name === 'NetworkError' || err.message?.includes('network')) {
        errorMessage = 'Network connection lost. Please check your internet connection.';
      } else if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.message?.includes('permission') || err.message?.includes('unauthorized')) {
        errorMessage = 'You don\'t have permission to access substances. Please log in again.';
        actionText = 'OK';
      } else if (err.message?.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
        actionText = 'OK';
      } else {
        errorMessage = 'An unexpected error occurred while loading substances.';
      }
      
      setError(errorMessage);
      
      if (showAlert) {
        toast.showError(
          errorMessage,
          actionText,
          actionText === 'Retry' ? () => loadSubstances(true) : undefined
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubstances = substances.filter(substance =>
    substance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    substance.substance_categories.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate custom substances for special handling
  const customSubstances = filteredSubstances.filter(s => s.created_by !== null);
  const defaultSubstances = filteredSubstances.filter(s => s.created_by === null);

  const groupedSubstances = filteredSubstances.reduce((groups, substance) => {
    const category = substance.substance_categories.name;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(substance);
    return groups;
  }, {} as Record<string, Substance[]>);

  // Sort categories to show custom substances first if they exist
  const sortedCategories = Object.entries(groupedSubstances).sort(([categoryA], [categoryB]) => {
    const hasCustomA = groupedSubstances[categoryA].some(s => s.created_by !== null);
    const hasCustomB = groupedSubstances[categoryB].some(s => s.created_by !== null);
    
    if (hasCustomA && !hasCustomB) return -1;
    if (!hasCustomA && hasCustomB) return 1;
    return categoryA.localeCompare(categoryB);
  });

  const handleSelectSubstance = (substance: Substance) => {
    onSelectSubstance(substance);
    setIsModalVisible(false);
    setSearchQuery('');
  };

  const handleSubstanceAdded = (newSubstance: Substance) => {
    try {
      // Close the add modal
      setIsAddModalVisible(false);
      
      // Add the new substance to local state for immediate UI update (optimistic update)
      setSubstances(prevSubstances => {
        // Check if substance already exists to prevent duplicates
        const exists = prevSubstances.some(s => s.id === newSubstance.id);
        if (exists) {
          console.log('Substance already exists in local state, skipping duplicate');
          return prevSubstances;
        }
        return [...prevSubstances, newSubstance];
      });
      
      // Notify parent component
      if (onSubstanceAdded) {
        onSubstanceAdded(newSubstance);
      }
      
      // Auto-select the newly added substance for immediate use
      onSelectSubstance(newSubstance);
      
      // Clear search query to show the new substance
      setSearchQuery('');
      
      // Enhanced success message with better UX
      toast.showSuccess(
        `${newSubstance.name} added and ready to use!`,
        'Start Logging',
        () => {
          // Close the selector modal to proceed with logging
          setIsModalVisible(false);
        }
      );
      
      // Auto-close the modal after a short delay for smooth UX
      setTimeout(() => {
        setIsModalVisible(false);
      }, 1500);
      
      // Refresh substances list to ensure consistency with database
      // Use a shorter timeout for better responsiveness
      setTimeout(() => {
        refreshSubstances();
      }, 500);
      
    } catch (error: any) {
      console.error('Error handling substance addition:', error);
      
      // Fallback error handling
      toast.showError(
        'Substance was added but there was an issue updating the interface. Please refresh.',
        'Refresh',
        () => {
          refreshSubstances();
        }
      );
    }
  };

  const refreshSubstances = async () => {
    try {
      await loadSubstances(false); // Don't show alert for background refresh
    } catch (error: any) {
      console.error('Error refreshing substances:', error);
      
      // Silent refresh failed, show user-friendly message
      toast.showWarning(
        'Unable to sync latest substances. Your local list may be outdated.',
        'Retry',
        () => loadSubstances(true)
      );
    }
  };

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      await loadSubstances(false);
      
      // Show success feedback for manual pull-to-refresh
      if (substances.length > 0) {
        toast.showSuccess('Substances refreshed successfully!');
      }
    } catch (error: any) {
      console.error('Error during pull-to-refresh:', error);
      
      // Enhanced error handling for pull-to-refresh
      if (error.name === 'NetworkError' || error.message?.includes('network')) {
        toast.showError(
          'No internet connection. Please check your network and try again.',
          'Retry',
          () => handlePullToRefresh()
        );
      } else {
        toast.showError(
          'Failed to refresh substances. Please try again.',
          'Retry',
          () => handlePullToRefresh()
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderSubstanceItem = ({ item }: { item: Substance }) => {
    const isCustom = item.created_by !== null; // Custom substances have a created_by field
    
    return (
      <TouchableOpacity
        style={[styles.substanceItem, isCustom && styles.customSubstanceItem]}
        onPress={() => handleSelectSubstance(item)}
        accessible={true}
        accessibilityLabel={`Select ${item.name}${isCustom ? ' (custom substance)' : ''}`}
        accessibilityHint={`${item.name} in ${item.substance_categories.name} category, measured in ${item.default_unit}`}
        accessibilityRole="button"
      >
        <View style={styles.substanceInfo}>
          <View style={styles.substanceNameRow}>
            <Text style={styles.substanceName}>{item.name}</Text>
            {isCustom && (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>Custom</Text>
              </View>
            )}
          </View>
          <Text style={styles.substanceDetails}>
            {item.substance_categories.name} • {item.default_unit}
          </Text>
          {item.description && (
            <Text style={styles.substanceDescription}>{item.description}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategorySection = (category: string, substances: Substance[]) => (
    <View key={category} style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
      {substances.map(substance => (
        <View key={substance.id}>
          {renderSubstanceItem({ item: substance })}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Substance</Text>
      
      {/* Selection Button */}
      <TouchableOpacity
        style={[styles.selectorButton, selectedSubstance && styles.selectorButtonSelected]}
        onPress={() => setIsModalVisible(true)}
        disabled={isLoading}
        accessible={true}
        accessibilityLabel={selectedSubstance ? `Selected substance: ${selectedSubstance.name}` : "Select substance"}
        accessibilityHint="Opens substance selection modal"
        accessibilityRole="button"
        testID="substance-selector-button"
      >
        <View style={styles.selectorContent}>
          {selectedSubstance ? (
            <View>
              <Text style={styles.selectedSubstanceName}>{selectedSubstance.name}</Text>
              <Text style={styles.selectedSubstanceDetails}>
                {selectedSubstance.substance_categories.name} • {selectedSubstance.default_unit}
              </Text>
            </View>
          ) : (
            <Text style={styles.placeholderText}>
              {isLoading ? 'Loading substances...' : 'Select a substance'}
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Selection Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsModalVisible(false)}
              accessible={true}
              accessibilityLabel="Cancel selection"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Substance</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search substances..."
              placeholderTextColor={BioReceiptTheme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessible={true}
              accessibilityLabel="Search substances"
              accessibilityHint="Type to filter substances by name or category"
              testID="substance-search-input"
            />
          </View>

          {/* Substances List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BioReceiptTheme.colors.primary} />
              <Text style={styles.loadingText}>Loading substances...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadSubstances(true)}
                accessible={true}
                accessibilityLabel="Retry loading substances"
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : Object.keys(groupedSubstances).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? `No substances found for "${searchQuery}"`
                  : "No substances available"
                }
              </Text>
              {searchQuery && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                  accessible={true}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                >
                  <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              style={styles.substancesList}
              data={sortedCategories}
              keyExtractor={([category]) => category}
              renderItem={({ item: [category, substances] }) => 
                renderCategorySection(category, substances)
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.substancesListContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handlePullToRefresh}
                  colors={[BioReceiptTheme.colors.primary]}
                  tintColor={BioReceiptTheme.colors.primary}
                />
              }
              ListHeaderComponent={
                customSubstances.length > 0 && !searchQuery ? (
                  <View style={styles.quickAccessSection}>
                    <Text style={styles.quickAccessTitle}>Your Custom Substances</Text>
                    <Text style={styles.quickAccessSubtitle}>
                      {customSubstances.length} custom substance{customSubstances.length !== 1 ? 's' : ''} available
                    </Text>
                  </View>
                ) : null
              }
            />
          )}

          {/* Add Custom Substance FAB */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setIsModalVisible(false);
              setIsAddModalVisible(true);
            }}
            accessible={true}
            accessibilityLabel="Add custom substance"
            accessibilityHint="Opens form to add a new custom substance"
            accessibilityRole="button"
            testID="add-substance-fab"
          >
            <Text style={styles.fabIcon}>+</Text>
            <Text style={styles.fabText}>Add Substance</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Add Substance Modal */}
      <SubstanceOperationErrorBoundary
        onError={(error, errorInfo) => {
          console.error('Error in AddSubstanceModal:', error, errorInfo);
          toast.showError(
            'There was an error with the substance form. Please try again.',
            'Retry',
            () => {
              // Reset the modal state
              setIsAddModalVisible(false);
              setTimeout(() => setIsAddModalVisible(true), 100);
            }
          );
        }}
      >
        <AddSubstanceModal
          visible={isAddModalVisible}
          onClose={() => setIsAddModalVisible(false)}
          onSubstanceAdded={handleSubstanceAdded}
        />
      </SubstanceOperationErrorBoundary>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  label: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    color: BioReceiptTheme.colors.text,
    marginBottom: BioReceiptTheme.spacing.sm,
  },
  selectorButton: {
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.md,
    backgroundColor: BioReceiptTheme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48, // Accessibility: minimum touch target
  },
  selectorButtonSelected: {
    borderColor: BioReceiptTheme.colors.primary,
    backgroundColor: BioReceiptTheme.colors.primaryLight,
  },
  selectorContent: {
    flex: 1,
  },
  selectedSubstanceName: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    color: BioReceiptTheme.colors.text,
  },
  selectedSubstanceDetails: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
    marginTop: 2,
  },
  placeholderText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.textTertiary,
  },
  chevron: {
    fontSize: BioReceiptTheme.typography.fontSize.xl,
    color: BioReceiptTheme.colors.textTertiary,
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BioReceiptTheme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
    backgroundColor: BioReceiptTheme.colors.surface,
  },
  cancelButton: {
    paddingVertical: BioReceiptTheme.spacing.sm,
    paddingHorizontal: BioReceiptTheme.spacing.sm,
    minHeight: 44, // Accessibility: minimum touch target
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.primary,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  modalTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.text,
  },
  headerSpacer: {
    width: 60, // Balance the cancel button
  },
  searchContainer: {
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    backgroundColor: BioReceiptTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    borderRadius: BioReceiptTheme.borderRadius.md,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.text,
    backgroundColor: BioReceiptTheme.colors.background,
    minHeight: 40,
  },
  substancesList: {
    flex: 1,
  },
  substancesListContent: {
    paddingBottom: BioReceiptTheme.spacing.xl,
  },
  categorySection: {
    marginBottom: BioReceiptTheme.spacing.lg,
  },
  categoryTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.primary,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.sm,
    backgroundColor: BioReceiptTheme.colors.surfaceLight,
  },
  substanceItem: {
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
    backgroundColor: BioReceiptTheme.colors.surface,
    minHeight: 60, // Accessibility: minimum touch target
    justifyContent: 'center',
  },
  customSubstanceItem: {
    borderLeftWidth: 3,
    borderLeftColor: BioReceiptTheme.colors.secondary,
    backgroundColor: BioReceiptTheme.colors.surfaceLight,
  },
  substanceInfo: {
    flex: 1,
  },
  substanceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  substanceName: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
    color: BioReceiptTheme.colors.text,
    flex: 1,
  },
  customBadge: {
    backgroundColor: BioReceiptTheme.colors.secondary,
    paddingHorizontal: BioReceiptTheme.spacing.xs,
    paddingVertical: 2,
    borderRadius: BioReceiptTheme.borderRadius.sm,
    marginLeft: BioReceiptTheme.spacing.sm,
  },
  customBadgeText: {
    fontSize: BioReceiptTheme.typography.fontSize.xs,
    color: BioReceiptTheme.colors.surface,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  substanceDetails: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
  },
  substanceDescription: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textTertiary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    bottom: BioReceiptTheme.spacing.xl,
    right: BioReceiptTheme.spacing.lg,
    backgroundColor: BioReceiptTheme.colors.primary,
    borderRadius: 28,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minHeight: 56,
  },
  fabIcon: {
    fontSize: 24,
    color: BioReceiptTheme.colors.surface,
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    marginRight: BioReceiptTheme.spacing.xs,
  },
  fabText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.surface,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: BioReceiptTheme.spacing.xl,
  },
  loadingText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.textSecondary,
    marginTop: BioReceiptTheme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.xl,
  },
  errorText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.error,
    textAlign: 'center',
    marginBottom: BioReceiptTheme.spacing.md,
  },
  retryButton: {
    backgroundColor: BioReceiptTheme.colors.primary,
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.sm,
    borderRadius: BioReceiptTheme.borderRadius.md,
    minHeight: 44,
  },
  retryButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.surface,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.xl,
  },
  emptyText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: BioReceiptTheme.spacing.md,
  },
  clearSearchButton: {
    backgroundColor: BioReceiptTheme.colors.secondary,
    paddingHorizontal: BioReceiptTheme.spacing.md,
    paddingVertical: BioReceiptTheme.spacing.sm,
    borderRadius: BioReceiptTheme.borderRadius.md,
    minHeight: 40,
  },
  clearSearchButtonText: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.surface,
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  quickAccessSection: {
    paddingHorizontal: BioReceiptTheme.spacing.lg,
    paddingVertical: BioReceiptTheme.spacing.md,
    backgroundColor: BioReceiptTheme.colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: BioReceiptTheme.colors.border,
  },
  quickAccessTitle: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    fontWeight: BioReceiptTheme.typography.fontWeight.semibold,
    color: BioReceiptTheme.colors.primary,
    marginBottom: 2,
  },
  quickAccessSubtitle: {
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textSecondary,
  },
});

export default SubstanceSelector;