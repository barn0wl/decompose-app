import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import StopSearchInput from '../components/StopSearchInput';
import PendingBanner from '../components/PendingBanner';
import { calculateRoute, getPendingCount, ApiError } from '../services/api';
import { RootStackParamList, Stop } from '../types';
import { useDeviceId } from '../hooks/useDeviceId';
import { COLORS, FONTS } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ─── Time-of-day demo presets ─────────────────────────────────────────────
// Each preset builds an ISO string for the given hour, using today's date.
// The router uses the hour (via the multiplier) and the day-of-week.

interface TimePreset {
  key: string;
  label: string;
  emoji: string;
  hour: number;
}

const TIME_PRESETS: TimePreset[] = [
  { key: 'morning', label: 'Matin', emoji: '🌅', hour: 7 },
  { key: 'midday',  label: 'Midi',  emoji: '☀️', hour: 12 },
  { key: 'evening', label: 'Soir',  emoji: '🌆', hour: 18 },
  { key: 'night',   label: 'Nuit',  emoji: '🌙', hour: 2 },
];

function buildIsoForHour(hour: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    hour,
    0,
    0,
    0,
  ));
  return d.toISOString();
}

function formatActiveTime(iso: string): string {
  const d = new Date(iso);
  const hh = d.getUTCHours().toString().padStart(2, '0');
  return `${hh}:00`;
}

// ─── SCREEN ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const deviceId = useDeviceId();
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sameStopError, setSameStopError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [showTimeControls, setShowTimeControls] = useState(false);
  const [activeTime, setActiveTime] = useState<string | null>(null);

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
      setSameStopError('Le départ et la destination ne peuvent pas être identiques.');
      return;
    }

    setSameStopError(null);
    setIsLoading(true);

    try {
      const response = await calculateRoute(origin.id, destination.id, activeTime ?? undefined);
      navigation.navigate('RouteDetail', {
        route: response.route,
        originName: origin.name,
        destinationName: destination.name,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_VALID_ROUTE') {
        navigation.navigate('RouteError', {
          originName: origin.name,
          destinationName: destination.name,
          message: err.message,
          hint: err.hint,
        });
      } else {
        navigation.navigate('RouteError', {
          originName: origin.name,
          destinationName: destination.name,
          message: err instanceof Error ? err.message : 'Une erreur est survenue.',
          hint: 'Vérifie ta connexion et réessaie.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, navigation, activeTime]);

  const handleSuggestRoute = () => {
    navigation.navigate('SuggestConnection');
  };

  const handlePresetPress = (preset: TimePreset) => {
    const iso = buildIsoForHour(preset.hour);
    // Toggle off if tapping the same preset
    if (activeTime === iso) {
      setActiveTime(null);
    } else {
      setActiveTime(iso);
    }
  };

  const handleClearTime = () => {
    setActiveTime(null);
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

          {sameStopError && (
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{sameStopError}</Text>
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

          {/* Time-of-day demo disclosure */}
          <View style={styles.timeDisclosure}>
            <IconButton
              icon={showTimeControls ? 'chevron-up' : 'chevron-down'}
              size={22}
              onPress={() => setShowTimeControls(v => !v)}
              iconColor={COLORS.textMuted}
              style={styles.chevronButton}
            />
          </View>

          {showTimeControls && (
            <View style={styles.timeCard}>
              <View style={styles.timeCardAccent} />
              <View style={styles.timeCardContent}>
                <View style={styles.timeCardHeader}>
                  <Text style={styles.timeCardLabel}>Heure du trajet</Text>
                  {activeTime && (
                    <TouchableOpacity
                      onPress={handleClearTime}
                      activeOpacity={0.7}
                      style={styles.clearButton}
                    >
                      <Text style={styles.clearButtonText}>Effacer</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.timeCardHint}>
                  {activeTime
                    ? `Simulation pour ${formatActiveTime(activeTime)}`
                    : 'Choisis une heure pour simuler le trafic (démo)'}
                </Text>

                <View style={styles.presetRow}>
                  {TIME_PRESETS.map(preset => {
                    const presetIso = buildIsoForHour(preset.hour);
                    const isActive = activeTime === presetIso;
                    return (
                      <TouchableOpacity
                        key={preset.key}
                        onPress={() => handlePresetPress(preset)}
                        activeOpacity={0.8}
                        style={[
                          styles.presetButton,
                          isActive && styles.presetButtonActive,
                        ]}
                      >
                        <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                        <Text
                          style={[
                            styles.presetLabel,
                            isActive && styles.presetLabelActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────

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
  button: { marginTop: 8, borderRadius: 12, elevation: 3 },
  buttonContent: { paddingVertical: 8 },
  suggestButton: {
    marginTop: 12,
    borderRadius: 12,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  suggestButtonContent: { paddingVertical: 6 },

  // Time disclosure (chevron button)
  timeDisclosure: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginRight: -8,      // pull the IconButton back a touch since it has internal padding
  },
  chevronButton: {
    backgroundColor: COLORS.surfaceAlt,
    margin: 0,
  },

  // Time picker card
  timeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginTop: 4,
    position: 'relative',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  timeCardAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0, width: 4,
    backgroundColor: COLORS.highlight,
  },
  timeCardContent: {
    padding: 14,
  },
  timeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeCardLabel: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  clearButtonText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  timeCardHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceAlt,
  },
  presetButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetEmoji: {
    fontSize: 14,
  },
  presetLabel: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  presetLabelActive: {
    color: COLORS.textLight,
  },
});
