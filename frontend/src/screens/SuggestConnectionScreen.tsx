import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
import { searchStops, createSuggestion } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';
import { TRANSPORT_LABELS, TRANSPORT_ICONS } from '../constants/transport';

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

  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromResults, setFromResults] = useState<Stop[]>([]);
  const [toResults, setToResults] = useState<Stop[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search for stops
  useEffect(() => {
    const search = async (query: string, setResults: (stops: Stop[]) => void) => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      try {
        const stops = await searchStops(query);
        setResults(stops);
      } catch {
        setResults([]);
      }
    };

    const timeout = setTimeout(() => {
      search(fromQuery, setFromResults);
    }, 400);
    return () => clearTimeout(timeout);
  }, [fromQuery]);

  useEffect(() => {
    const search = async (query: string, setResults: (stops: Stop[]) => void) => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      try {
        const stops = await searchStops(query);
        setResults(stops);
      } catch {
        setResults([]);
      }
    };

    const timeout = setTimeout(() => {
      search(toQuery, setToResults);
    }, 400);
    return () => clearTimeout(timeout);
  }, [toQuery]);

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

  const renderStopSelector = (
    label: string,
    query: string,
    setQuery: (q: string) => void,
    results: Stop[],
    setResults: (stops: Stop[]) => void,
    selectedStop: Stop | null,
    setSelectedStop: (stop: Stop | null) => void
  ) => (
    <View style={styles.stopSelector}>
      <Text variant="labelMedium" style={styles.stopLabel}>{label}</Text>
      <TextInput
        mode="outlined"
        value={query}
        onChangeText={setQuery}
        placeholder="Search for a stop..."
        right={selectedStop ? (
          <TextInput.Icon icon="close" onPress={() => {
            setSelectedStop(null);
            setQuery('');
          }} />
        ) : undefined}
      />
      {results.length > 0 && !selectedStop && (
        <View style={styles.resultsContainer}>
          {results.map((stop) => (
            <Button
              key={stop.id}
              mode="text"
              onPress={() => {
                setSelectedStop(stop);
                setQuery(stop.name);
                setResults([]);
              }}
              style={styles.resultItem}
              labelStyle={styles.resultLabel}
            >
              {stop.name} ({stop.commune})
            </Button>
          ))}
        </View>
      )}
      {selectedStop && (
        <View style={styles.selectedStop}>
          <Text variant="bodyMedium">{selectedStop.name}</Text>
          <Text variant="bodySmall" style={styles.selectedCommune}>
            {selectedStop.commune}
          </Text>
        </View>
      )}
    </View>
  );

  const canSubmit = fromStop && toStop && price && duration && !isSubmitting;

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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text variant="titleMedium" style={styles.sectionLabel}>
            Help others discover new routes!
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Your suggestion will be verified by the community before becoming available.
          </Text>

          {/* Origin */}
          {renderStopSelector(
            'Origin',
            fromQuery,
            setFromQuery,
            fromResults,
            setFromResults,
            fromStop,
            setFromStop
          )}

          {/* Destination */}
          {renderStopSelector(
            'Destination',
            toQuery,
            setToQuery,
            toResults,
            setToResults,
            toStop,
            setToStop
          )}

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
  scrollView: {
    flex: 1,
  },
  content: {
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
  stopSelector: {
    marginBottom: 16,
    position: 'relative',
  },
  stopLabel: {
    marginBottom: 4,
    fontWeight: '500',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 3,
    maxHeight: 150,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultItem: {
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultLabel: {
    textAlign: 'left',
    fontSize: 13,
  },
  selectedStop: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  selectedCommune: {
    color: '#666',
    marginTop: 2,
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
