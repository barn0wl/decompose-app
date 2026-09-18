import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Appbar,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, SuggestedConnection } from '../types';
import { getPendingSuggestions, confirmSuggestion } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';
import { TRANSPORT_LABELS } from '../constants/transport';
import { COLORS, FONTS } from '../constants/theme';
import TransportIcon from '../components/TransportIcon';

import CheckCircleIcon from '../../assets/icons/check-circle.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'PendingConfirmations'>;

export default function PendingConfirmationsScreen({ navigation }: Props) {
  const deviceId = useDeviceId();
  const [suggestions, setSuggestions] = useState<SuggestedConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await getPendingSuggestions(deviceId);
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error('Échec du chargement des suggestions en attente :', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSuggestions();
  };

  const handleConfirm = async (suggestionId: string) => {
    if (!deviceId) {
      Alert.alert('Erreur', 'Impossible d\'identifier l\'appareil.');
      return;
    }

    setConfirmingId(suggestionId);
    try {
      const result = await confirmSuggestion(suggestionId, deviceId);
      if (result.approved) {
        Alert.alert(
          'Trajet approuvé !',
          'Cette suggestion a été confirmée par la communauté et est maintenant disponible comme trajet !',
          [{ text: 'Super !', onPress: () => fetchSuggestions() }]
        );
      } else {
        Alert.alert(
          'Confirmé !',
          result.message,
          [{ text: 'OK', onPress: () => fetchSuggestions() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de la confirmation de la suggestion.');
    } finally {
      setConfirmingId(null);
    }
  };

  const renderItem = ({ item }: { item: SuggestedConnection }) => {
    const isConfirming = confirmingId === item.id;
    const progress = item.confirmations / item.confirmationThreshold;
    const remaining = item.confirmationThreshold - item.confirmations;

    return (
      <View style={styles.card}>
        <View style={styles.cardAccent} />

        <View style={styles.cardContent}>
          {/* Header: transport badge + price */}
          <View style={styles.cardHeader}>
            <View style={styles.transportBadge}>
              <TransportIcon type={item.transportType} size={16} />
              <Text style={styles.transportLabel}>
                {TRANSPORT_LABELS[item.transportType] || item.transportType}
              </Text>
            </View>
            <Text style={styles.price}>{item.basePrice} CFA</Text>
          </View>

          {/* Route: from → to */}
          <View style={styles.routeInfo}>
            <Text style={styles.stopName}>{item.fromStop.name}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.stopName}>{item.toStop.name}</Text>
          </View>

          {/* Communes */}
          <View style={styles.communeInfo}>
            <Text style={styles.communeText}>{item.fromStop.commune}</Text>
            <Text style={styles.communeText}>{item.toStop.commune}</Text>
          </View>

          {/* Description */}
          {item.routeDescription && (
            <Text style={styles.description}>{item.routeDescription}</Text>
          )}

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {item.confirmations} / {item.confirmationThreshold} confirmations
              {remaining > 0 && ` (${remaining} restantes)`}
            </Text>
          </View>

          {/* Confirm button */}
          <Button
            mode="contained"
            onPress={() => handleConfirm(item.id)}
            loading={isConfirming}
            disabled={isConfirming}
            style={styles.confirmButton}
            contentStyle={styles.confirmButtonContent}
            buttonColor={COLORS.primary}
            textColor={COLORS.textLight}
          >
            {isConfirming ? 'Confirmation...' : 'Confirmer ce trajet'}
          </Button>

          <Text style={styles.submittedBy}>
            Proposé par : {item.submittedBy.substring(0, 12)}...
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <CheckCircleIcon width={40} height={40} fill={COLORS.accent} />
      </View>
      <Text style={styles.emptyTitle}>Tout est à jour !</Text>
      <Text style={styles.emptyText}>
        Aucun trajet en attente de confirmation pour le moment.
        Revenez plus tard ou suggérez un nouveau trajet !
      </Text>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('SuggestConnection')}
        style={styles.emptyButton}
        contentStyle={styles.emptyButtonContent}
        buttonColor={COLORS.primary}
        textColor={COLORS.textLight}
      >
        Suggérer un trajet
      </Button>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => navigation.goBack()} color={COLORS.textLight} />
          <Appbar.Content
            title="Confirmer les trajets"
            titleStyle={styles.appbarTitle}
          />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des suggestions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color={COLORS.textLight} />
        <Appbar.Content
          title="Confirmer les trajets"
          subtitle={`${suggestions.length} en attente`}
          titleStyle={styles.appbarTitle}
          subtitleStyle={styles.appbarSubtitle}
        />
      </Appbar.Header>

      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  appbar: {
    backgroundColor: COLORS.primary,
  },
  appbarTitle: {
    fontFamily: FONTS.heading,
    color: COLORS.textLight,
    fontWeight: '700',
  },
  appbarSubtitle: {
    color: COLORS.textLight,
    opacity: 0.75,
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.accent,
  },
  cardContent: {
    padding: 16,
  },

  // Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  transportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  transportLabel: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  price: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Route
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    color: COLORS.textDark,
  },
  arrow: {
    fontSize: 18,
    color: COLORS.textMuted,
    marginHorizontal: 8,
  },
  communeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  communeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  description: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginBottom: 12,
  },

  // Progress
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Button
  confirmButton: {
    borderRadius: 12,
    elevation: 2,
  },
  confirmButtonContent: {
    paddingVertical: 4,
  },
  submittedBy: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 10,
    fontStyle: 'italic',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    borderRadius: 12,
    elevation: 2,
  },
  emptyButtonContent: {
    paddingVertical: 6,
  },
});
