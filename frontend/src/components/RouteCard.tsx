import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';

import { CalculatedRoute, RouteStep } from '../types';

interface Props {
  route: CalculatedRoute;
  onPress: (route: CalculatedRoute) => void;
  rank: number; // 1st, 2nd, 3rd result — used for the label
}

// Maps transport type to a readable French label
const TRANSPORT_LABELS: Record<RouteStep['type'], string> = {
  communal_taxi: 'Taxi',
  gbaka: 'Gbaka',
  walking: 'À pied',
};

// Builds a deduped, ordered summary like "À pied · Gbaka · Taxi"
function buildTransportSummary(steps: RouteStep[]): string {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const step of steps) {
    const label = TRANSPORT_LABELS[step.type];
    if (!seen.has(label)) {
      seen.add(label);
      order.push(label);
    }
  }
  return order.join(' · ');
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export default function RouteCard({ route, onPress, rank }: Props) {
  const transportSummary = buildTransportSummary(route.steps);
  const stepCount = route.steps.length;

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
              >
                {TRANSPORT_LABELS[step.type]}
              </Chip>
            ))}
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
  },
  chip: {
    backgroundColor: '#f0f0f0',
    height: 28,
  },
  chipText: {
    fontSize: 11,
  },
});
