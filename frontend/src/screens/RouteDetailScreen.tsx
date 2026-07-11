import { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, ListRenderItemInfo, Alert } from 'react-native';
import { Text, Appbar, Button, Card, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import RouteStepItem from '../components/RouteStepItem';
import RouteMap from '../components/RouteMap';
import { RootStackParamList, CalculatedRoute, RouteStep } from '../types';
import { TRANSPORT_LABELS, TRANSPORT_ICONS } from '../constants/transport';
import { getBulkVoteStats, castVote, VoteStats } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';

type Props = NativeStackScreenProps<RootStackParamList, 'RouteDetail'>;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function getUniqueTransportTypes(steps: CalculatedRoute['steps']): string[] {
  const seen = new Set<string>();
  const types: string[] = [];
  for (const step of steps) {
    const label = TRANSPORT_LABELS[step.type];
    if (!seen.has(label)) {
      seen.add(label);
      types.push(step.type);
    }
  }
  return types;
}

export default function RouteDetailScreen({ navigation, route }: Props) {
  const deviceId = useDeviceId();
  const { selectedRoute, originName, destinationName } = route.params;
  const uniqueTransportTypes = getUniqueTransportTypes(selectedRoute.steps);
  const [stepVoteStats, setStepVoteStats] = useState<Record<string, VoteStats>>({});
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Determine route comparison status
  const isFastest = selectedRoute.isFastest;
  const isCheapest = selectedRoute.isCheapest;
  const isBestBalanced = selectedRoute.isBestBalanced;
  const hasComparisonBadge = isFastest || isCheapest || isBestBalanced;

  // Get badge color based on status
  const getBadgeColor = () => {
    if (isFastest) return '#4CAF50';
    if (isCheapest) return '#FF9800';
    if (isBestBalanced) return '#6200ee';
    return '#888';
  };

  const getBadgeText = () => {
    if (isFastest) return '⚡ Fastest';
    if (isCheapest) return '💰 Cheapest';
    if (isBestBalanced) return '⚖️ Best Balance';
    return '';
  };

  // Fetch vote stats for each step
  useEffect(() => {
    const fetchStepVotes = async () => {
      if (!deviceId) return;
      const connectionIds = selectedRoute.steps
        .map(s => s.connectionId)
        .filter((id): id is string => !!id);
      if (connectionIds.length === 0) return;

      setLoadingVotes(true);
      try {
        const stats = await getBulkVoteStats(connectionIds, deviceId);
        setStepVoteStats(stats);
      } catch (error) {
        console.error('Failed to fetch step vote stats:', error);
      } finally {
        setLoadingVotes(false);
      }
    };
    fetchStepVotes();
  }, [deviceId, selectedRoute.steps]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleNewSearch = () => {
    navigation.popToTop();
    navigation.navigate('Home');
  };

  const handleStepSelect = (index: number) => {
    setSelectedStepIndex(index);
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5,
    });
  };

  const handleScrollToIndexFailed = (info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    flatListRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: true,
    });
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0.5,
      });
    }, 100);
  };

  const handleVote = useCallback(async (connectionId: string, vote: 1 | -1) => {
    if (!deviceId) {
      Alert.alert('Error', 'Unable to identify device. Please try again.');
      return;
    }
    if (isVoting) return;
    setIsVoting(true);
    try {
      const result = await castVote({
        connectionId,
        deviceId,
        vote,
      });

      setStepVoteStats(prev => ({
        ...prev,
        [connectionId]: {
          upvotes: result.connection.upvotes,
          downvotes: result.connection.downvotes,
          voteScore: result.voteScore,
          totalVotes: result.totalVotes,
          userVote: result.userVote,
        }
      }));

      const message = vote === 1 ? '⬆️ Upvoted!' : '⬇️ Downvoted!';
      Alert.alert('Vote recorded', message);

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to cast vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  }, [deviceId, isVoting]);

  const renderStepItem = ({ item, index }: ListRenderItemInfo<RouteStep>) => {
    const isActive = index === selectedStepIndex;
    const stats = item.connectionId ? stepVoteStats[item.connectionId] : null;

    return (
      <View style={[styles.stepWrapper, isActive && styles.activeStepWrapper]}>
        <RouteStepItem
          step={item}
          index={index}
          isFirst={index === 0}
          isLast={index === selectedRoute.steps.length - 1}
          voteStats={stats}
          onVote={handleVote}
          isVoting={isVoting}
          onPress={() => handleStepSelect(index)}
        />
        {isActive && (
          <View style={styles.activeIndicator}>
            <Text style={styles.activeIndicatorText}>📍 Current step</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header>
        <Appbar.BackAction onPress={handleGoBack} />
        <Appbar.Content
          title="Détail du trajet"
          subtitle={`${originName} → ${destinationName}`}
        />
      </Appbar.Header>

      <FlatList
        ref={flatListRef}
        data={selectedRoute.steps}
        keyExtractor={(_, index) => `step-${index}`}
        renderItem={renderStepItem}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Card style={styles.summaryCard}>
              <Card.Content>
                {/* Route Comparison Badge */}
                {hasComparisonBadge && (
                  <View style={styles.comparisonBadgeContainer}>
                    <Badge
                      style={[
                        styles.comparisonBadge,
                        { backgroundColor: getBadgeColor() }
                      ]}
                    >
                      {getBadgeText()}
                    </Badge>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Total</Text>
                    <Text style={styles.priceValue}>{selectedRoute.totalPrice} CFA</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.durationContainer}>
                    <Text style={styles.durationLabel}>Durée</Text>
                    <Text style={styles.durationValue}>
                      {formatDuration(selectedRoute.totalDuration)}
                    </Text>
                  </View>
                </View>

                <View style={styles.stepsInfo}>
                  <Text style={styles.stepsText}>
                    {selectedRoute.steps.length} étape{selectedRoute.steps.length > 1 ? 's' : ''}
                  </Text>
                  <View style={styles.transportChips}>
                    {uniqueTransportTypes.map((type) => (
                      <View key={type} style={styles.chip}>
                        <Text style={styles.chipIcon}>{TRANSPORT_ICONS[type]}</Text>
                        <Text style={styles.chipLabel}>{TRANSPORT_LABELS[type]}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* 🗺️ Route Map */}
            <View style={styles.mapSection}>
              <Text variant="labelSmall" style={styles.mapLabel}>
                🗺️ Visualisation du trajet
              </Text>
              <RouteMap
                steps={selectedRoute.steps}
                height={250}
                currentStepIndex={selectedStepIndex}
                onStepSelect={handleStepSelect}
              />
            </View>

            <Text variant="labelSmall" style={styles.stepsHeader}>
              Étapes du trajet
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={handleNewSearch}
              style={styles.newSearchButton}
              contentStyle={styles.newSearchButtonContent}
            >
              Refaire la recherche
            </Button>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingVertical: 12,
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  comparisonBadgeContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  comparisonBadge: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 24,
    color: '#fff',
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  priceContainer: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  durationContainer: {
    flex: 1,
    alignItems: 'center',
  },
  durationLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  stepsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
  },
  stepsText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  transportChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipLabel: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
  },
  mapSection: {
    marginBottom: 16,
  },
  mapLabel: {
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  stepsHeader: {
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  newSearchButton: {
    borderRadius: 8,
    borderColor: '#6200ee',
  },
  newSearchButtonContent: {
    paddingVertical: 6,
  },
  stepWrapper: {
    position: 'relative',
  },
  activeStepWrapper: {
    backgroundColor: 'rgba(98, 0, 238, 0.05)',
    borderRadius: 10,
    marginHorizontal: 16,
  },
  activeIndicator: {
    position: 'absolute',
    right: 24,
    top: 12,
    backgroundColor: '#6200ee',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
