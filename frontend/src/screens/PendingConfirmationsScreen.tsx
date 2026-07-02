import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Appbar,
  Card,
  Button,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, SuggestedConnection } from '../types';
import { getPendingSuggestions, confirmSuggestion } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';
import { TRANSPORT_LABELS, TRANSPORT_ICONS } from '../constants/transport';

type Props = NativeStackScreenProps<RootStackParamList, 'PendingConfirmations'>;

export default function PendingConfirmationsScreen({ navigation }: Props) {
  const deviceId = useDeviceId();
  const [suggestions, setSuggestions] = useState<SuggestedConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!deviceId) return;
    
    try {
      const data = await getPendingSuggestions(deviceId);
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error('Failed to fetch pending suggestions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSuggestions();
  };

  const handleConfirm = async (suggestionId: string) => {
    if (!deviceId) {
      Alert.alert('Error', 'Unable to identify device.');
      return;
    }

    setConfirmingId(suggestionId);
    try {
      const result = await confirmSuggestion(suggestionId, deviceId);
      
      if (result.approved) {
        Alert.alert(
          '🎉 Route Approved!',
          'This suggestion has been confirmed by the community and is now available as a route!',
          [{ text: 'Great!', onPress: () => fetchSuggestions() }]
        );
      } else {
        Alert.alert(
          '✅ Confirmed!',
          result.message,
          [{ text: 'OK', onPress: () => fetchSuggestions() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to confirm suggestion.');
    } finally {
      setConfirmingId(null);
    }
  };

  const renderItem = ({ item }: { item: SuggestedConnection }) => {
    const isConfirming = confirmingId === item.id;
    const progress = item.confirmations / item.confirmationThreshold;
    const remaining = item.confirmationThreshold - item.confirmations;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.transportBadge}>
              <Text style={styles.transportIcon}>
                {TRANSPORT_ICONS[item.transportType] || '🚌'}
              </Text>
              <Text style={styles.transportLabel}>
                {TRANSPORT_LABELS[item.transportType] || item.transportType}
              </Text>
            </View>
            <Text style={styles.price}>{item.basePrice} CFA</Text>
          </View>

          <View style={styles.routeInfo}>
            <Text style={styles.stopName}>{item.fromStop.name}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.stopName}>{item.toStop.name}</Text>
          </View>

          <View style={styles.communeInfo}>
            <Text style={styles.communeText}>{item.fromStop.commune}</Text>
            <Text style={styles.communeText}>{item.toStop.commune}</Text>
          </View>

          {item.routeDescription && (
            <Text style={styles.description}>{item.routeDescription}</Text>
          )}

          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress * 100, 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {item.confirmations} / {item.confirmationThreshold} confirmations
              {remaining > 0 && ` (${remaining} more needed)`}
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={() => handleConfirm(item.id)}
            loading={isConfirming}
            disabled={isConfirming}
            style={styles.confirmButton}
            contentStyle={styles.confirmButtonContent}
          >
            {isConfirming ? 'Confirming...' : '✅ Confirm this route'}
          </Button>

          <Text style={styles.submittedBy}>
            Submitted by: {item.submittedBy.substring(0, 12)}...
          </Text>
        </Card.Content>
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎉</Text>
      <Text style={styles.emptyTitle}>All caught up!</Text>
      <Text style={styles.emptyText}>
        No pending routes need confirmation right now.
        Check back later or suggest a new route!
      </Text>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('SuggestConnection')}
        style={styles.emptyButton}
      >
        Suggest a Route
      </Button>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Confirm Routes" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading suggestions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content 
          title="Confirm Routes" 
          subtitle={`${suggestions.length} pending`}
        />
      </Appbar.Header>

      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  transportIcon: {
    fontSize: 16,
  },
  transportLabel: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    color: '#1a1a1a',
  },
  arrow: {
    fontSize: 18,
    color: '#888',
    marginHorizontal: 8,
  },
  communeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  communeText: {
    fontSize: 12,
    color: '#888',
  },
  description: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  progressSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  confirmButton: {
    borderRadius: 8,
    marginTop: 4,
  },
  confirmButtonContent: {
    paddingVertical: 4,
  },
  submittedBy: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 8,
  },
});
