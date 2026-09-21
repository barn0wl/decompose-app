import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  Appbar,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import StopSearchInput from '../components/StopSearchInput';
import PendingBanner from '../components/PendingBanner';
import { calculateRoute, getPendingCount, ApiError } from '../services/api';
import { RootStackParamList, Stop } from '../types';
import { useDeviceId } from '../hooks/useDeviceId';
import { COLORS, FONTS } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type OptimizeBy = 'price' | 'time' | 'balanced';

export default function HomeScreen({ navigation }: Props) {
  const deviceId = useDeviceId();
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [optimizeBy, setOptimizeBy] = useState<OptimizeBy>('price');
  const [routeLimit, setRouteLimit] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const canSearch = origin !== null && destination !== null && !isLoading;

  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!deviceId) return;
      try {
        const data = await getPendingCount(deviceId);
        setPendingCount(data.count);
      } catch {}
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
    setErrorHint(null);
    setIsLoading(true);

    try {
      const response = await calculateRoute(
        origin.id,
        destination.id,
        optimizeBy,
        routeLimit
      );
      navigation.navigate('Results', {
        originId: origin.id,
        originName: origin.name,
        destinationId: destination.id,
        destinationName: destination.name,
        optimizeBy,
        routes: response.routes,
        routeLimit,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_VALID_ROUTE') {
        // Structured no-route case — show message + hint
        setError(err.message);
        setErrorHint(err.hint ?? null);
      } else {
        // Generic error (network, 500, etc.)
        setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
        setErrorHint(null);
      }
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
      {/* Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.appTitle}>Décomposer</Text>
          <Text style={styles.appSubtitle}>Trouve ta route, économise</Text>
        </View>
        <View style={styles.headerAccent} />
      </View>

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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, styles.searchCard]}>
            <View style={styles.cardAccent} />

            <View style={styles.cardContent}>
              <Text style={styles.sectionLabel}>D'où tu pars ?</Text>
              <StopSearchInput
                label="Point de départ"
                selectedStop={origin}
                onStopSelected={setOrigin}
                zIndex={2}
              />

              <Text style={styles.sectionLabel}>Tu vas où ?</Text>
              <StopSearchInput
                label="Destination"
                selectedStop={destination}
                onStopSelected={setDestination}
                zIndex={1}
              />
            </View>
          </View>

          <View style={[styles.card, styles.optimizationCard]}>
            <View style={styles.cardAccent} />

            <View style={styles.cardContent}>
              <Text style={styles.sectionLabel}>Optimiser par</Text>
              <View style={styles.optimizeContainer}>
                {([
                  { value: 'price', label: 'Prix' },
                  { value: 'time', label: 'Temps' },
                  { value: 'balanced', label: 'Équilibré' },
                ] as const).map((option) => {
                  const isSelected = optimizeBy === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setOptimizeBy(option.value)}
                      activeOpacity={0.8}
                      style={[
                        styles.optimizeButton,
                        isSelected && styles.optimizeButtonSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optimizeButtonText,
                          isSelected && styles.optimizeButtonTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.limitContainer}>
                <View style={styles.limitHeader}>
                  <Text style={styles.limitLabel}>
                    Nombre de trajets à afficher
                  </Text>
                  <View style={styles.limitValueBadge}>
                    <Text style={styles.limitValueText}>
                      {routeLimit}
                    </Text>
                  </View>
                </View>

                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  value={routeLimit}
                  onValueChange={(value) => setRouteLimit(Math.round(value))}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={COLORS.accent}
                />

                <View style={styles.sliderLabels}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Text
                      key={n}
                      style={[
                        styles.sliderLabel,
                        routeLimit === n && styles.sliderLabelActive,
                      ]}
                    >
                      {n}
                    </Text>
                  ))}
                </View>

                <Text style={styles.limitHint}>
                  {getRouteLimitLabel(routeLimit)} — Plus de trajets = plus d'options, temps de calcul plus long
                </Text>
              </View>
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{error}</Text>
              {errorHint && (
                <Text style={styles.errorHint}>{errorHint}</Text>
              )}
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleSearch}
            loading={isLoading}
            disabled={!canSearch}
            style={styles.button}
            contentStyle={styles.buttonContent}
            buttonColor={COLORS.primary}
            textColor={COLORS.textLight}
          >
            Décomposer
          </Button>

          <Button
            mode="outlined"
            onPress={handleSuggestRoute}
            style={styles.suggestButton}
            contentStyle={styles.suggestButtonContent}
            icon="plus"
            textColor={COLORS.primary}
          >
            Suggérer un trajet
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    zIndex: 2,
  },
  appTitle: {
    fontFamily: FONTS.heading,
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    opacity: 0.85,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  headerAccent: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.accent,
    opacity: 0.15,
    zIndex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 16,
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  searchCard: {
    zIndex: 10,
    elevation: 10,
  },
  optimizationCard: {
    zIndex: 1,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.accent,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    zIndex: 2,
  },
  cardContent: {
    padding: 16,
    overflow: 'visible',
  },
  sectionLabel: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  optimizeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  optimizeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  optimizeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optimizeButtonText: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  optimizeButtonTextSelected: {
    color: COLORS.textLight,
  },
  limitContainer: {
    marginTop: 16,
    marginBottom: 4,
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  limitLabel: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  limitValueBadge: {
    backgroundColor: COLORS.primary,
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  limitValueText: {
    fontFamily: FONTS.heading,
    color: COLORS.textLight,
    fontSize: 15,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
    marginHorizontal: -4, // slight correction for the thumb padding
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -8,
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.heading,
    fontWeight: '500',
  },
  sliderLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  limitHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 16,
  },
  errorContainer: {
    backgroundColor: '#FFF3F3',
    borderLeftWidth: 4,
    borderLeftColor: '#B00020',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  error: {
    color: '#B00020',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorHint: {
    color: '#B00020',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
    opacity: 0.85,
    lineHeight: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    elevation: 3,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  suggestButton: {
    marginTop: 12,
    borderRadius: 12,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  suggestButtonContent: {
    paddingVertical: 6,
  },
});
