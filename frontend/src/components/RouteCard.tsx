import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';

import { CalculatedRoute } from '../types';
import { TRANSPORT_LABELS, TRANSPORT_ICONS } from '../constants/transport';
import VoteButtons from './VoteButtons';

interface Props {
  route: CalculatedRoute;
  onPress: (route: CalculatedRoute) => void;
  onVote: (connectionId: string, vote: 1 | -1) => Promise<void>;
  rank: number;
  userVotes?: Record<string, 1 | -1 | 0>;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export default function RouteCard({ 
  route, 
  onPress, 
  onVote,
  rank,
  userVotes = {}
}: Props) {
  const stepCount = route.steps.length;
  
  // Get the first step's connection ID (for voting)
  // In a real scenario, each step would have its own connection ID
  // For now, we'll use the route ID as a fallback
  const connectionId = route.id;

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

          <View style={styles.footer}>
            <View style={styles.voteContainer}>
              <VoteButtons
                connectionId={connectionId}
                upvotes={0} // TODO: Fetch actual upvotes from API
                downvotes={0} // TODO: Fetch actual downvotes from API
                userVote={userVotes[connectionId] || 0}
                onVote={onVote}
                size="small"
              />
            </View>
            <Text style={styles.routeId}>ID: {connectionId.substring(0, 8)}</Text>
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
  voteContainer: {
    flex: 1,
  },
  routeId: {
    fontSize: 10,
    color: '#ccc',
  },
});
