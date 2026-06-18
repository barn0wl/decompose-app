import { StyleSheet, View } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { RouteStep } from '../types';

interface Props {
  step: RouteStep;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

const TRANSPORT_ICONS: Record<RouteStep['type'], string> = {
  communal_taxi: '🚕',
  gbaka: '🚌',
  walking: '🚶',
};

const TRANSPORT_LABELS: Record<RouteStep['type'], string> = {
  communal_taxi: 'Taxi communal',
  gbaka: 'Gbaka',
  walking: 'À pied',
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export default function RouteStepItem({ step, index, isFirst, isLast }: Props) {
  return (
    <View style={styles.container}>
      {/* Connector line and dot */}
      <View style={styles.connectorContainer}>
        {!isFirst && <View style={styles.connectorLine} />}
        <View style={styles.stepDot}>
          <Text style={styles.stepNumber}>{index + 1}</Text>
        </View>
        {!isLast && <View style={styles.connectorLine} />}
      </View>

      {/* Step content */}
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
});
