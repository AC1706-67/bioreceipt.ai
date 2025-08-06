/**
 * Intake Logging Screen
 * Main interface for logging substance intake in BioPulse.AI
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Substance, SubstanceCategory } from '../../models/Substance';
import { SubstanceIntake } from '../../models/SubstanceIntake';
import { substanceDatabase } from '../../services/substance/substanceDatabase';
import { intakeLoggingService } from '../../services/substance/intakeLoggingService';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { BioPulseTheme, SubstanceCategoryIcons, NavigationIcons } from '../../constants/bioPulseTheme';
import PhotoCaptureButton from '../photo/PhotoCaptureButton';
import PhotoPreview from '../photo/PhotoPreview';
import SubstanceSelector from '../logging/SubstanceSelector';
import { OfflineQueueStatus } from '../photo/OfflineQueueStatus';

interface Props {
  userId: string;
  onIntakeLogged?: (intake: SubstanceIntake) => void;
  onClose?: () => void;
  preselectedSubstance?: Substance | null;
  onSubstanceAdded?: (substance: Substance) => void;
}

const IntakeLoggingScreen: React.FC<Props> = ({ userId, onIntakeLogged, onClose, preselectedSubstance, onSubstanceAdded }) => {
  const [selectedSubstance, setSelectedSubstance] = useState<Substance | null>(null);
  const [quantity, setQuantity] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [timestamp, setTimestamp] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [context, setContext] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Substance[]>([]);
  const [showSearch, setShowSearch] = useState(true);
  const [showSubstanceSelector, setShowSubstanceSelector] = useState(false);
  const [recentIntakes, setRecentIntakes] = useState<SubstanceIntake[]>([]);
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);

  const { handleError } = useErrorHandler({
    context: { feature: 'intake_logging', currentScreen: 'IntakeLoggingScreen' }
  });

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Handle preselected substance
  useEffect(() => {
    if (preselectedSubstance) {
      selectSubstance(preselectedSubstance);
    }
  }, [preselectedSubstance]);

  const initializeScreen = async () => {
    try {
      // Initialize substance database
      await substanceDatabase.initialize();
      await intakeLoggingService.initialize();

      // Load recent intakes for quick access
      const recent = await intakeLoggingService.getRecentIntakes(userId, 24);
      setRecentIntakes(recent);

      // Show popular substances initially
      const popular = substanceDatabase.getPopularSubstances(undefined, 10);
      setSearchResults(popular);
    } catch (error) {
      await handleError(error as Error);
    }
  };

  const performSearch = async () => {
    try {
      const results = substanceDatabase.searchSubstances(searchQuery, undefined, 20);
      setSearchResults(results);
    } catch (error) {
      await handleError(error as Error);
    }
  };

  const selectSubstance = (substance: Substance) => {
    setSelectedSubstance(substance);
    setSelectedUnit(substance.commonUnits[0] || '');
    setShowSearch(false);
    setSearchQuery(substance.name);
  };

  const logIntake = async () => {
    if (!selectedSubstance || !quantity || !selectedUnit) {
      Alert.alert('Missing Information', 'Please select a substance, enter quantity, and choose a unit.');
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive number for quantity.');
      return;
    }

    setIsLogging(true);

    try {
      const intake = await intakeLoggingService.logIntake(
        userId,
        selectedSubstance.id,
        quantityNum,
        selectedUnit,
        timestamp,
        notes || undefined,
        context || undefined
      );

      Alert.alert(
        'Intake Logged',
        `Successfully logged ${quantityNum} ${selectedUnit} of ${selectedSubstance.name}`,
        [
          {
            text: 'Log Another',
            onPress: resetForm
          },
          {
            text: 'Done',
            onPress: () => {
              onIntakeLogged?.(intake);
              onClose?.();
            }
          }
        ]
      );
    } catch (error) {
      await handleError(error as Error);
      Alert.alert('Error', 'Failed to log intake. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const resetForm = () => {
    setSelectedSubstance(null);
    setQuantity('');
    setSelectedUnit('');
    setNotes('');
    setContext('');
    setSearchQuery('');
    setShowSearch(true);
    setTimestamp(new Date());
    setAttachedPhotos([]);
  };

  const handlePhotoCapture = (photoUrl: string) => {
    setAttachedPhotos(prev => [...prev, photoUrl]);
  };

  const handlePhotoError = (error: string) => {
    Alert.alert('Photo Error', error);
  };

  const handlePhotoDelete = (photoUrl: string) => {
    setAttachedPhotos(prev => prev.filter(url => url !== photoUrl));
  };

  const handleSubstanceAddedInternal = (substance: Substance) => {
    // Auto-select the newly added substance
    selectSubstance(substance);
    
    // Close the substance selector
    setShowSubstanceSelector(false);
    
    // Notify parent component if callback provided
    if (onSubstanceAdded) {
      onSubstanceAdded(substance);
    }
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderSubstanceSearch = () => {
    if (!showSearch) return null;

    return (
      <View style={styles.searchSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Substance</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => setShowSubstanceSelector(true)}
            accessible={true}
            accessibilityLabel="Browse all substances"
            accessibilityHint="Opens substance selector with option to add custom substances"
          >
            <Text style={styles.browseButtonText}>Browse All</Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={styles.searchInput}
          placeholder="Search substances..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
          {searchResults.map((substance) => (
            <TouchableOpacity
              key={substance.id}
              style={styles.substanceItem}
              onPress={() => selectSubstance(substance)}
            >
              <View style={styles.substanceInfo}>
                <Text style={styles.substanceName}>{substance.name}</Text>
                <Text style={styles.substanceCategory}>{substance.category}</Text>
              </View>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(substance.category) }]}>
                <Text style={styles.categoryBadgeText}>{substance.category.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {searchQuery.length > 0 && searchResults.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No substances found for "{searchQuery}"</Text>
              <TouchableOpacity
                style={styles.addCustomButton}
                onPress={() => setShowSubstanceSelector(true)}
                accessible={true}
                accessibilityLabel="Add custom substance"
                accessibilityHint="Opens substance selector to add a new custom substance"
              >
                <Text style={styles.addCustomButtonText}>+ Add Custom Substance</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderQuantityInput = () => {
    if (!selectedSubstance) return null;

    return (
      <View style={styles.quantitySection}>
        <Text style={styles.sectionTitle}>Quantity & Unit</Text>
        
        <View style={styles.quantityRow}>
          <TextInput
            style={styles.quantityInput}
            placeholder="0"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
          
          <ScrollView horizontal style={styles.unitSelector} showsHorizontalScrollIndicator={false}>
            {selectedSubstance.commonUnits.map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.unitButton,
                  selectedUnit === unit && styles.unitButtonSelected
                ]}
                onPress={() => setSelectedUnit(unit)}
              >
                <Text style={[
                  styles.unitButtonText,
                  selectedUnit === unit && styles.unitButtonTextSelected
                ]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedSubstance.dosageInfo.length > 0 && (
          <View style={styles.dosageInfo}>
            <Text style={styles.dosageTitle}>Typical Dosages:</Text>
            {selectedSubstance.dosageInfo[0].light && (
              <Text style={styles.dosageText}>Light: {selectedSubstance.dosageInfo[0].light} {selectedSubstance.dosageInfo[0].unit}</Text>
            )}
            {selectedSubstance.dosageInfo[0].common && (
              <Text style={styles.dosageText}>Common: {selectedSubstance.dosageInfo[0].common} {selectedSubstance.dosageInfo[0].unit}</Text>
            )}
            {selectedSubstance.dosageInfo[0].strong && (
              <Text style={styles.dosageText}>Strong: {selectedSubstance.dosageInfo[0].strong} {selectedSubstance.dosageInfo[0].unit}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderTimestampSelector = () => {
    return (
      <View style={styles.timestampSection}>
        <Text style={styles.sectionTitle}>When</Text>
        <TouchableOpacity style={styles.timestampButton}>
          <Text style={styles.timestampText}>{formatTimestamp(timestamp)}</Text>
          <Text style={styles.timestampSubtext}>Tap to change</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderNotesSection = () => {
    return (
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        
        <TextInput
          style={styles.contextInput}
          placeholder="Context (e.g., with meal, social, workout)"
          value={context}
          onChangeText={setContext}
          autoCapitalize="sentences"
        />
        
        <TextInput
          style={styles.notesInput}
          placeholder="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
        />

        {/* Photo Attachment Section */}
        <View style={styles.photoSection}>
          <View style={styles.photoHeader}>
            <Text style={styles.photoSectionTitle}>Photos</Text>
            <PhotoCaptureButton
              onPhotoCapture={handlePhotoCapture}
              onError={handlePhotoError}
              size="medium"
            />
          </View>
          
          {attachedPhotos.length > 0 && (
            <View style={styles.photoPreviewContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {attachedPhotos.map((photoUrl, index) => (
                  <View key={index} style={styles.photoPreviewWrapper}>
                    <PhotoPreview
                      photoUrl={photoUrl}
                      size={80}
                      onDelete={() => handlePhotoDelete(photoUrl)}
                      showControls={true}
                    />
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.photoCount}>
                {attachedPhotos.length} {attachedPhotos.length === 1 ? 'photo' : 'photos'} attached
              </Text>
            </View>
          )}
          
          {attachedPhotos.length === 0 && (
            <Text style={styles.photoHint}>
              Tap the camera button to add photos of your intake
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderSelectedSubstance = () => {
    if (!selectedSubstance) return null;

    return (
      <View style={styles.selectedSubstance}>
        <View style={styles.selectedSubstanceInfo}>
          <Text style={styles.selectedSubstanceName}>{selectedSubstance.name}</Text>
          <Text style={styles.selectedSubstanceCategory}>{selectedSubstance.category}</Text>
        </View>
        <TouchableOpacity
          style={styles.changeButton}
          onPress={() => setShowSearch(true)}
        >
          <Text style={styles.changeButtonText}>Change</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecentIntakes = () => {
    if (recentIntakes.length === 0) return null;

    return (
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Intakes (24h)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recentIntakes.slice(0, 5).map((intake) => (
            <TouchableOpacity
              key={intake.id}
              style={styles.recentItem}
              onPress={() => {
                // Quick log same substance
                const substance = substanceDatabase.getSubstanceById(intake.substanceId);
                if (substance) {
                  selectSubstance(substance);
                  setQuantity(intake.quantity.toString());
                  setSelectedUnit(intake.unit);
                }
              }}
            >
              <Text style={styles.recentItemName}>{intake.substanceName}</Text>
              <Text style={styles.recentItemDetails}>
                {intake.quantity} {intake.unit}
              </Text>
              <Text style={styles.recentItemTime}>
                {formatTimestamp(intake.timestamp)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const getCategoryColor = (category: SubstanceCategory): string => {
    const colors = {
      [SubstanceCategory.ALCOHOL]: BioPulseTheme.colors.alcohol,
      [SubstanceCategory.DRUGS_RECREATIONAL]: BioPulseTheme.colors.drugs,
      [SubstanceCategory.DRUGS_PRESCRIPTION]: BioPulseTheme.colors.drugs,
      [SubstanceCategory.DRUGS_OTC]: BioPulseTheme.colors.drugs,
      [SubstanceCategory.FOOD]: BioPulseTheme.colors.food,
      [SubstanceCategory.SUPPLEMENTS]: BioPulseTheme.colors.supplements,
      [SubstanceCategory.STEROIDS]: BioPulseTheme.colors.steroids,
      [SubstanceCategory.NOOTROPICS]: BioPulseTheme.colors.supplements,
      [SubstanceCategory.HORMONES]: BioPulseTheme.colors.hormones,
      [SubstanceCategory.OTHER]: BioPulseTheme.colors.textTertiary
    };
    return colors[category] || BioPulseTheme.colors.textTertiary;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Log Intake</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <OfflineQueueStatus compact={true} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderRecentIntakes()}
        
        {showSearch ? renderSubstanceSearch() : renderSelectedSubstance()}
        
        {renderQuantityInput()}
        
        {renderTimestampSelector()}
        
        {renderNotesSection()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.logButton,
            (!selectedSubstance || !quantity || !selectedUnit || isLogging) && styles.logButtonDisabled
          ]}
          onPress={logIntake}
          disabled={!selectedSubstance || !quantity || !selectedUnit || isLogging}
        >
          <Text style={styles.logButtonText}>
            {isLogging ? 'Logging...' : 'Log Intake'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Substance Selector Modal */}
      {showSubstanceSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <SubstanceSelector
              selectedSubstance={selectedSubstance}
              onSelectSubstance={(substance) => {
                selectSubstance(substance);
                setShowSubstanceSelector(false);
              }}
              onSubstanceAdded={handleSubstanceAddedInternal}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSubstanceSelector(false)}
              accessible={true}
              accessibilityLabel="Close substance selector"
              accessibilityRole="button"
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioPulseTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: BioPulseTheme.spacing.lg,
    backgroundColor: BioPulseTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: BioPulseTheme.colors.border,
  },
  headerTitle: {
    fontSize: BioPulseTheme.typography.fontSize['2xl'],
    fontWeight: BioPulseTheme.typography.fontWeight.bold,
    color: BioPulseTheme.colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recentItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recentItemDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  recentItemTime: {
    fontSize: 10,
    color: '#999',
  },
  searchSection: {
    marginBottom: 24,
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    marginBottom: 12,
  },
  searchResults: {
    maxHeight: 300,
  },
  substanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  substanceInfo: {
    flex: 1,
  },
  substanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  substanceCategory: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectedSubstance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  selectedSubstanceInfo: {
    flex: 1,
  },
  selectedSubstanceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedSubstanceCategory: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  changeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  changeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quantityInput: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 100,
    marginRight: 16,
  },
  unitSelector: {
    flex: 1,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  unitButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  unitButtonTextSelected: {
    color: '#fff',
  },
  dosageInfo: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  dosageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 8,
  },
  dosageText: {
    fontSize: 12,
    color: '#0066cc',
    marginBottom: 2,
  },
  timestampSection: {
    marginBottom: 24,
  },
  timestampButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  timestampText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  timestampSubtext: {
    fontSize: 12,
    color: '#666',
  },
  notesSection: {
    marginBottom: 24,
  },
  contextInput: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    marginBottom: 12,
  },
  notesInput: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  logButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  logButtonDisabled: {
    backgroundColor: '#ccc',
  },
  logButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  photoSection: {
    marginTop: 16,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BioPulseTheme.colors.textPrimary,
  },
  photoPreviewContainer: {
    marginTop: 12,
  },
  photoPreviewWrapper: {
    marginRight: 12,
  },
  photoCount: {
    fontSize: 12,
    color: BioPulseTheme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  photoHint: {
    fontSize: 14,
    color: BioPulseTheme.colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: BioPulseTheme.spacing.sm,
  },
  browseButton: {
    backgroundColor: BioPulseTheme.colors.secondary,
    paddingHorizontal: BioPulseTheme.spacing.md,
    paddingVertical: BioPulseTheme.spacing.xs,
    borderRadius: BioPulseTheme.borderRadius.sm,
  },
  browseButtonText: {
    fontSize: BioPulseTheme.typography.fontSize.sm,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
    color: BioPulseTheme.colors.surface,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: BioPulseTheme.spacing.xl,
  },
  noResultsText: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    color: BioPulseTheme.colors.textSecondary,
    marginBottom: BioPulseTheme.spacing.md,
    textAlign: 'center',
  },
  addCustomButton: {
    backgroundColor: BioPulseTheme.colors.primary,
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingVertical: BioPulseTheme.spacing.md,
    borderRadius: BioPulseTheme.borderRadius.md,
  },
  addCustomButtonText: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
    color: BioPulseTheme.colors.surface,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: BioPulseTheme.colors.surface,
    borderRadius: BioPulseTheme.borderRadius.lg,
    padding: BioPulseTheme.spacing.lg,
    width: '90%',
    maxHeight: '80%',
  },
  modalCloseButton: {
    backgroundColor: BioPulseTheme.colors.border,
    paddingHorizontal: BioPulseTheme.spacing.lg,
    paddingVertical: BioPulseTheme.spacing.md,
    borderRadius: BioPulseTheme.borderRadius.md,
    alignSelf: 'center',
    marginTop: BioPulseTheme.spacing.md,
  },
  modalCloseButtonText: {
    fontSize: BioPulseTheme.typography.fontSize.md,
    fontWeight: BioPulseTheme.typography.fontWeight.medium,
    color: BioPulseTheme.colors.text,
  },
});

export default IntakeLoggingScreen;