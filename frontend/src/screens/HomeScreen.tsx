import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, SegmentedButtons, Appbar, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import StopSearchInput from '../components/StopSearchInput';
import PendingBanner from '../components/PendingBanner';
import { calculateRoute, getPendingCount } from '../services/api';
import { RootStackParamList, Stop } from '../types';
import { useDeviceId } from '../hooks/useDeviceId';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type OptimizeBy = 'price' | 'time' | 'balanced';

export default function HomeScreen({ navigation }: Props) {
  const deviceId = useDeviceId();
  
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [optimizeBy, setOptimizeBy] = useState<OptimizeBy>('price');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const canSearch = origin !== null && destination !== null && !isLoading;

  // Fetch pending count for banner
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!deviceId) return;
      try {
        const data = await getPendingCount(deviceId);
        setPendingCount(data.count);
      } catch {
        // Silently fail - banner just won't show
      }
    };
    fetchPendingCount();
  }, [deviceId]);

  const handleSearch = useCallback(async () => {
    if (!origin || !destination) return;
    if (origin.id === destination.id) {
      setError('Le départ et la destination ne peuvent pas être identiques.');
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
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Réessaie.');
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, optimizeBy, navigation]);

  const handleSuggestRoute = () => {
    navigation.navigate('SuggestConnection');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header>
        <Appbar.Content title="Décompose"/>
        <Appbar.Action icon="plus-circle" onPress={handleSuggestRoute} />
      </Appbar.Header>

      {/* Pending Banner */}
      {pendingCount > 0 && (
        <PendingBanner 
          count={pendingCount} 
          onPress={() => navigation.navigate('SuggestConnection')}
        />
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text variant="titleMedium" style={styles.sectionLabel}>D'où tu pars ?</Text>
          <StopSearchInput
            label="Point de départ"
            selectedStop={origin}
            onStopSelected={setOrigin}
            zIndex={2}
          />

          <Text variant="titleMedium" style={styles.sectionLabel}>Tu vas où ?</Text>
          <StopSearchInput
            label="Destination"
            selectedStop={destination}
            onStopSelected={setDestination}
            zIndex={1}
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

          <Button
            mode="outlined"
            onPress={handleSuggestRoute}
            style={styles.suggestButton}
            contentStyle={styles.suggestButtonContent}
            icon="plus"
          >
            Suggest a new route
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
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
  suggestButton: {
    marginTop: 12,
    borderRadius: 8,
    borderColor: '#6200ee',
  },
  suggestButtonContent: {
    paddingVertical: 6,
  },
});
