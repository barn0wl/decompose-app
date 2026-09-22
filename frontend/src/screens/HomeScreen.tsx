import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import StopSearchInput from '../components/StopSearchInput';
import PendingBanner from '../components/PendingBanner';
import { calculateRoute, getPendingCount, ApiError } from '../services/api';
import { RootStackParamList, Stop } from '../types';
import { useDeviceId } from '../hooks/useDeviceId';
import { COLORS, FONTS } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const deviceId = useDeviceId();
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
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
      setErrorHint(null);
      return;
    }

    setError(null);
    setErrorHint(null);
    setIsLoading(true);

    try {
      const response = await calculateRoute(origin.id, destination.id);
      navigation.navigate('RouteDetail', {
        route: response.route,
        originName: origin.name,
        destinationName: destination.name,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_VALID_ROUTE') {
        setError(err.message);
        setErrorHint(err.hint ?? null);
      } else {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
        setErrorHint(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, navigation]);

  const handleSuggestRoute = () => {
    navigation.navigate('SuggestConnection');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{error}</Text>
              {errorHint && <Text style={styles.errorHint}>{errorHint}</Text>}
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
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: { zIndex: 2 },
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
  scrollContent: { padding: 16, paddingBottom: 40 },
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
  searchCard: { zIndex: 10, elevation: 10 },
  cardAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0, width: 4,
    backgroundColor: COLORS.accent,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    zIndex: 2,
  },
  cardContent: { padding: 16, overflow: 'visible' },
  sectionLabel: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.3,
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
  button: { marginTop: 8, borderRadius: 12, elevation: 3 },
  buttonContent: { paddingVertical: 8 },
  suggestButton: {
    marginTop: 12,
    borderRadius: 12,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  suggestButtonContent: { paddingVertical: 6 },
});
