import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { RouteStep } from '../types';
import { TRANSPORT_LABELS, TRANSPORT_ICONS } from '../constants/transport';
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
  // Only allow voting if it's NOT walking and we have a connectionId and onVote
  const canVote = !isWalking && !!connectionId && !!onVote;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={styles.connectorContainer}>
        {!isFirst && <View style={styles.connectorLine} />}
        <View style={[styles.stepDot, isWalking && styles.stepDotWalking]}>
          <Text style={[styles.stepNumber, isWalking && styles.stepNumberWalking]}>
            {isWalking ? '🚶' : index + 1}
          </Text>
        </View>
        {!isLast && <View style={styles.connectorLine} />}
      </View>

      <View style={[styles.content, isWalking && styles.contentWalking]}>
        <View style={styles.header}>
          <View style={styles.typeContainer}>
            <Text style={styles.typeIcon}>{TRANSPORT_ICONS[step.type]}</Text>
            <Text 
              variant="labelMedium" 
              style={[styles.typeLabel, isWalking && styles.typeLabelWalking]}
            >
              {TRANSPORT_LABELS[step.type]}
            </Text>
          </View>
          <View style={styles.priceDuration}>
            <Text style={[styles.price, isWalking && styles.priceWalking]}>
              {step.price} CFA
            </Text>
            <Text style={[styles.duration, isWalking && styles.durationWalking]}>
              • {formatDuration(step.duration)}
            </Text>
          </View>
        </View>

        <View style={styles.routeInfo}>
          <Text variant="bodyMedium" style={[styles.fromTo, isWalking && styles.fromToWalking]}>
            {step.from} <Text style={styles.arrow}>→</Text> {step.to}
          </Text>
          <Text variant="bodySmall" style={[styles.instructions, isWalking && styles.instructionsWalking]}>
            {step.instructions}
          </Text>
        </View>

        {/* Vote section - hidden for walking */}
        {!isWalking && (
          <View style={styles.voteSection}>
            {hasVotes && (
              <View style={styles.voteStats}>
                <View style={styles.voteStatItem}>
                  <Text style={styles.voteStatIcon}>👍</Text>
                  <Text style={styles.voteStatText}>{voteStats.upvotes}</Text>
                </View>
                <View style={styles.voteStatItem}>
                  <Text style={styles.voteStatIcon}>👎</Text>
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
                  <Text style={styles.voteStatLabel}>score</Text>
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

        {/* Walking indicator - show that it's free and always available */}
        {isWalking && (
          <View style={styles.walkingInfo}>
            <Text style={styles.walkingInfoText}>🚶 Free and always available</Text>
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
    marginRight: 16,
    paddingVertical: 4,
    width: 28,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#d0d0d0',
    minHeight: 8,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  stepDotWalking: {
    backgroundColor: '#4CAF50',
  },
  stepNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepNumberWalking: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  contentWalking: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeIcon: {
    fontSize: 18,
  },
  typeLabel: {
    color: '#555',
    fontWeight: '500',
  },
  typeLabelWalking: {
    color: '#4CAF50',
  },
  priceDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  priceWalking: {
    color: '#4CAF50',
  },
  duration: {
    fontSize: 13,
    color: '#666',
  },
  durationWalking: {
    color: '#4CAF50',
  },
  routeInfo: {
    gap: 2,
  },
  fromTo: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
  fromToWalking: {
    color: '#4CAF50',
  },
  arrow: {
    color: '#888',
    marginHorizontal: 4,
  },
  instructions: {
    color: '#666',
    fontStyle: 'italic',
  },
  instructionsWalking: {
    color: '#4CAF50',
  },
  voteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  voteStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voteStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  voteStatIcon: {
    fontSize: 12,
  },
  voteStatText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  voteStatScore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
  },
  voteStatLabel: {
    fontSize: 10,
    color: '#888',
    marginLeft: 1,
  },
  voteButtonsContainer: {
    marginLeft: 8,
  },
  positiveScore: {
    color: '#4CAF50',
  },
  negativeScore: {
    color: '#f44336',
  },
  walkingInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  walkingInfoText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
});
