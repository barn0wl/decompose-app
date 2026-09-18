import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';

import { RouteStep } from '../types';
import { TRANSPORT_LABELS, TRANSPORT_COLORS } from '../constants/transport';
import { COLORS, FONTS } from '../constants/theme';
import TransportIcon from './TransportIcon';
import VoteButtons from './VoteButtons';

interface Props {
  step: RouteStep;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  voteStats?: {
    upvotes: number;
    downvotes: number;
    voteScore: number;
    totalVotes: number;
    userVote?: 1 | -1 | 0;
  } | null;
  onVote?: (connectionId: string, vote: 1 | -1) => Promise<void>;
  isVoting?: boolean;
  onPress?: () => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export default function RouteStepItem({
  step,
  index,
  isFirst,
  isLast,
  voteStats,
  onVote,
  isVoting = false,
  onPress,
}: Props) {
  const isWalking = step.type === 'walking';
  const hasVotes = voteStats && voteStats.totalVotes > 0 && !isWalking;
  const connectionId = step.connectionId;
  const canVote = !isWalking && !!connectionId && !!onVote;

  const stepColor = TRANSPORT_COLORS[step.type];
  const stepLabel = TRANSPORT_LABELS[step.type];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Connector / step dot column */}
      <View style={styles.connectorContainer}>
        {!isFirst && (
          <View style={[styles.connectorLine, { backgroundColor: stepColor + '40' }]} />
        )}
        <View
          style={[
            styles.stepDot,
            { backgroundColor: isWalking ? COLORS.surfaceAlt : stepColor },
            isWalking && styles.stepDotWalking,
          ]}
        >
          {isWalking ? (
            <TransportIcon type="walking" size={14} color={COLORS.textMuted} />
          ) : (
            <Text style={styles.stepNumber}>{index + 1}</Text>
          )}
        </View>
        {!isLast && (
          <View style={[styles.connectorLine, { backgroundColor: stepColor + '40' }]} />
        )}
      </View>

      {/* Content card */}
      <View
        style={[
          styles.content,
          isWalking && styles.contentWalking,
          !isWalking && { borderLeftColor: stepColor, borderLeftWidth: 3 },
        ]}
      >
        {/* Header: transport type + price/duration */}
        <View style={styles.header}>
          <View style={styles.typeContainer}>
            <TransportIcon type={step.type} size={18} />
            <Text
              style={[
                styles.typeLabel,
                isWalking && styles.typeLabelWalking,
              ]}
            >
              {stepLabel}
            </Text>
          </View>
          <View style={styles.priceDuration}>
            <Text
              style={[
                styles.price,
                isWalking && styles.priceWalking,
              ]}
            >
              {isWalking ? 'Gratuit' : `${step.price} CFA`}
            </Text>
            <Text style={styles.durationDot}>•</Text>
            <Text
              style={[
                styles.duration,
                isWalking && styles.durationWalking,
              ]}
            >
              {formatDuration(step.duration)}
            </Text>
          </View>
        </View>

        {/* Route info */}
        <View style={styles.routeInfo}>
          <Text style={styles.fromTo}>
            {step.from} <Text style={styles.arrow}>→</Text> {step.to}
          </Text>
          <Text style={styles.instructions}>{step.instructions}</Text>
        </View>

        {/* Vote section */}
        {!isWalking && (
          <View style={styles.voteSection}>
            {hasVotes && (
              <View style={styles.voteStats}>
                <View style={styles.voteStatItem}>
                  <View style={[styles.voteStatDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={styles.voteStatText}>{voteStats.upvotes}</Text>
                </View>
                <View style={styles.voteStatItem}>
                  <View style={[styles.voteStatDot, { backgroundColor: '#B00020' }]} />
                  <Text style={styles.voteStatText}>{voteStats.downvotes}</Text>
                </View>
                <View style={styles.voteStatItem}>
                  <Text
                    style={[
                      styles.voteStatScore,
                      voteStats.voteScore > 0 && styles.positiveScore,
                      voteStats.voteScore < 0 && styles.negativeScore,
                    ]}
                  >
                    {voteStats.voteScore > 0 ? '+' : ''}
                    {voteStats.voteScore}
                  </Text>
                </View>
              </View>
            )}

            {canVote && (
              <View style={styles.voteButtonsContainer}>
                <VoteButtons
                  connectionId={connectionId}
                  upvotes={voteStats?.upvotes || 0}
                  downvotes={voteStats?.downvotes || 0}
                  userVote={voteStats?.userVote || 0}
                  onVote={onVote}
                  size="small"
                />
              </View>
            )}
          </View>
        )}

        {/* Walking info */}
        {isWalking && (
          <View style={styles.walkingInfo}>
            <Text style={styles.walkingInfoText}>
              Gratuit • Toujours disponible
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  connectorContainer: {
    alignItems: 'center',
    marginRight: 12,
    paddingVertical: 4,
    width: 32,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 8,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  stepDotWalking: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  stepNumber: {
    fontFamily: FONTS.heading,
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '700',
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  contentWalking: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeLabel: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  typeLabelWalking: {
    color: COLORS.textMuted,
  },
  priceDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceWalking: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  durationDot: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  duration: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  durationWalking: {
    color: COLORS.textMuted,
  },

  // Route info
  routeInfo: {
    gap: 4,
  },
  fromTo: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  arrow: {
    color: COLORS.textMuted,
    marginHorizontal: 4,
  },
  instructions: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // Vote section
  voteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
  },
  voteStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voteStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  voteStatText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  voteStatScore: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  voteButtonsContainer: {
    marginLeft: 8,
  },
  positiveScore: {
    color: COLORS.primary,
  },
  negativeScore: {
    color: '#B00020',
  },

  // Walking info
  walkingInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  walkingInfoText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
