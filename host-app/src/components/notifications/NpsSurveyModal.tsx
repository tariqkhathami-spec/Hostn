import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { hostService } from '../../services/host.service';

interface NpsSurveyModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function NpsSurveyModal({ visible, onDismiss }: NpsSurveyModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  const submitMutation = useMutation({
    mutationFn: () => hostService.submitNps(rating!, comment || undefined),
    onSuccess: () => {
      Alert.alert(
        'شكراً لك',
        'تم إرسال تقييمك بنجاح',
        [{ text: 'حسناً', onPress: handleClose }],
      );
    },
    onError: () => {
      Alert.alert(
        'خطأ',
        'حدث خطأ أثناء إرسال التقييم. حاول مرة أخرى.',
      );
    },
  });

  const handleClose = () => {
    setRating(null);
    setComment('');
    onDismiss();
  };

  const handleSubmit = () => {
    if (rating === null) return;
    submitMutation.mutate();
  };

  const isSubmitDisabled = rating === null || submitMutation.isPending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.sheetWrapper}
            >
              <View style={styles.sheet}>
                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>

                {/* Title */}
                <Text style={styles.title}>
                  {'قيّم تجربتك مع منصة حسّن'}
                </Text>

                {/* Question 1 */}
                <Text style={styles.question}>
                  {'ما مدى احتمالية أن توصي بمنصة حسّن لمضيف آخر؟'}
                </Text>

                {/* Rating Scale */}
                <View style={styles.ratingRow}>
                  {RATINGS.map((num) => {
                    const isSelected = rating === num;
                    return (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.ratingCircle,
                          isSelected && styles.ratingCircleSelected,
                        ]}
                        onPress={() => setRating(num)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.ratingNumber,
                            isSelected && styles.ratingNumberSelected,
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Rating Labels */}
                <View style={styles.ratingLabels}>
                  <Text style={styles.ratingLabel}>
                    {'طبعاً أوصي'}
                  </Text>
                  <Text style={styles.ratingLabel}>
                    {'مستحيل أوصي'}
                  </Text>
                </View>

                {/* Question 2 */}
                <Text style={styles.question}>
                  {'ما الشيء الذي سيدفعك لمنح منصة حسّن درجة أعلى؟'}
                </Text>

                {/* Comment Input */}
                <TextInput
                  style={styles.textInput}
                  placeholder={'اكتب هنا (اختياري)'}
                  placeholderTextColor={Colors.textTertiary}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  textAlign="right"
                />

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isSubmitDisabled && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitDisabled}
                  activeOpacity={0.8}
                >
                  {submitMutation.isPending ? (
                    <ActivityIndicator color={Colors.textWhite} />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {'إرسال'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    ...Shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.base,
    left: Spacing.base,
    zIndex: 1,
  },
  title: {
    ...Typography.h3,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  question: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: Spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  ratingCircle: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingCircleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ratingNumber: {
    ...Typography.smallBold,
    color: Colors.textSecondary,
  },
  ratingNumberSelected: {
    color: Colors.textWhite,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  ratingLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 80,
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: Spacing.lg,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  submitButtonText: {
    ...Typography.bodyBold,
    color: Colors.textWhite,
  },
});
