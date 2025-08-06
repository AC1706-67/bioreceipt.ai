/**
 * Test Component for Custom Substance Feature
 * Run this to test the custom substance addition functionality
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import SubstanceSelector from './src/components/logging/SubstanceSelector';
import { supabaseHelpers } from './src/config/supabase';

interface Substance {
  id: string;
  name: string;
  category: string;
  default_unit: string;
  description?: string;
}

const TestCustomSubstance: React.FC = () => {
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [selectedSubstance, setSelectedSubstance] = useState<Substance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubstances();
  }, []);

  const loadSubstances = async () => {
    try {
      setIsLoading(true);
      const data = await supabaseHelpers.getSubstances();
      
      // Transform data to match expected format
      const transformedData = data.map(item => ({
        id: item.id,
        name: item.name,
        category: item.substance_categories.name,
        default_unit: item.default_unit,
        description: item.description || undefined,
      }));
      
      setSubstances(transformedData);
    } catch (error) {
      console.error('Error loading substances:', error);
      Alert.alert('Error', 'Failed to load substances');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubstanceAdded = (newSubstance: any) => {
    // Transform the new substance to match expected format
    const transformedSubstance = {
      id: newSubstance.id,
      name: newSubstance.name,
      category: newSubstance.substance_categories.name,
      default_unit: newSubstance.default_unit,
      description: newSubstance.description || undefined,
    };

    // Add to substances list
    setSubstances(prev => [...prev, transformedSubstance]);
    
    console.log('New substance added:', transformedSubstance);
  };

  return (
    <View style={styles.container}>
      <SubstanceSelector
        substances={substances}
        selectedSubstance={selectedSubstance}
        onSelectSubstance={setSelectedSubstance}
        onSubstanceAdded={handleSubstanceAdded}
        isLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
});

export default TestCustomSubstance;