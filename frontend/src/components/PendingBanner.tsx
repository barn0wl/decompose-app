import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import BusIcon from '../../assets/icons/bus-icon.svg';
import { COLORS, FONTS } from '../constants/theme';

interface Props {
  count: number;
  onPress: () => void;
}

export default function PendingBanner({ count, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={styles.banner}>
        <View style={styles.iconCircle}>
          <BusIcon
            width={20}
            height={20}
            fill={COLORS.primary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {count} nouveau{count > 1 ? 'x' : ''} trajet{count > 1 ? 's' : ''} à confirmer
          </Text>
          <Text style={styles.subtitle}>
            Aidez à vérifier les trajets suggérés par la communauté
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    opacity: 0.75,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: COLORS.accent,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  countText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
