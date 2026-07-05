import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';

import { CalculatedRoute } from '../types';
import { TRANSPORT_LABELS, TRANSPORT_ICONS } from '../constants/transport';
import TrustIndicator from './TrustIndicator';

interface Props {
  route: CalculatedRoute;
  onPress: (route: CalculatedRoute) => void;
  rank: number;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export default function RouteCard({ route, onPress, rank }: Props) {
  const stepCount = route.steps.length;
  const trustScore = route.trustScore;

  return (
    <TouchableOpacity onPress={() => onPress(route)} activeOpacity={0.8}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="labelSmall" style={styles.rank}>
              Option {rank}
            </Text>
            <Text variant="headlineSmall" style={styles.price}>
              {route.totalPrice} CFA
            </Text>
          </View>

          <View style={styles.meta}>
            <Text variant="bodyMedium" style={styles.duration}>
              ⏱ {formatDuration(route.totalDuration)}
            </Text>
            <Text variant="bodyMedium" style={styles.steps}>
              {stepCount} étape{stepCount > 1 ? 's' : ''}
            </Text>
          </View>

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

          {/* Trust Indicator */}
          {trustScore && (
            <View style={styles.footer}>
              <TrustIndicator
                score={trustScore.score}
                totalVotes={trustScore.totalVotes}
                size="small"
              />
              {trustScore.stepCount > 0 && (
                <Text style={styles.stepInfo}>
                  {trustScore.stepCount} connection{trustScore.stepCount > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rank: {
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  duration: {
    color: '#444',
  },
  steps: {
    color: '#444',
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
  stepInfo: {
    fontSize: 11,
    color: '#888',
  },
});
