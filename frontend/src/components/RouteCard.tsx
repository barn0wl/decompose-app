import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

import { CalculatedRoute } from '../types';
import { TRANSPORT_LABELS } from '../constants/transport';
import { COLORS, FONTS } from '../constants/theme';
import TransportIcon from './TransportIcon';

interface Props {
  route: CalculatedRoute;
  onPress: (route: CalculatedRoute) => void;
  rank: number;
  totalRoutes?: number;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export default function RouteCard({ route, onPress, rank, totalRoutes = 1 }: Props) {
  const stepCount = route.steps.length;
  const trustScore = route.trustScore;
  const isOnlyRoute = totalRoutes === 1;

  const isFastest = route.isFastest && !isOnlyRoute;
  const isCheapest = route.isCheapest && !isOnlyRoute;
  const isBestBalanced = route.isBestBalanced && !isOnlyRoute;

  // Get accent color based on route status
  const getAccentColor = () => {
    if (isFastest) return COLORS.highlight;   // Blue
    if (isCheapest) return COLORS.accent;     // Gold
    if (isBestBalanced) return COLORS.primary; // Teal
    return COLORS.border;
  };

  const getBadgeText = () => {
    if (isFastest) return 'Plus rapide';
    if (isCheapest) return 'Moins cher';
    if (isBestBalanced) return 'Équilibré';
    return '';
  };

  const getBadgeColor = () => {
    if (isFastest) return COLORS.highlight;
    if (isCheapest) return COLORS.accent;
    if (isBestBalanced) return COLORS.primary;
    return COLORS.border;
  };

  // Deduplicate transport types for chips (show unique types only)
  const uniqueTransportTypes = Array.from(
    new Set(route.steps.map(s => s.type))
  );

  return (
    <TouchableOpacity onPress={() => onPress(route)} activeOpacity={0.85}>
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: getAccentColor() }]} />

        <View style={styles.cardContent}>
          {/* Header: Rank + Badge + Price */}
          <View style={styles.header}>
            <View style={styles.leftHeader}>
              <Text style={styles.rank}>Option {rank}</Text>
              {(isFastest || isCheapest || isBestBalanced) && (
                <View style={[styles.statusBadge, { backgroundColor: getBadgeColor() }]}>
                  <Text style={styles.statusBadgeText}>{getBadgeText()}</Text>
                </View>
              )}
            </View>
            <Text style={styles.price}>{route.totalPrice} CFA</Text>
          </View>

          {/* Meta: Duration + Steps */}
          <View style={styles.meta}>
            <Text style={styles.metaText}>{formatDuration(route.totalDuration)}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>
              {stepCount} étape{stepCount > 1 ? 's' : ''}
            </Text>
          </View>

          {/* Transport Icons (unique types only) */}
          <View style={styles.transportRow}>
            {uniqueTransportTypes.map((type, i) => (
              <View key={i} style={styles.transportChip}>
                <TransportIcon type={type} size={14} />
                <Text style={styles.transportChipText}>
                  {TRANSPORT_LABELS[type]}
                </Text>
              </View>
            ))}
          </View>

          {/* Footer: Trust Score + Compare Hint */}
          <View style={styles.footer}>
            {trustScore && (
              <View style={styles.trustContainer}>
                <View
                  style={[
                    styles.trustDot,
                    {
                      backgroundColor:
                        trustScore.score >= 70
                          ? COLORS.primary
                          : trustScore.score >= 40
                          ? COLORS.accent
                          : COLORS.border,
                    },
                  ]}
                />
                <Text style={styles.trustText}>
                  {trustScore.score}% de confiance
                  {trustScore.totalVotes > 0 && ` (${trustScore.totalVotes})`}
                </Text>
              </View>
            )}
            {!isOnlyRoute && (
              <Text style={styles.compareHint}>
                {rank === 1 ? 'Meilleure option' : `#${rank}`}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    padding: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  rank: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontFamily: FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.3,
  },
  price: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Meta
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  // Transport row
  transportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  transportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  transportChipText: {
    fontFamily: FONTS.heading,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
  },
  trustContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trustText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  compareHint: {
    fontFamily: FONTS.heading,
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
