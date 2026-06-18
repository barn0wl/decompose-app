import { StyleSheet, FlatList, View } from 'react-native';
import { Text, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import RouteCard from '../components/RouteCard';
import { RootStackParamList, CalculatedRoute } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

const OPTIMIZE_LABELS = {
  price: 'les moins chers',
  time: 'les plus rapides',
  balanced: 'les plus équilibrés',
};

export default function ResultsScreen({ navigation, route }: Props) {
  const { originName, destinationName, optimizeBy, routes } = route.params;

  const handleRoutePress = (selectedRoute: CalculatedRoute) => {
    navigation.navigate('RouteDetail', {
      selectedRoute,
      originName,
      destinationName,
    });
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.journeySummary}>
        <Text variant="bodyMedium" style={styles.journeyLabel}>De</Text>
        <Text variant="titleMedium" style={styles.journeyStop}>{originName}</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text variant="bodyMedium" style={styles.journeyLabel}>À</Text>
        <Text variant="titleMedium" style={styles.journeyStop}>{destinationName}</Text>
      </View>

      <Text variant="bodySmall" style={styles.subtitle}>
        {routes.length} trajet{routes.length > 1 ? 's' : ''} trouvé{routes.length > 1 ? 's' : ''},{' '}
        {OPTIMIZE_LABELS[optimizeBy]}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text variant="bodyLarge" style={styles.emptyText}>
        Aucun trajet trouvé entre ces deux arrêts.
      </Text>
      <Text variant="bodySmall" style={styles.emptyHint}>
        Essaie d'autres points de départ ou de destination.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Résultats" />
      </Appbar.Header>

      <FlatList
        data={routes}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <RouteCard
            route={item}
            onPress={handleRoutePress}
            rank={index + 1}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
    paddingTop: 12,
  },
  listHeader: {
    marginBottom: 16,
  },
  journeySummary: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  journeyLabel: {
    color: '#888',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  journeyStop: {
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  arrow: {
    fontSize: 18,
    color: '#888',
    marginVertical: 4,
    marginLeft: 2,
  },
  subtitle: {
    color: '#666',
    marginLeft: 2,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#444',
    marginBottom: 8,
  },
  emptyHint: {
    textAlign: 'center',
    color: '#888',
  },
});
