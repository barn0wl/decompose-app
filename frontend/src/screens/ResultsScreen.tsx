import { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { Text, Appbar, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import RouteCard from '../components/RouteCard';
import { RootStackParamList, CalculatedRoute, SuggestedConnection } from '../types';
import { getPendingSuggestions } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';
import { TRANSPORT_LABELS } from '../constants/transport';
import { COLORS, FONTS } from '../constants/theme';
import TransportIcon from '../components/TransportIcon';

import MapIcon from '../../assets/icons/map.svg';
import CheckCircleIcon from '../../assets/icons/check-circle.svg';
import BoltIcon from '../../assets/icons/bolt.svg';
import CoinsIcon from '../../assets/icons/coins.svg';
import ScaleIcon from '../../assets/icons/scale.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

const OPTIMIZE_LABELS = {
  price: 'les moins chers',
  time: 'les plus rapides',
  balanced: 'les plus équilibrés',
};

export default function ResultsScreen({ navigation, route }: Props) {
  const deviceId = useDeviceId();
  const {
    originName,
    destinationName,
    optimizeBy,
    routes,
    routeLimit = 1,
  } = route.params;
  const [contextualSuggestions, setContextualSuggestions] = useState<SuggestedConnection[]>([]);
  const [showContextual, setShowContextual] = useState(false);

  useEffect(() => {
    const fetchContextualSuggestions = async () => {
      if (!deviceId) return;
      try {
        const data = await getPendingSuggestions(deviceId);
        const matching = data.suggestions.filter(s =>
          s.fromStop.commune === originName ||
          s.toStop.commune === destinationName ||
          s.fromStop.commune === destinationName ||
          s.toStop.commune === originName
        ).slice(0, 2);

        setContextualSuggestions(matching);
        setShowContextual(matching.length > 0);
      } catch {}
    };
    fetchContextualSuggestions();
  }, [deviceId, originName, destinationName]);

  const handleRoutePress = (selectedRoute: CalculatedRoute) => {
    navigation.navigate('RouteDetail', {
      selectedRoute,
      originName,
      destinationName,
    });
  };

  const handleConfirmSuggestion = () => {
    navigation.navigate('PendingConfirmations');
  };

  const handleNewSearch = () => {
    navigation.popToTop();
    navigation.navigate('Home');
  };

  // Comparison header
  const renderComparisonHeader = () => {
    if (routes.length <= 1) return null;

    const fastest = routes.find(r => r.isFastest);
    const cheapest = routes.find(r => r.isCheapest);
    const bestBalanced = routes.find(r => r.isBestBalanced);

    return (
      <View style={styles.comparisonCard}>
        <View style={styles.comparisonAccent} />
        <View style={styles.comparisonContent}>
          <Text style={styles.comparisonTitle}>Comparez vos options</Text>
          <View style={styles.comparisonGrid}>
            {fastest && (
              <View style={styles.comparisonItem}>
                <BoltIcon width={20} height={20} fill={COLORS.highlight} />
                <Text style={styles.comparisonLabel}>Plus rapide</Text>
                <Text style={styles.comparisonValue}>{fastest.totalDuration} min</Text>
                <Text style={styles.comparisonPrice}>{fastest.totalPrice} CFA</Text>
              </View>
            )}
            {cheapest && cheapest.id !== fastest?.id && (
              <View style={styles.comparisonItem}>
                <CoinsIcon width={20} height={20} fill={COLORS.accent} />
                <Text style={styles.comparisonLabel}>Moins cher</Text>
                <Text style={styles.comparisonValue}>{cheapest.totalPrice} CFA</Text>
                <Text style={styles.comparisonPrice}>{cheapest.totalDuration} min</Text>
              </View>
            )}
            {bestBalanced && bestBalanced.id !== fastest?.id && bestBalanced.id !== cheapest?.id && (
              <View style={styles.comparisonItem}>
                <ScaleIcon width={20} height={20} fill={COLORS.primary} />
                <Text style={styles.comparisonLabel}>Équilibré</Text>
                <Text style={styles.comparisonValue}>{bestBalanced.totalPrice} CFA</Text>
                <Text style={styles.comparisonPrice}>{bestBalanced.totalDuration} min</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Header with journey info
  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.journeyCard}>
        <View style={styles.journeyAccent} />
        <View style={styles.journeyContent}>
          <View style={styles.journeyRow}>
            <View style={styles.journeyPoint}>
              <View style={[styles.dot, styles.originDot]} />
              <Text style={styles.journeyLabel}>De</Text>
              <Text style={styles.journeyStop}>{originName}</Text>
            </View>
            <Text style={styles.arrow}>↓</Text>
            <View style={styles.journeyPoint}>
              <View style={[styles.dot, styles.destinationDot]} />
              <Text style={styles.journeyLabel}>À</Text>
              <Text style={styles.journeyStop}>{destinationName}</Text>
            </View>
          </View>
          <View style={styles.journeyMeta}>
            <Text style={styles.routeCount}>
              {routes.length} trajet{routes.length > 1 ? 's' : ''} trouvé{routes.length > 1 ? 's' : ''}
            </Text>
            <View style={styles.optimizeBadge}>
              <Text style={styles.optimizeBadgeText}>
                {OPTIMIZE_LABELS[optimizeBy]}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {renderComparisonHeader()}
    </View>
  );

  // Contextual suggestions
  const renderContextualPrompt = () => (
    <View style={styles.contextualCard}>
      <View style={styles.contextualAccent} />
      <View style={styles.contextualContent}>
        <View style={styles.contextualHeader}>
          <View style={styles.contextualIconCircle}>
            <CheckCircleIcon width={20} height={20} fill={COLORS.primary} />
          </View>
          <View style={styles.contextualText}>
            <Text style={styles.contextualTitle}>Aidez à vérifier les trajets</Text>
            <Text style={styles.contextualSubtitle}>
              {contextualSuggestions.length} trajet{contextualSuggestions.length > 1 ? 's' : ''} en attente près de votre recherche
            </Text>
          </View>
        </View>
        {contextualSuggestions.map((s) => (
          <View key={s.id} style={styles.contextualSuggestion}>
            <Text style={styles.contextualRoute}>
              {s.fromStop.name} → {s.toStop.name}
            </Text>
            <View style={styles.contextualMeta}>
              <View style={styles.contextualChip}>
                <TransportIcon type={s.transportType} size={12} />
                <Text style={styles.contextualChipText}>
                  {TRANSPORT_LABELS[s.transportType]}
                </Text>
              </View>
              <Text style={styles.contextualPrice}>{s.basePrice} CFA</Text>
              <Text style={styles.contextualDuration}>• {s.durationMinutes} min</Text>
            </View>
          </View>
        ))}
        <Button
          mode="contained"
          onPress={handleConfirmSuggestion}
          style={styles.contextualButton}
          contentStyle={styles.contextualButtonContent}
          buttonColor={COLORS.primary}
          textColor={COLORS.textLight}
        >
          Confirmer les trajets
        </Button>
      </View>
    </View>
  );

  // Empty state
  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIconCircle}>
        <MapIcon width={40} height={40} fill={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Aucun trajet trouvé</Text>
      <Text style={styles.emptyText}>
        Aucun itinéraire n'a été trouvé entre ces deux arrêts.
        Essaie d'autres points de départ ou de destination.
      </Text>
      <Button
        mode="contained"
        onPress={handleNewSearch}
        style={styles.emptyButton}
        contentStyle={styles.emptyButtonContent}
        buttonColor={COLORS.primary}
        textColor={COLORS.textLight}
      >
        Nouvelle recherche
      </Button>
    </View>
  );

  // Footer
  const renderFooter = () => (
    <View style={styles.footer}>
      <Button
        mode="outlined"
        onPress={handleNewSearch}
        style={styles.newSearchButton}
        contentStyle={styles.newSearchButtonContent}
        icon="arrow-left"
        textColor={COLORS.primary}
      >
        Nouvelle recherche
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color={COLORS.textLight} />
        <Appbar.Content
          title="Résultats"
          subtitle={`${routes.length} trajet${routes.length > 1 ? 's' : ''}`}
          titleStyle={styles.appbarTitle}
          subtitleStyle={styles.appbarSubtitle}
        />
        <Appbar.Action
          icon="refresh"
          onPress={() => navigation.goBack()}
          color={COLORS.textLight}
        />
      </Appbar.Header>

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <RouteCard
            route={item}
            onPress={handleRoutePress}
            rank={index + 1}
            totalRoutes={routes.length}
          />
        )}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {showContextual && renderContextualPrompt()}
          </>
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
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
  list: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  listHeader: {
    marginBottom: 16,
  },

  // Journey card
  journeyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  journeyAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.accent,
  },
  journeyContent: {
    padding: 16,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  journeyPoint: {
    flex: 1,
    alignItems: 'center',
  },
  journeyLabel: {
    fontFamily: FONTS.heading,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 4,
    fontWeight: '600',
  },
  journeyStop: {
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: COLORS.primary,
    fontSize: 16,
    textAlign: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  originDot: {
    backgroundColor: COLORS.accent,
  },
  destinationDot: {
    backgroundColor: COLORS.highlight,
  },
  arrow: {
    fontSize: 20,
    color: COLORS.textMuted,
    marginHorizontal: 8,
  },
  journeyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
  },
  routeCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  optimizeBadge: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  optimizeBadgeText: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Comparison card
  comparisonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  comparisonAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.highlight,
  },
  comparisonContent: {
    padding: 16,
  },
  comparisonTitle: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
  },
  comparisonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  comparisonItem: {
    flex: 1,
    minWidth: 90,
    alignItems: 'center',
    padding: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    gap: 4,
  },
  comparisonLabel: {
    fontFamily: FONTS.heading,
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  comparisonValue: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  comparisonPrice: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Contextual card
  contextualCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  contextualAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.highlight,
  },
  contextualContent: {
    padding: 16,
  },
  contextualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contextualIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contextualText: {
    flex: 1,
  },
  contextualTitle: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  contextualSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  contextualSuggestion: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  contextualRoute: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  contextualMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  contextualChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  contextualChipText: {
    fontFamily: FONTS.heading,
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  contextualPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  contextualDuration: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  contextualButton: {
    borderRadius: 12,
    marginTop: 4,
    elevation: 2,
  },
  contextualButtonContent: {
    paddingVertical: 4,
  },

  // Empty state
  empty: {
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
    textAlign: 'center',
    color: COLORS.textMuted,
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyButton: {
    borderRadius: 12,
    elevation: 3,
  },
  emptyButtonContent: {
    paddingVertical: 6,
  },

  // Footer
  footer: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  newSearchButton: {
    borderRadius: 12,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  newSearchButtonContent: {
    paddingVertical: 6,
  },
});
