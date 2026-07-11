import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, SegmentedButtons, Appbar, Badge, Menu } from 'react-native-paper';
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
  const [routeLimit, setRouteLimit] = useState<number>(3); // Default to 3 routes
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

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
      const response = await calculateRoute(
        origin.id, 
        destination.id, 
        optimizeBy,
        routeLimit // Pass the route limit
      );
      navigation.navigate('Results', {
        originId: origin.id,
        originName: origin.name,
        destinationId: destination.id,
        destinationName: destination.name,
        optimizeBy,
        routes: response.routes,
        routeLimit, // Pass the limit so Results can show context
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Réessaie.');
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, optimizeBy, routeLimit, navigation]);

  const handleSuggestRoute = () => {
    navigation.navigate('SuggestConnection');
  };

  const getRouteLimitLabel = (limit: number): string => {
    const labels: Record<number, string> = {
      1: '1 route',
      2: '2 routes',
      3: '3 routes',
      4: '4 routes',
      5: '5 routes',
    };
    return labels[limit] || `${limit} routes`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header>
        <Appbar.Content title="Décompose" />
        <Appbar.Action icon="plus-circle" onPress={handleSuggestRoute} />
      </Appbar.Header>

      {/* Pending Banner */}
      {pendingCount > 0 && (
        <PendingBanner
          count={pendingCount}
          onPress={() => navigation.navigate('PendingConfirmations')}
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
              { value: 'price', label: '💰 Prix' },
              { value: 'time', label: '⚡ Temps' },
              { value: 'balanced', label: '⚖️ Équilibré' },
            ]}
          />

          {/* Route Limit Selector */}
          <View style={styles.limitContainer}>
            <Text variant="labelMedium" style={styles.limitLabel}>
              Nombre de trajets à afficher
            </Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setMenuVisible(true)}
                  style={styles.limitButton}
                  contentStyle={styles.limitButtonContent}
                  icon="chevron-down"
                >
                  {getRouteLimitLabel(routeLimit)}
                </Button>
              }
            >
              {[1, 2, 3, 4, 5].map((limit) => (
                <Menu.Item
                  key={limit}
                  onPress={() => {
                    setRouteLimit(limit);
                    setMenuVisible(false);
                  }}
                  title={getRouteLimitLabel(limit)}
                  leadingIcon={routeLimit === limit ? 'check' : undefined}
                />
              ))}
            </Menu>
            <Text variant="bodySmall" style={styles.limitHint}>
              Plus de trajets = plus d'options, mais temps de calcul plus long
            </Text>
          </View>

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
  limitContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  limitLabel: {
    marginBottom: 6,
    fontWeight: '500',
  },
  limitButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderColor: '#6200ee',
  },
  limitButtonContent: {
    paddingVertical: 4,
  },
  limitHint: {
    color: '#888',
    marginTop: 4,
    fontSize: 11,
  },
  error: {
    color: '#B00020',
    marginTop: 12,
    fontSize: 13,
  },
  button: {
    marginTop: 16,
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
