import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Badge } from 'react-native-paper';

interface Props {
  count: number;
  onPress: () => void;
}

export default function PendingBanner({ count, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={styles.banner}>
        <View style={styles.content}>
          <Text style={styles.icon}>📋</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {count} new route{count > 1 ? 's' : ''} need confirmation!
            </Text>
            <Text style={styles.subtitle}>
              Help verify routes suggested by other users
            </Text>
          </View>
          <Badge style={styles.badge}>{count}</Badge>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 12,
    color: '#388E3C',
    marginTop: 1,
  },
  badge: {
    backgroundColor: '#2E7D32',
    color: '#fff',
    fontSize: 12,
    marginLeft: 8,
  },
});
