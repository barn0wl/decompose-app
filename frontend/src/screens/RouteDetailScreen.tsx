// src/screens/RouteDetailScreen.tsx
import { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ListRenderItemInfo,
} from 'react-native';
import { Text, Appbar, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import LegCard from '../components/LegCard';
import RouteMap from '../components/RouteMap';
import TransportIcon from '../components/TransportIcon';
import { RootStackParamList, Leg, TransportType } from '../types';
import { TRANSPORT_LABELS } from '../constants/transport';
import { COLORS, FONTS } from '../constants/theme';

import MapIcon from '../../assets/icons/map.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'RouteDetail'>;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function getUniqueTransportTypes(legs: Leg[]): TransportType[] {
  const seen = new Set<TransportType>();
  const types: TransportType[] = [];
  for (const leg of legs) {
    if (leg.type === 'walking') continue;
    if (!seen.has(leg.transportType)) {
      seen.add(leg.transportType);
      types.push(leg.transportType);
    }
  }
  return types;
}

export default function RouteDetailScreen({ navigation, route }: Props) {
  const { route: calculatedRoute, originName, destinationName } = route.params;
  const [selectedLegIndex, setSelectedLegIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const uniqueTransportTypes = getUniqueTransportTypes(calculatedRoute.legs);

  const handleGoBack = () => navigation.goBack();

  const handleNewSearch = () => {
    navigation.popToTop();
    navigation.navigate('Home');
  };

  const handleLegSelect = useCallback((index: number) => {
    setSelectedLegIndex(index);
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5,
    });
  }, []);

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

  const renderLeg = ({ item, index }: ListRenderItemInfo<Leg>) => (
    <View style={index === selectedLegIndex ? styles.activeLegWrapper : undefined}>
      <LegCard
        leg={item}
        index={index}
        isFirst={index === 0}
        isLast={index === calculatedRoute.legs.length - 1}
      />
    </View>
  );

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
        data={calculatedRoute.legs}
        keyExtractor={(_, index) => `leg-${index}`}
        renderItem={renderLeg}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Recap card */}
            <View style={styles.recapCard}>
              <View style={styles.recapAccent} />
              <View style={styles.recapContent}>
                <View style={styles.recapRow}>
                  <View style={styles.recapPoint}>
                    <View style={[styles.dot, styles.originDot]} />
                    <Text style={styles.recapLabel}>De</Text>
                    <Text style={styles.recapStop} numberOfLines={1}>
                      {originName}
                    </Text>
                  </View>
                  <Text style={styles.recapArrow}>→</Text>
                  <View style={styles.recapPoint}>
                    <View style={[styles.dot, styles.destinationDot]} />
                    <Text style={styles.recapLabel}>À</Text>
                    <Text style={styles.recapStop} numberOfLines={1}>
                      {destinationName}
                    </Text>
                  </View>
                </View>

                <View style={styles.recapMeta}>
                  <View style={styles.recapMetaItem}>
                    <Text style={styles.recapMetaValue}>
                      {calculatedRoute.totalPrice} CFA
                    </Text>
                    <Text style={styles.recapMetaLabel}>Total</Text>
                  </View>
                  <View style={styles.recapMetaDivider} />
                  <View style={styles.recapMetaItem}>
                    <Text style={styles.recapMetaValue}>
                      {formatDuration(calculatedRoute.totalEffectiveDuration)}
                    </Text>
                    <Text style={styles.recapMetaLabel}>Durée</Text>
                  </View>
                  <View style={styles.recapMetaDivider} />
                  <View style={styles.recapMetaItem}>
                    <Text style={styles.recapMetaValue}>
                      {calculatedRoute.boardingCount}
                    </Text>
                    <Text style={styles.recapMetaLabel}>
                      Trajet{calculatedRoute.boardingCount > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                {uniqueTransportTypes.length > 0 && (
                  <View style={styles.transportChipsRow}>
                    {uniqueTransportTypes.map((type) => (
                      <View key={type} style={styles.chip}>
                        <TransportIcon type={type} size={12} />
                        <Text style={styles.chipLabel}>
                          {TRANSPORT_LABELS[type]}
                        </Text>
                      </View>
                    ))}
                    {calculatedRoute.totalWalkingDistanceM > 0 && (
                      <View style={styles.chip}>
                        <TransportIcon type="walking" size={12} />
                        <Text style={styles.chipLabel}>
                          {calculatedRoute.totalWalkingDistanceM < 1000
                            ? `${Math.round(calculatedRoute.totalWalkingDistanceM)}m`
                            : `${(calculatedRoute.totalWalkingDistanceM / 1000).toFixed(2)}km`}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Map */}
            <View style={styles.mapSection}>
              <View style={styles.sectionHeader}>
                <MapIcon width={16} height={16} fill={COLORS.primary} />
                <Text style={styles.sectionHeaderText}>Visualisation</Text>
              </View>
              <RouteMap
                legs={calculatedRoute.legs}
                height={240}
                currentLegIndex={selectedLegIndex}
                onLegSelect={handleLegSelect}
              />
            </View>

            <Text style={styles.sectionHeaderText}>
              Étapes ({calculatedRoute.legs.length})
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
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  appbar: { backgroundColor: COLORS.primary },
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
    paddingBottom: 24,
  },
  headerContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  // Recap card
  recapCard: {
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
  recapAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0, width: 4,
    backgroundColor: COLORS.accent,
  },
  recapContent: { padding: 14 },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recapPoint: { flex: 1, alignItems: 'center' },
  recapLabel: {
    fontFamily: FONTS.heading,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
    fontWeight: '600',
  },
  recapStop: {
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: COLORS.primary,
    fontSize: 14,
    textAlign: 'center',
  },
  recapArrow: {
    fontSize: 18,
    color: COLORS.textMuted,
    marginHorizontal: 6,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    marginBottom: 4,
  },
  originDot: { backgroundColor: COLORS.accent },
  destinationDot: { backgroundColor: COLORS.highlight },

  recapMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
  },
  recapMetaItem: { flex: 1, alignItems: 'center' },
  recapMetaValue: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  recapMetaLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  recapMetaDivider: {
    width: 1, height: 28,
    backgroundColor: COLORS.surfaceAlt,
  },
  transportChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipLabel: {
    fontFamily: FONTS.heading,
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Map section
  mapSection: { marginBottom: 16 },
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
    marginLeft: 4,
    marginBottom: 8,
  },

  // Active leg highlight
  activeLegWrapper: {
    // Slight visual emphasis on the selected leg
    // (LegCard already has its own card styles)
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
  newSearchButtonContent: { paddingVertical: 6 },
});
