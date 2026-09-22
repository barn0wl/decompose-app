// src/components/LegCard.tsx
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { BoardingLeg, WalkingLeg, Leg } from '../types';
import { TRANSPORT_COLORS } from '../constants/transport';
import { COLORS, FONTS } from '../constants/theme';
import TransportIcon from './TransportIcon';

interface Props {
  leg: Leg;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
}

export default function LegCard({ leg, index, isFirst, isLast }: Props) {
  if (leg.type === 'walking') {
    return <WalkingLegRow leg={leg} index={index} />;
  }
  return <BoardingLegCard leg={leg} index={index} />;
}

// ─── WALKING LEG ──────────────────────────────────────────────────────────

function WalkingLegRow({ leg, index }: { leg: WalkingLeg; index: number }) {
  return (
    <View style={styles.walkingContainer}>
      <View style={styles.walkingDot}>
        <TransportIcon type="walking" size={14} color={COLORS.textMuted} />
      </View>
      <View style={styles.walkingContent}>
        <View style={styles.walkingHeaderRow}>
          <Text style={styles.walkingLabel}>Marche</Text>
          <Text style={styles.walkingMeta}>
            {formatDistance(leg.distanceM)} • {formatDuration(leg.effectiveDuration)}
          </Text>
        </View>
        <Text style={styles.walkingFromTo}>
          {leg.fromStop.name} → {leg.toStop.name}
        </Text>
      </View>
    </View>
  );
}

// ─── BOARDING LEG ─────────────────────────────────────────────────────────

function BoardingLegCard({ leg, index }: { leg: BoardingLeg; index: number }) {
  const accent = TRANSPORT_COLORS[leg.transportType] ?? COLORS.primary;

  return (
    <View style={styles.boardingContainer}>
      {/* Header row: icon + route name + price/duration */}
      <View style={[styles.boardingHeader, { borderLeftColor: accent }]}>
        <View style={styles.boardingHeaderLeft}>
          <View style={[styles.boardingIconCircle, { backgroundColor: accent }]}>
            <TransportIcon type={leg.transportType} size={16} color={COLORS.textLight} />
          </View>
          <View style={styles.boardingHeaderText}>
            <Text style={styles.boardingRouteName} numberOfLines={1}>
              {leg.routeName}
            </Text>
            <Text style={styles.boardingMeta}>
              {leg.distanceStops + 1} arrêts • {formatDuration(leg.effectiveDuration)}
            </Text>
          </View>
        </View>
        <View style={styles.boardingHeaderRight}>
          <Text style={[styles.boardingPrice, { color: accent }]}>
            {leg.price} CFA
          </Text>
        </View>
      </View>

      {/* Sub-segments: each intermediate stop listed */}
      <View style={styles.segmentsList}>
        {leg.intermediateStops.length > 0 ? (
          <>
            <StopRow name={leg.fromStop.name} isFirst />
            {leg.intermediateStops.map((stop, i) => (
              <StopRow
                key={`${stop.id}-${i}`}
                name={stop.name}
                isLast={i === leg.intermediateStops.length - 1}
              />
            ))}
            {leg.intermediateStops.length === 0 && (
              <StopRow name={leg.toStop.name} isLast />
            )}
          </>
        ) : (
          <>
            <StopRow name={leg.fromStop.name} isFirst />
            <StopRow name={leg.toStop.name} isLast />
          </>
        )}
      </View>
    </View>
  );
}

function StopRow({ name, isFirst, isLast }: { name: string; isFirst?: boolean; isLast?: boolean }) {
  return (
    <View style={styles.stopRow}>
      <View style={styles.stopDotColumn}>
        <View style={[styles.stopDot, (isFirst || isLast) && styles.stopDotBold]} />
      </View>
      <Text style={[styles.stopName, (isFirst || isLast) && styles.stopNameBold]}>
        {name}
      </Text>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Boarding
  boardingContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 10,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  boardingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderLeftWidth: 4,
    backgroundColor: COLORS.surfaceAlt,
  },
  boardingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  boardingIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardingHeaderText: {
    flex: 1,
  },
  boardingRouteName: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  boardingMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  boardingHeaderRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  boardingPrice: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: '700',
  },

  // Sub-segment list
  segmentsList: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 22,
  },
  stopDotColumn: {
    width: 20,
    alignItems: 'center',
  },
  stopDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  stopDotBold: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  stopName: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 6,
    flex: 1,
  },
  stopNameBold: {
    color: COLORS.textDark,
    fontWeight: '600',
  },

  // Walking
  walkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    marginBottom: 10,
    marginHorizontal: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  walkingDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  walkingContent: {
    flex: 1,
  },
  walkingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  walkingLabel: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  walkingMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  walkingFromTo: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});
