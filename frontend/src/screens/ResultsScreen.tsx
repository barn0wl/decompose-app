import { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, ScrollView } from 'react-native';
import { Text, Appbar, Button, Card, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import RouteCard from '../components/RouteCard';
import { RootStackParamList, CalculatedRoute, SuggestedConnection } from '../types';
import { getPendingSuggestions } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';
import { TRANSPORT_LABELS, TRANSPORT_ICONS } from '../constants/transport';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

const OPTIMIZE_LABELS = {
  price: 'les moins chers',
  time: 'les plus rapides',
  balanced: 'les plus équilibrés',
};

const OPTIMIZE_EMOJIS = {
  price: '💰',
  time: '⚡',
  balanced: '⚖️',
};

export default function ResultsScreen({ navigation, route }: Props) {
  const deviceId = useDeviceId();
  const { 
    originName, 
    destinationName, 
    optimizeBy, 
    routes,
    routeLimit = 1 
  } = route.params;
  
  const [contextualSuggestions, setContextualSuggestions] = useState<SuggestedConnection[]>([]);
  const [showContextual, setShowContextual] = useState(false);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);

  // Fetch contextual suggestions based on the search
  useEffect(() => {
    const fetchContextualSuggestions = async () => {
      if (!deviceId) return;
      try {
        const data = await getPendingSuggestions(deviceId);
        // Filter suggestions that are relevant to this search
        const matching = data.suggestions.filter(s =>
          s.fromStop.commune === originName ||
          s.toStop.commune === destinationName ||
          s.fromStop.commune === destinationName ||
          s.toStop.commune === originName
        ).slice(0, 2);

        setContextualSuggestions(matching);
        setShowContextual(matching.length > 0);
      } catch {
        // Silently fail
      }
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

  // Render comparison header
  const renderComparisonHeader = () => {
    if (routes.length <= 1) return null;

    // Find which routes have special status
    const fastest = routes.find(r => r.isFastest);
    const cheapest = routes.find(r => r.isCheapest);
    const bestBalanced = routes.find(r => r.isBestBalanced);

    return (
      <View style={styles.comparisonHeader}>
        <Text style={styles.comparisonTitle}>📊 Comparez vos options</Text>
        <View style={styles.comparisonGrid}>
          {fastest && (
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonEmoji}>⚡</Text>
              <Text style={styles.comparisonLabel}>Plus rapide</Text>
              <Text style={styles.comparisonValue}>
                {fastest.totalDuration} min
              </Text>
              <Text style={styles.comparisonPrice}>
                {fastest.totalPrice} CFA
              </Text>
            </View>
          )}
          {cheapest && cheapest.id !== fastest?.id && (
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonEmoji}>💰</Text>
              <Text style={styles.comparisonLabel}>Moins cher</Text>
              <Text style={styles.comparisonValue}>
                {cheapest.totalPrice} CFA
              </Text>
              <Text style={styles.comparisonPrice}>
                {cheapest.totalDuration} min
              </Text>
            </View>
          )}
          {bestBalanced && bestBalanced.id !== fastest?.id && bestBalanced.id !== cheapest?.id && (
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonEmoji}>⚖️</Text>
              <Text style={styles.comparisonLabel}>Équilibré</Text>
              <Text style={styles.comparisonValue}>
                {bestBalanced.totalPrice} CFA
              </Text>
              <Text style={styles.comparisonPrice}>
                {bestBalanced.totalDuration} min
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render header with journey info
  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.journeySummary}>
        <View style={styles.journeyRow}>
          <View style={styles.journeyPoint}>
            <View style={[styles.dot, styles.originDot]} />
            <Text style={styles.journeyLabel}>De</Text>
            <Text variant="titleMedium" style={styles.journeyStop}>
              {originName}
            </Text>
          </View>
          <Text style={styles.arrow}>↓</Text>
          <View style={styles.journeyPoint}>
            <View style={[styles.dot, styles.destinationDot]} />
            <Text style={styles.journeyLabel}>À</Text>
            <Text variant="titleMedium" style={styles.journeyStop}>
              {destinationName}
            </Text>
          </View>
        </View>
        <View style={styles.journeyMeta}>
          <Text style={styles.routeCount}>
            {routes.length} trajet{routes.length > 1 ? 's' : ''} trouvé{routes.length > 1 ? 's' : ''}
          </Text>
          <Text style={styles.optimizeBadge}>
            {OPTIMIZE_EMOJIS[optimizeBy]} {OPTIMIZE_LABELS[optimizeBy]}
          </Text>
          {routeLimit > 1 && (
            <Text style={styles.routeLimitBadge}>
              Max: {routeLimit} routes
            </Text>
          )}
        </View>
      </View>

      {renderComparisonHeader()}
    </View>
  );

  // Render contextual suggestions
  const renderContextualPrompt = () => (
    <Card style={styles.contextualCard}>
      <Card.Content>
        <View style={styles.contextualHeader}>
          <Text style={styles.contextualIcon}>💡</Text>
          <View style={styles.contextualText}>
            <Text style={styles.contextualTitle}>Help verify routes!</Text>
            <Text style={styles.contextualSubtitle}>
              {contextualSuggestions.length} pending route{contextualSuggestions.length > 1 ? 's' : ''} near your search
            </Text>
          </View>
        </View>
        {contextualSuggestions.map((s) => (
          <View key={s.id} style={styles.contextualSuggestion}>
            <Text style={styles.contextualRoute}>
              {s.fromStop.name} → {s.toStop.name}
            </Text>
            <View style={styles.contextualMeta}>
              <Chip compact style={styles.contextualChip}>
                {TRANSPORT_ICONS[s.transportType]} {TRANSPORT_LABELS[s.transportType]}
              </Chip>
              <Text style={styles.contextualPrice}>{s.basePrice} CFA</Text>
              <Text style={styles.contextualDuration}>• {s.durationMinutes} min</Text>
            </View>
          </View>
        ))}
        <Button
          mode="contained"
          onPress={handleConfirmSuggestion}
          style={styles.contextualButton}
          compact
        >
          Confirm Routes
        </Button>
      </Card.Content>
    </Card>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🗺️</Text>
      <Text variant="bodyLarge" style={styles.emptyText}>
        Aucun trajet trouvé entre ces deux arrêts.
      </Text>
      <Text variant="bodySmall" style={styles.emptyHint}>
        Essaie d'autres points de départ ou de destination.
      </Text>
      <Button
        mode="contained"
        onPress={handleNewSearch}
        style={styles.emptyButton}
      >
        Nouvelle recherche
      </Button>
    </View>
  );

  // Render footer with new search button
  const renderFooter = () => (
    <View style={styles.footer}>
      <Button
        mode="outlined"
        onPress={handleNewSearch}
        style={styles.newSearchButton}
        contentStyle={styles.newSearchButtonContent}
        icon="arrow-left"
      >
        Nouvelle recherche
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content 
          title="Résultats" 
          subtitle={`${routes.length} trajet${routes.length > 1 ? 's' : ''}`}
        />
        <Appbar.Action 
          icon="refresh" 
          onPress={() => {
            // Refresh by going back and re-searching
            navigation.goBack();
          }} 
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
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  listHeader: {
    marginBottom: 16,
  },
  journeySummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  journeyPoint: {
    flex: 1,
    alignItems: 'center',
  },
  journeyLabel: {
    color: '#888',
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  journeyStop: {
    fontWeight: '600',
    color: '#1a1a1a',
    fontSize: 16,
    textAlign: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  originDot: {
    backgroundColor: '#4CAF50',
  },
  destinationDot: {
    backgroundColor: '#f44336',
  },
  arrow: {
    fontSize: 20,
    color: '#888',
    marginHorizontal: 8,
  },
  journeyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  routeCount: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  optimizeBadge: {
    fontSize: 12,
    color: '#6200ee',
    backgroundColor: '#f0e6ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    fontWeight: '500',
  },
  routeLimitBadge: {
    fontSize: 11,
    color: '#888',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  comparisonHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
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
    minWidth: 80,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  comparisonEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  comparisonLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 2,
  },
  comparisonPrice: {
    fontSize: 13,
    color: '#888',
  },
  contextualCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  contextualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contextualIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  contextualText: {
    flex: 1,
  },
  contextualTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  contextualSubtitle: {
    fontSize: 12,
    color: '#388E3C',
  },
  contextualSuggestion: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  contextualRoute: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  contextualMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  contextualChip: {
    height: 24,
    backgroundColor: '#f0f0f0',
  },
  contextualPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  contextualDuration: {
    fontSize: 12,
    color: '#888',
  },
  contextualButton: {
    borderRadius: 8,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#444',
    marginBottom: 8,
    fontSize: 16,
  },
  emptyHint: {
    textAlign: 'center',
    color: '#888',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 8,
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  newSearchButton: {
    borderRadius: 8,
    borderColor: '#6200ee',
  },
  newSearchButtonContent: {
    paddingVertical: 6,
  },
});
