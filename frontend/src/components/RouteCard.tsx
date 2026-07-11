import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text, Chip, Badge } from 'react-native-paper';

import { CalculatedRoute } from '../types';
import { TRANSPORT_LABELS, TRANSPORT_ICONS } from '../constants/transport';
import TrustIndicator from './TrustIndicator';

interface Props {
  route: CalculatedRoute;
  onPress: (route: CalculatedRoute) => void;
  rank: number;
  totalRoutes?: number; // Total number of routes being displayed
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

  // Determine if this route has special status
  const isFastest = route.isFastest && !isOnlyRoute;
  const isCheapest = route.isCheapest && !isOnlyRoute;
  const isBestBalanced = route.isBestBalanced && !isOnlyRoute;

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

  // Determine card border style
  const getCardStyle = () => {
    if (isFastest) return [styles.card, styles.fastestCard];
    if (isCheapest) return [styles.card, styles.cheapestCard];
    if (isBestBalanced) return [styles.card, styles.balancedCard];
    return styles.card;
  };

  return (
    <TouchableOpacity onPress={() => onPress(route)} activeOpacity={0.8}>
      <Card style={getCardStyle()}>
        <Card.Content>
          {/* Header with Rank and Price */}
          <View style={styles.header}>
            <View style={styles.leftHeader}>
              <Text variant="labelSmall" style={styles.rank}>
                Option {rank}
              </Text>
              {/* Status Badges */}
              {(isFastest || isCheapest || isBestBalanced) && (
                <View style={styles.badgeContainer}>
                  <Badge
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getBadgeColor() }
                    ]}
                  >
                    {getBadgeText()}
                  </Badge>
                </View>
              )}
            </View>
            <Text variant="headlineSmall" style={styles.price}>
              {route.totalPrice} CFA
            </Text>
          </View>

          {/* Meta: Duration and Steps */}
          <View style={styles.meta}>
            <Text variant="bodyMedium" style={styles.duration}>
              ⏱ {formatDuration(route.totalDuration)}
            </Text>
            <Text variant="bodyMedium" style={styles.steps}>
              {stepCount} étape{stepCount > 1 ? 's' : ''}
            </Text>
          </View>

          {/* Transport Chips */}
          <View style={styles.chipRow}>
            {route.steps.map((step, i) => (
              <Chip
                key={i}
                compact
                style={styles.chip}
                textStyle={styles.chipText}
                icon={() => <Text style={styles.chipIcon}>{TRANSPORT_ICONS[step.type]}</Text>}
              >
                {TRANSPORT_LABELS[step.type]}
              </Chip>
            ))}
          </View>

          {/* Footer with Trust Score and Step Info */}
          <View style={styles.footer}>
            {trustScore && (
              <TrustIndicator
                score={trustScore.score}
                totalVotes={trustScore.totalVotes}
                size="small"
              />
            )}
            <View style={styles.footerRight}>
              {trustScore && trustScore.stepCount > 0 && (
                <Text style={styles.stepInfo}>
                  {trustScore.stepCount} connection{trustScore.stepCount > 1 ? 's' : ''}
                </Text>
              )}
              {/* Show route comparison indicator */}
              {!isOnlyRoute && (
                <Text style={styles.compareHint}>
                  {rank === 1 ? '👑 Best' : `#${rank}`}
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  fastestCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cheapestCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  balancedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  leftHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  rank: {
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    height: 20,
    color: '#fff',
    fontWeight: '600',
  },
  price: {
    fontWeight: '700',
    color: '#1a1a1a',
    fontSize: 22,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  duration: {
    color: '#444',
    fontSize: 14,
  },
  steps: {
    color: '#444',
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#f0f0f0',
    height: 28,
  },
  chipText: {
    fontSize: 11,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepInfo: {
    fontSize: 11,
    color: '#888',
  },
  compareHint: {
    fontSize: 11,
    color: '#6200ee',
    fontWeight: '600',
  },
});
