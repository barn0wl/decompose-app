import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, SegmentedButtons, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import StopSearchInput from '../components/StopSearchInput';
import { calculateRoute } from '../services/api';
import { RootStackParamList, Stop } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type OptimizeBy = 'price' | 'time' | 'balanced';

export default function HomeScreen({ navigation }: Props) {
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [optimizeBy, setOptimizeBy] = useState<OptimizeBy>('price');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = origin !== null && destination !== null && !isLoading;

  const handleSearch = useCallback(async () => {
    if (!origin || !destination) return;
    if (origin.id === destination.id) {
      setError('Origin and destination cannot be the same stop.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await calculateRoute(origin.id, destination.id, optimizeBy);
      navigation.navigate('Results', {
        originId: origin.id,
        originName: origin.name,
        destinationId: destination.id,
        destinationName: destination.name,
        optimizeBy,
        routes: response.routes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, optimizeBy, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header>
        <Appbar.Content title="Décompose" subtitle="Trouve ton trajet" />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled" // keeps dropdown tappable when keyboard is open
      >
        <Text variant="titleMedium" style={styles.sectionLabel}>D'où tu pars ?</Text>
        <StopSearchInput
          label="Point de départ"
          selectedStop={origin}
          onStopSelected={setOrigin}
        />

        <Text variant="titleMedium" style={styles.sectionLabel}>Tu vas où ?</Text>
        <StopSearchInput
          label="Destination"
          selectedStop={destination}
          onStopSelected={setDestination}
        />

        <Text variant="titleMedium" style={styles.sectionLabel}>Optimiser par</Text>
        <SegmentedButtons
          value={optimizeBy}
          onValueChange={val => setOptimizeBy(val as OptimizeBy)}
          style={styles.segmented}
          buttons={[
            { value: 'price', label: 'Prix' },
            { value: 'time', label: 'Temps' },
            { value: 'balanced', label: 'Équilibré' },
          ]}
        />

        {error && (
          <Text style={styles.error}>{error}</Text>
        )}

        <Button
          mode="contained"
          onPress={handleSearch}
          loading={isLoading}
          disabled={!canSearch}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Décomposer
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 12,
  },
  sectionLabel: {
    marginBottom: 6,
    marginTop: 8,
  },
  segmented: {
    marginTop: 4,
  },
  error: {
    color: '#B00020',
    marginTop: 12,
    fontSize: 13,
  },
  button: {
    marginTop: 28,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});