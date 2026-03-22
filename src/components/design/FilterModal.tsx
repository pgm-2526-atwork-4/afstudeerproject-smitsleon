import { FilterState } from '@/core/types';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialFilters: FilterState;
  onApply: (filters: FilterState) => void;
}

export function FilterModal({ visible, onClose, initialFilters, onApply }: Props) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state when opened
  React.useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
      setValidationError(null);
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    // Date validation
    if (filters.startDate && filters.endDate && filters.endDate < filters.startDate) {
      setValidationError('Einddatum mag niet vóór startdatum liggen.');
      return;
    }
    // Group size validation
    const min = filters.minGroupSize ? parseInt(filters.minGroupSize, 10) : 0;
    const max = filters.maxGroupSize ? parseInt(filters.maxGroupSize, 10) : Infinity;
    if (filters.minGroupSize && filters.maxGroupSize && min > max) {
      setValidationError('Min groepsgrootte mag niet groter zijn dan max.');
      return;
    }
    setValidationError(null);
    onApply(filters);
  };

  const handleClear = () => {
    const cleared: FilterState = {
      groupsOnly: false,
      minGroupSize: '',
      maxGroupSize: '',
      startDate: null,
      endDate: null,
    };
    setFilters(cleared);
    setValidationError(null);
  };

  const onStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartDate(Platform.OS === 'ios');
    if (selectedDate) {
      setFilters((prev) => ({
        ...prev,
        startDate: selectedDate,
        endDate: prev.endDate && prev.endDate < selectedDate ? null : prev.endDate,
      }));
      setValidationError(null);
    }
  };

  const onEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndDate(Platform.OS === 'ios');
    if (selectedDate) {
      setFilters((prev) => ({ ...prev, endDate: selectedDate }));
      setValidationError(null);
    }
  };

  const formatDate = (d: Date | null) => {
    if (!d) return 'dd/mm/yyyy';
    return d.toLocaleDateString('nl-BE');
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
              {/* Checkbox Group */}
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.7}
                onPress={() => setFilters((prev) => ({ ...prev, groupsOnly: !prev.groupsOnly }))}
              >
                <View style={[styles.checkbox, filters.groupsOnly && styles.checkboxActive]}>
                  {filters.groupsOnly && <Ionicons name="checkmark" size={16} color={Colors.background} />}
                </View>
                <Text style={styles.checkboxLabel}>Alleen concerten met bestaande groepen</Text>
              </TouchableOpacity>

              {/* Group Size  */}
              {filters.groupsOnly && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Groepsgrootte:</Text>
                  <View style={styles.row}>
                    <TextInput
                      style={styles.numberInput}
                      keyboardType="number-pad"
                      placeholder="Min"
                      placeholderTextColor={Colors.textMuted}
                      value={filters.minGroupSize}
                      onChangeText={(val) => setFilters((prev) => ({ ...prev, minGroupSize: val }))}
                    />
                    <Text style={styles.rowText}>tot</Text>
                    <TextInput
                      style={styles.numberInput}
                      keyboardType="number-pad"
                      placeholder="Max"
                      placeholderTextColor={Colors.textMuted}
                      value={filters.maxGroupSize}
                      onChangeText={(val) => setFilters((prev) => ({ ...prev, maxGroupSize: val }))}
                    />
                  </View>
                </View>
              )}

              {/* Date Filter */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Datum:</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDate(true)}
                  >
                    <Text style={[styles.dateText, !filters.startDate && styles.dateTextPlaceholder]}>
                      {formatDate(filters.startDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color={filters.startDate ? Colors.text : Colors.textMuted} />
                  </TouchableOpacity>
                  {(showStartDate && Platform.OS === 'android') && (
                    <DateTimePicker
                      value={filters.startDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={onStartDateChange}
                    />
                  )}

                  <Text style={styles.rowText}>tot</Text>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndDate(true)}
                  >
                    <Text style={[styles.dateText, !filters.endDate && styles.dateTextPlaceholder]}>
                      {formatDate(filters.endDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color={filters.endDate ? Colors.text : Colors.textMuted} />
                  </TouchableOpacity>
                  {(showEndDate && Platform.OS === 'android') && (
                    <DateTimePicker
                      value={filters.endDate || new Date()}
                      mode="date"
                      display="default"
                      minimumDate={filters.startDate || undefined}
                      onChange={onEndDateChange}
                    />
                  )}
                </View>
                {Platform.OS === 'ios' && showStartDate && (
                  <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerHeader}>
                      <TouchableOpacity onPress={() => setShowStartDate(false)}>
                        <Text style={styles.iosPickerDone}>Gereed</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={filters.startDate || new Date()}
                      mode="date"
                      display="spinner"
                      onChange={onStartDateChange}
                    />
                  </View>
                )}
                {Platform.OS === 'ios' && showEndDate && (
                  <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerHeader}>
                      <TouchableOpacity onPress={() => setShowEndDate(false)}>
                        <Text style={styles.iosPickerDone}>Gereed</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={filters.endDate || new Date()}
                      mode="date"
                      display="spinner"
                      minimumDate={filters.startDate || undefined}
                      onChange={onEndDateChange}
                    />
                  </View>
                )}
              </View>
      </View>

      {/* Validation error */}
      {validationError && (
        <Text style={styles.errorText}>{validationError}</Text>
      )}

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearText}>Filters wissen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
          <Text style={styles.applyText}>Toepassen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.md,
  },
  content: {
    gap: Spacing.xl,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
    flexShrink: 1,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  numberInput: {
    backgroundColor: Colors.surfaceLight,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    fontSize: FontSizes.md,
    minWidth: 80,
    textAlign: 'center',
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  dateText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
  },
  dateTextPlaceholder: {
    color: Colors.textMuted,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  clearBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.full,
  },
  clearText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
  },
  applyText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
  },
  iosPickerContainer: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    alignItems: 'flex-end',
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iosPickerDone: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: FontSizes.md,
  },
});
