import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { Text, Appbar, Button, Card, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import RouteCard from '../components/RouteCard';
import { RootStackParamList, CalculatedRoute, SuggestedConnection } from '../types';
import { getPendingSuggestions, getVotesForConnections, castVote, VoteStats } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';
import { TRANSPORT_LABELS, TRANSPORT_ICONS } from '../constants/transport';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

const OPTIMIZE_LABELS = {
  price: 'les moins chers',
  time: 'les plus rapides',
  balanced: 'les plus équilibrés',
};

// Interface for aggregate route vote stats
interface RouteVoteStats {
  connectionId: string; // The primary connection ID (first step)
  upvotes: number;
  downvotes: number;
  voteScore: number;
  totalVotes: number;
  userVote: 1 | -1 | 0;
  averageScore: number; // Average of all step scores
  stepCount: number;
}

export default function ResultsScreen({ navigation, route }: Props) {
  const deviceId = useDeviceId();
  const { originName, destinationName, optimizeBy, routes } = route.params;
  const [contextualSuggestions, setContextualSuggestions] = useState<SuggestedConnection[]>([]);
  const [showContextual, setShowContextual] = useState(false);
  const [voteStats, setVoteStats] = useState<Record<string, VoteStats>>({});
  const [routeAggregates, setRouteAggregates] = useState<Record<string, RouteVoteStats>>({});
  const [isVoting, setIsVoting] = useState(false);

  // Fetch contextual suggestions based on the search
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
      } catch {
        // Silently fail
      }
    };
    fetchContextualSuggestions();
  }, [deviceId, originName, destinationName]);

  // Fetch vote stats for all routes and compute aggregates
  useEffect(() => {
    const fetchVoteStats = async () => {
      if (!deviceId || routes.length === 0) return;
      
      try {
        // Collect all connection IDs from all steps of all routes
        const connectionIds: string[] = [];
        routes.forEach(route => {
          route.steps.forEach(step => {
            if (step.connectionId && !connectionIds.includes(step.connectionId)) {
              connectionIds.push(step.connectionId);
            }
          });
        });

        if (connectionIds.length === 0) return;

        const stats = await getVotesForConnections(connectionIds, deviceId);
        setVoteStats(stats);

        // Compute aggregate stats for each route
        const aggregates: Record<string, RouteVoteStats> = {};
        
        routes.forEach(route => {
          const stepConnectionIds = route.steps
            .map(s => s.connectionId)
            .filter((id): id is string => !!id);

          if (stepConnectionIds.length === 0) {
            // Fallback: use route ID
            aggregates[route.id] = {
              connectionId: route.id,
              upvotes: 0,
              downvotes: 0,
              voteScore: 0,
              totalVotes: 0,
              userVote: 0,
              averageScore: 0,
              stepCount: 0,
            };
            return;
          }

          // Get stats for each step
          const stepStats = stepConnectionIds.map(id => stats[id]).filter(Boolean);
          
          if (stepStats.length === 0) {
            // No vote data available
            aggregates[route.id] = {
              connectionId: stepConnectionIds[0],
              upvotes: 0,
              downvotes: 0,
              voteScore: 0,
              totalVotes: 0,
              userVote: 0,
              averageScore: 0,
              stepCount: stepConnectionIds.length,
            };
            return;
          }

          // Calculate aggregate stats
          const totalUpvotes = stepStats.reduce((sum, s) => sum + s.upvotes, 0);
          const totalDownvotes = stepStats.reduce((sum, s) => sum + s.downvotes, 0);
          const totalVoteScore = stepStats.reduce((sum, s) => sum + s.voteScore, 0);
          const totalVotes = stepStats.reduce((sum, s) => sum + s.totalVotes, 0);
          
          // Average score across all steps
          const averageScore = stepStats.length > 0 
            ? totalVoteScore / stepStats.length 
            : 0;

          // User vote: use the first step's user vote for simplicity
          // TODO: Could also show user's aggregate vote
          const userVote = stepStats[0]?.userVote || 0;

          // Use the first step's connection ID as the primary ID for voting
          const primaryConnectionId = stepConnectionIds[0];

          aggregates[route.id] = {
            connectionId: primaryConnectionId,
            upvotes: totalUpvotes,
            downvotes: totalDownvotes,
            voteScore: totalVoteScore,
            totalVotes: totalVotes,
            userVote: userVote,
            averageScore: averageScore,
            stepCount: stepConnectionIds.length,
          };
        });

        setRouteAggregates(aggregates);

      } catch {
        // Silently fail - votes just won't show
      }
    };
    fetchVoteStats();
  }, [deviceId, routes]);

  const handleRoutePress = (selectedRoute: CalculatedRoute) => {
    navigation.navigate('RouteDetail', {
      selectedRoute,
      originName,
      destinationName,
    });
  };

  const handleVote = useCallback(async (connectionId: string, vote: 1 | -1) => {
    if (!deviceId || isVoting) return;

    setIsVoting(true);
    try {
      const result = await castVote({
        connectionId,
        deviceId,
        vote,
      });

      // Update local vote stats
      setVoteStats(prev => ({
        ...prev,
        [connectionId]: {
          upvotes: result.connection.upvotes,
          downvotes: result.connection.downvotes,
          voteScore: result.voteScore,
          totalVotes: result.totalVotes,
          userVote: result.userVote,
        }
      }));

      // Update route aggregates (recalculate)
      setRouteAggregates(prev => {
        const updated = { ...prev };
        // Find which route uses this connection ID
        for (const [routeId, aggregate] of Object.entries(prev)) {
          if (aggregate.connectionId === connectionId) {
            // Update the aggregate for this route
            // We need to recalculate based on all steps
            // For simplicity, we'll just update the specific connection's contribution
            // A full recalculation would require re-fetching all stats
            // For now, we'll use the new stats from the API response
            const newStats = result.connection;
            updated[routeId] = {
              ...aggregate,
              upvotes: aggregate.upvotes + (newStats.upvotes - aggregate.upvotes),
              downvotes: aggregate.downvotes + (newStats.downvotes - aggregate.downvotes),
              voteScore: aggregate.voteScore + (newStats.voteScore - aggregate.voteScore),
              totalVotes: aggregate.totalVotes + ((newStats.upvotes + newStats.downvotes) - aggregate.totalVotes),
            };
            break;
          }
        }
        return updated;
      });

    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  }, [deviceId, isVoting]);

  const handleConfirmSuggestion = () => {
    navigation.navigate('PendingConfirmations');
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.journeySummary}>
        <Text variant="bodyMedium" style={styles.journeyLabel}>De</Text>
        <Text variant="titleMedium" style={styles.journeyStop}>{originName}</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text variant="bodyMedium" style={styles.journeyLabel}>À</Text>
        <Text variant="titleMedium" style={styles.journeyStop}>{destinationName}</Text>
      </View>

      <Text variant="bodySmall" style={styles.subtitle}>
        {routes.length} trajet{routes.length > 1 ? 's' : ''} trouvé{routes.length > 1 ? 's' : ''},{' '}
        {OPTIMIZE_LABELS[optimizeBy]}
      </Text>
    </View>
  );

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

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text variant="bodyLarge" style={styles.emptyText}>
        Aucun trajet trouvé entre ces deux arrêts.
      </Text>
      <Text variant="bodySmall" style={styles.emptyHint}>
        Essaie d'autres points de départ ou de destination.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Résultats" />
      </Appbar.Header>

      <FlatList
        data={routes}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => {
          const aggregate = routeAggregates[item.id];
          
          return (
            <RouteCard
              route={item}
              onPress={handleRoutePress}
              onVote={handleVote}
              rank={index + 1}
              userVotes={aggregate ? { [aggregate.connectionId]: aggregate.userVote } : {}}
              voteStats={aggregate ? { 
                [aggregate.connectionId]: { 
                  upvotes: aggregate.upvotes, 
                  downvotes: aggregate.downvotes 
                } 
              } : {}}
            />
          );
        }}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {showContextual && renderContextualPrompt()}
          </>
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
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
  },
  listHeader: {
    marginBottom: 16,
  },
  journeySummary: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  journeyLabel: {
    color: '#888',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  journeyStop: {
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  arrow: {
    fontSize: 18,
    color: '#888',
    marginVertical: 4,
    marginLeft: 2,
  },
  subtitle: {
    color: '#666',
    marginLeft: 2,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#444',
    marginBottom: 8,
  },
  emptyHint: {
    textAlign: 'center',
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
  contextualButton: {
    borderRadius: 8,
    marginTop: 4,
  },
});
