import { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Text,
  Appbar,
  Button,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, Stop } from '../types';
import { createSuggestion } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';
import { TRANSPORT_ICONS } from '../constants/transport';
import StopSearchInput from '../components/StopSearchInput';

type Props = NativeStackScreenProps<RootStackParamList, 'SuggestConnection'>;

type TransportType = 'communal_taxi' | 'gbaka' | 'sotra_bus' | 'walking';

export default function SuggestConnectionScreen({ navigation }: Props) {
  const deviceId = useDeviceId();

  const [fromStop, setFromStop] = useState<Stop | null>(null);
  const [toStop, setToStop] = useState<Stop | null>(null);
  const [transportType, setTransportType] = useState<TransportType>('communal_taxi');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!deviceId) {
      Alert.alert('Error', 'Unable to identify device. Please try again.');
      return;
    }

    if (!fromStop || !toStop) {
      Alert.alert('Error', 'Please select both origin and destination stops.');
      return;
    }

    if (fromStop.id === toStop.id) {
      Alert.alert('Error', 'Origin and destination cannot be the same.');
      return;
    }

    const priceNum = parseInt(price);
    const durationNum = parseInt(duration);

    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Error', 'Please enter a valid price.');
      return;
    }

    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Error', 'Please enter a valid duration.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createSuggestion({
        fromStopId: fromStop.id,
        toStopId: toStop.id,
        transportType,
        basePrice: priceNum,
        durationMinutes: durationNum,
        routeDescription: description || undefined,
        deviceId,
      });

      Alert.alert(
        '✅ Suggestion Submitted!',
        'Thank you for contributing! Your suggestion will be reviewed by the community. It needs 5 confirmations to become active.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit suggestion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = fromStop && toStop && price && duration && !isSubmitting;

  const renderContent = () => (
    <>
      <Text variant="titleMedium" style={styles.sectionLabel}>
        Help others discover new routes!
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Your suggestion will be verified by the community before becoming available.
      </Text>

      {/* Origin - Using StopSearchInput */}
      <StopSearchInput
        label="Point de départ"
        selectedStop={fromStop}
        onStopSelected={setFromStop}
        zIndex={2}
      />

      {/* Destination - Using StopSearchInput */}
      <StopSearchInput
        label="Destination"
        selectedStop={toStop}
        onStopSelected={setToStop}
        zIndex={1}
      />

      {/* Transport Type */}
      <View style={styles.field}>
        <Text variant="labelMedium" style={styles.fieldLabel}>Transport Type</Text>
        <SegmentedButtons
          value={transportType}
          onValueChange={(val) => setTransportType(val as TransportType)}
          buttons={[
            { value: 'communal_taxi', label: `${TRANSPORT_ICONS.communal_taxi} Taxi` },
            { value: 'gbaka', label: `${TRANSPORT_ICONS.gbaka} Gbaka` },
            { value: 'sotra_bus', label: `${TRANSPORT_ICONS.sotra_bus} SOTRA` },
            { value: 'walking', label: `${TRANSPORT_ICONS.walking} Walk` },
          ]}
        />
      </View>

      {/* Price & Duration */}
      <View style={styles.row}>
        <View style={[styles.field, styles.halfField]}>
          <Text variant="labelMedium" style={styles.fieldLabel}>Price (CFA)</Text>
          <TextInput
            mode="outlined"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="e.g. 300"
          />
        </View>
        <View style={[styles.field, styles.halfField]}>
          <Text variant="labelMedium" style={styles.fieldLabel}>Duration (min)</Text>
          <TextInput
            mode="outlined"
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            placeholder="e.g. 20"
          />
        </View>
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text variant="labelMedium" style={styles.fieldLabel}>Description (optional)</Text>
        <TextInput
          mode="outlined"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Gbaka from Adjamé to Yopougon"
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Submit Button */}
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!canSubmit}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
      </Button>

      <Text variant="bodySmall" style={styles.footerText}>
        Your device ID will be used to track your submissions.
        You can only confirm each suggestion once.
      </Text>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Suggest a Route" />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    marginBottom: 4,
    fontWeight: '600',
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 4,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 6,
  },
  footerText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
  },
});
