import { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, ListRenderItemInfo, Alert } from 'react-native';
import { Text, Appbar, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import RouteStepItem from '../components/RouteStepItem';
import RouteMap from '../components/RouteMap';
import { RootStackParamList, CalculatedRoute, RouteStep, TransportType } from '../types';
import { TRANSPORT_LABELS } from '../constants/transport';
import { getBulkVoteStats, castVote, VoteStats } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';
import { COLORS, FONTS } from '../constants/theme';
import TransportIcon from '../components/TransportIcon';

// SVG icons
import BoltIcon from '../../assets/icons/bolt.svg';
import CoinsIcon from '../../assets/icons/coins.svg';
import ScaleIcon from '../../assets/icons/scale.svg';
import MapIcon from '../../assets/icons/map.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'RouteDetail'>;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function getUniqueTransportTypes(steps: CalculatedRoute['steps']): TransportType[] {
  const seen = new Set<TransportType>();
  const types: TransportType[] = [];
  for (const step of steps) {
    if (!seen.has(step.type)) {
      seen.add(step.type);
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

  const isFastest = selectedRoute.isFastest;
  const isCheapest = selectedRoute.isCheapest;
  const isBestBalanced = selectedRoute.isBestBalanced;
  const hasComparisonBadge = isFastest || isCheapest || isBestBalanced;

  // Badge helpers
  const getBadgeColor = () => {
    if (isFastest) return COLORS.highlight;
    if (isCheapest) return COLORS.accent;
    if (isBestBalanced) return COLORS.primary;
    return COLORS.border;
  };

  const getBadgeText = () => {
    if (isFastest) return 'Plus rapide';
    if (isCheapest) return 'Moins cher';
    if (isBestBalanced) return 'Équilibré';
    return '';
  };

  const getBadgeIcon = () => {
    if (isFastest) return <BoltIcon width={12} height={12} fill={COLORS.textLight} />;
    if (isCheapest) return <CoinsIcon width={12} height={12} fill={COLORS.textLight} />;
    if (isBestBalanced) return <ScaleIcon width={12} height={12} fill={COLORS.textLight} />;
    return null;
  };

  // Fetch vote stats
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
        console.error('Échec du chargement des votes :', error);
      } finally {
        setLoadingVotes(false);
      }
    };
    fetchStepVotes();
  }, [deviceId, selectedRoute.steps]);

  const handleGoBack = () => navigation.goBack();

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
      Alert.alert('Erreur', 'Impossible d\'identifier l\'appareil. Veuillez réessayer.');
      return;
    }
    if (isVoting) return;
    setIsVoting(true);
    try {
      const result = await castVote({ connectionId, deviceId, vote });

      setStepVoteStats(prev => ({
        ...prev,
        [connectionId]: {
          upvotes: result.connection.upvotes,
          downvotes: result.connection.downvotes,
          voteScore: result.voteScore,
          totalVotes: result.totalVotes,
          userVote: result.userVote,
        },
      }));

      const message = vote === 1 ? 'Vote positif enregistré' : 'Vote négatif enregistré';
      Alert.alert('Vote enregistré', message);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec du vote. Veuillez réessayer.');
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
            <Text style={styles.activeIndicatorText}>Étape actuelle</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={handleGoBack} color={COLORS.textLight} />
        <Appbar.Content
          title="Détail du trajet"
          subtitle={`${originName} → ${destinationName}`}
          titleStyle={styles.appbarTitle}
          subtitleStyle={styles.appbarSubtitle}
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
            {/* Summary card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryAccent} />

              <View style={styles.summaryContent}>
                {/* Comparison badge */}
                {hasComparisonBadge && (
                  <View style={styles.badgeContainer}>
                    <View style={[styles.badge, { backgroundColor: getBadgeColor() }]}>
                      {getBadgeIcon()}
                      <Text style={styles.badgeText}>{getBadgeText()}</Text>
                    </View>
                  </View>
                )}

                {/* Price + Duration */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total</Text>
                    <Text style={styles.priceValue}>{selectedRoute.totalPrice} CFA</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Durée</Text>
                    <Text style={styles.durationValue}>
                      {formatDuration(selectedRoute.totalDuration)}
                    </Text>
                  </View>
                </View>

                {/* Steps + transport chips */}
                <View style={styles.stepsInfo}>
                  <Text style={styles.stepsText}>
                    {selectedRoute.steps.length} étape{selectedRoute.steps.length > 1 ? 's' : ''}
                  </Text>
                  <View style={styles.transportChips}>
                    {uniqueTransportTypes.map((type) => (
                      <View key={type} style={styles.chip}>
                        <TransportIcon type={type} size={14} />
                        <Text style={styles.chipLabel}>{TRANSPORT_LABELS[type]}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Map section */}
            <View style={styles.mapSection}>
              <View style={styles.sectionHeader}>
                <MapIcon width={16} height={16} fill={COLORS.primary} />
                <Text style={styles.sectionHeaderText}>Visualisation du trajet</Text>
              </View>
              <RouteMap
                steps={selectedRoute.steps}
                height={250}
                currentStepIndex={selectedStepIndex}
                onStepSelect={handleStepSelect}
              />
            </View>

            <Text style={styles.sectionHeaderText}>Étapes du trajet</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={handleNewSearch}
              style={styles.newSearchButton}
              contentStyle={styles.newSearchButtonContent}
              icon="arrow-left"
              textColor={COLORS.primary}
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
    paddingVertical: 12,
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  // Summary card
  summaryCard: {
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
  summaryAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.accent,
  },
  summaryContent: {
    padding: 16,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.3,
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: FONTS.heading,
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    fontWeight: '600',
  },
  priceValue: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.primary,
  },
  durationValue: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.surfaceAlt,
  },

  // Steps info
  stepsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
    marginTop: 4,
  },
  stepsText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  transportChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  chipLabel: {
    fontFamily: FONTS.heading,
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Map
  mapSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionHeaderText: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  newSearchButton: {
    borderRadius: 12,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  newSearchButtonContent: {
    paddingVertical: 6,
  },

  // Step wrapper
  stepWrapper: {
    position: 'relative',
  },
  activeStepWrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  activeIndicator: {
    position: 'absolute',
    right: 20,
    top: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeIndicatorText: {
    fontFamily: FONTS.heading,
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
