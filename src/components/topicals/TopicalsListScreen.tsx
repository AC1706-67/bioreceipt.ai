/**
 * Topicals List Screen
 * Shows all topical products with search, filtering, and add product functionality
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTopicalsStore, topicalsSelectors } from '../../stores/topicalsStore';
import { TOPICAL_CATEGORIES, TopicalCategory, TopicalProduct } from '../../types/topicals';
import { barcodeService } from '../../services/barcode/barcodeService';

interface TopicalsListScreenProps {
  navigation: any;
}

const TopicalsListScreen: React.FC<TopicalsListScreenProps> = ({ navigation }) => {
  const {
    searchQuery,
    selectedCategory,
    isLoading,
    error,
    barcodeScanning,
    setSearchQuery,
    setSelectedCategory,
    setBarcodeScanning,
    addProduct,
    setLoading,
    setError,
    syncWithServer,
  } = useTopicalsStore();

  const filteredProducts = useTopicalsStore(topicalsSelectors.getFilteredProducts);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Initialize barcode service
    barcodeService.initialize().catch(console.error);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncWithServer();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddProduct = () => {
    Alert.alert(
      'Add Product',
      'How would you like to add a product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Scan Barcode', 
          onPress: handleBarcodeScanning,
          style: 'default',
        },
        { 
          text: 'Manual Entry', 
          onPress: () => navigation.navigate('AddProduct'),
          style: 'default',
        },
      ]
    );
  };

  const handleBarcodeScanning = async () => {
    try {
      setBarcodeScanning(true);
      setError(null);

      const result = await barcodeService.startScanning({
        enableVibration: true,
        enableSound: true,
        showFrame: true,
        frameColor: '#00FF00',
        timeout: 30000,
      });

      // Look up product by barcode
      const productData = await barcodeService.lookupProduct(result.data);
      
      if (productData) {
        // Navigate to add product screen with pre-filled data
        navigation.navigate('AddProduct', { 
          productData: {
            name: productData.name,
            brand: productData.brand,
            category: productData.category,
            barcode: result.data,
            upc: result.data,
          }
        });
      } else {
        // Product not found, allow manual entry with barcode
        navigation.navigate('AddProduct', { 
          productData: {
            barcode: result.data,
            upc: result.data,
          }
        });
      }

    } catch (error) {
      if (error.message !== 'User cancelled') {
        setError(`Barcode scanning failed: ${error.message}`);
        Alert.alert(
          'Scanning Error',
          error.message,
          [
            { text: 'OK' },
            { text: 'Try Again', onPress: handleBarcodeScanning },
          ]
        );
      }
    } finally {
      setBarcodeScanning(false);
      await barcodeService.stopScanning();
    }
  };

  const handleProductPress = (product: TopicalProduct) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const renderCategoryFilter = () => {
    const categories: Array<TopicalCategory | 'all'> = ['all', ...Object.keys(TOPICAL_CATEGORIES) as TopicalCategory[]];
    
    return (
      <View style={styles.categoryFilter}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            const categoryData = item === 'all' 
              ? { label: 'All', icon: '📦', color: '#F0F0F0' }
              : TOPICAL_CATEGORIES[item];
            
            return (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                  { backgroundColor: isSelected ? categoryData.color : '#F8F8F8' }
                ]}
                onPress={() => setSelectedCategory(item)}
                accessible={true}
                accessibilityLabel={`Filter by ${categoryData.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={styles.categoryIcon}>{categoryData.icon}</Text>
                <Text style={[
                  styles.categoryLabel,
                  isSelected && styles.categoryLabelSelected
                ]}>
                  {categoryData.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  const renderProductItem = ({ item }: { item: TopicalProduct }) => {
    const categoryData = TOPICAL_CATEGORIES[item.category];
    
    return (
      <TouchableOpacity
        style={styles.productItem}
        onPress={() => handleProductPress(item)}
        accessible={true}
        accessibilityLabel={`${item.name} by ${item.brand || 'Unknown brand'}, ${categoryData.label} product`}
        accessibilityHint="Double tap to view product details"
        accessibilityRole="button"
      >
        <View style={styles.productIcon}>
          <Text style={styles.productIconText}>{categoryData.icon}</Text>
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          {item.brand && (
            <Text style={styles.productBrand}>{item.brand}</Text>
          )}
          <Text style={styles.productCategory}>{categoryData.label}</Text>
        </View>
        
        <View style={styles.productActions}>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🧴</Text>
      <Text style={styles.emptyStateTitle}>No Products Yet</Text>
      <Text style={styles.emptyStateMessage}>
        Add your first topical product by scanning a barcode or entering details manually.
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={handleAddProduct}
        accessible={true}
        accessibilityLabel="Add your first product"
        accessibilityRole="button"
      >
        <Text style={styles.emptyStateButtonText}>Add Product</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessible={true}
          accessibilityLabel="Search products"
          accessibilityHint="Type to search your topical products"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.errorDismiss}
            onPress={() => setError(null)}
            accessible={true}
            accessibilityLabel="Dismiss error"
            accessibilityRole="button"
          >
            <Text style={styles.errorDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        contentContainerStyle={filteredProducts.length === 0 ? styles.emptyContainer : undefined}
        accessible={true}
        accessibilityLabel={`Products list, ${filteredProducts.length} items`}
      />

      {/* Add Product Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddProduct}
        disabled={barcodeScanning}
        accessible={true}
        accessibilityLabel="Add new product"
        accessibilityHint="Add a product by scanning barcode or manual entry"
        accessibilityRole="button"
      >
        <Text style={styles.addButtonText}>
          {barcodeScanning ? '📷 Scanning...' : '+ Add Product'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  searchInput: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  categoryFilter: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F8F8F8',
    minHeight: 44, // Accessibility touch target
  },
  categoryChipSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#666666',
  },
  categoryLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE6E6',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    color: '#D32F2F',
    fontSize: 14,
  },
  errorDismiss: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorDismissText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 72, // Accessibility touch target
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productIconText: {
    fontSize: 20,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#999999',
    textTransform: 'capitalize',
  },
  productActions: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  chevron: {
    fontSize: 18,
    color: '#C7C7CC',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TopicalsListScreen;