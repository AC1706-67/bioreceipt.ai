/**
 * Insight Feedback Modal
 * Modal for collecting user feedback on progress insights
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert
} from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';

interface InsightFeedbackModalProps {
  visible: boolean;
  insightTitle: string;
  currentFeedback?: {
    helpful: boolean;
    rating: number;
    comment?: string;
  };
  onSubmit: (feedback: {
    helpful: boolean;
    rating: number;
    comment?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const InsightFeedbackModal: React.FC<InsightFeedbackModalProps> = ({
  visible,
  insightTitle,
  currentFeedback,
  onSubmit,
  onClose
}) => {
  const [helpful, setHelpful] = useState(currentFeedback?.helpful ?? true);
  const [rating, setRating] = useState(currentFeedback?.rating ?? 5);
  const [comment, setComment] = useState(currentFeedback?.comment ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      Alert.alert('Invalid Rating', 'Please select a rating between 1 and 5 stars.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        helpful,
        rating,
        comment: comment.trim() || undefined
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarRating = () => (
    <View style={styles.starContainer}>
      <Text style={styles.ratingLabel}>Rate this insight:</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Text style={[
              styles.star,
              star <= rating ? styles.starFilled : styles.starEmpty
            ]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderHelpfulButtons = () => (
    <View style={styles.helpfulContainer}>
      <Text style={styles.helpfulLabel}>Was this insight helpful?</Text>
      <View style={styles.helpfulButtons}>
        <TouchableOpacity
          style={[
            styles.helpfulButton,
            helpful && styles.helpfulButtonActive
          ]}
          onPress={() => setHelpful(true)}
        >
          <Text style={[
            styles.helpfulButtonText,
            helpful && styles.helpfulButtonTextActive
          ]}>
            👍 Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.helpfulButton,
            !helpful && styles.helpfulButtonActive
          ]}
          onPress={() => setHelpful(false)}
        >
          <Text style={[
            styles.helpfulButtonText,
            !helpful && styles.helpfulButtonTextActive
          ]}>
            👎 No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Rate Insight</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.insightTitle} numberOfLines={2}>
            "{insightTitle}"
          </Text>

          {renderHelpfulButtons()}
          {renderStarRating()}

          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Additional comments (optional):</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Share your thoughts about this insight..."
              placeholderTextColor={BioReceiptTheme.colors.textSecondary}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <Text style={styles.characterCount}>{comment.length}/500</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: BioReceiptTheme.colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BioReceiptTheme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: BioReceiptTheme.colors.textSecondary,
  },
  insightTitle: {
    fontSize: 16,
    color: BioReceiptTheme.colors.text,
    marginBottom: 20,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  helpfulContainer: {
    marginBottom: 20,
  },
  helpfulLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: BioReceiptTheme.colors.text,
    marginBottom: 12,
  },
  helpfulButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  helpfulButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: BioReceiptTheme.colors.background,
    borderWidth: 2,
    borderColor: BioReceiptTheme.colors.border,
    alignItems: 'center',
  },
  helpfulButtonActive: {
    backgroundColor: BioReceiptTheme.colors.primary + '20',
    borderColor: BioReceiptTheme.colors.primary,
  },
  helpfulButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BioReceiptTheme.colors.text,
  },
  helpfulButtonTextActive: {
    color: BioReceiptTheme.colors.primary,
  },
  starContainer: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: BioReceiptTheme.colors.text,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 32,
  },
  starFilled: {
    color: '#FFD700',
  },
  starEmpty: {
    color: BioReceiptTheme.colors.border,
  },
  commentContainer: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: BioReceiptTheme.colors.text,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: BioReceiptTheme.colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: BioReceiptTheme.colors.text,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: BioReceiptTheme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: BioReceiptTheme.colors.background,
    borderWidth: 1,
    borderColor: BioReceiptTheme.colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: BioReceiptTheme.colors.text,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: BioReceiptTheme.colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: BioReceiptTheme.colors.textSecondary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default InsightFeedbackModal;