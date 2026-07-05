import { StyleSheet, View } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { RouteStep } from '../types';
import { TRANSPORT_LABELS, TRANSPORT_ICONS } from '../constants/transport';

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
  } | null;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export default function RouteStepItem({ step, index, isFirst, isLast, voteStats }: Props) {
  const hasVotes = voteStats && voteStats.totalVotes > 0;
  
  return (
    <View style={styles.container}>
      <View style={styles.connectorContainer}>
        {!isFirst && <View style={styles.connectorLine} />}
        <View style={styles.stepDot}>
          <Text style={styles.stepNumber}>{index + 1}</Text>
        </View>
        {!isLast && <View style={styles.connectorLine} />}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.typeContainer}>
            <Text style={styles.typeIcon}>{TRANSPORT_ICONS[step.type]}</Text>
            <Text variant="labelMedium" style={styles.typeLabel}>
              {TRANSPORT_LABELS[step.type]}
            </Text>
          </View>
          <View style={styles.priceDuration}>
            <Text style={styles.price}>{step.price} CFA</Text>
            <Text style={styles.duration}>• {formatDuration(step.duration)}</Text>
          </View>
        </View>

        <View style={styles.routeInfo}>
          <Text variant="bodyMedium" style={styles.fromTo}>
            {step.from} <Text style={styles.arrow}>→</Text> {step.to}
          </Text>
          <Text variant="bodySmall" style={styles.instructions}>
            {step.instructions}
          </Text>
        </View>

        {/* Vote stats for this step */}
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
              <Text style={[
                styles.voteStatScore,
                voteStats.voteScore > 0 && styles.positiveScore,
                voteStats.voteScore < 0 && styles.negativeScore,
              ]}>
                {voteStats.voteScore > 0 ? '+' : ''}{voteStats.voteScore}
              </Text>
              <Text style={styles.voteStatLabel}>score</Text>
            </View>
          </View>
        )}
      </View>
    </View>
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
  stepNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
  duration: {
    fontSize: 13,
    color: '#666',
  },
  routeInfo: {
    gap: 2,
  },
  fromTo: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
  arrow: {
    color: '#888',
    marginHorizontal: 4,
  },
  instructions: {
    color: '#666',
    fontStyle: 'italic',
  },
  voteStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  voteStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  positiveScore: {
    color: '#4CAF50',
  },
  negativeScore: {
    color: '#f44336',
  },
});
