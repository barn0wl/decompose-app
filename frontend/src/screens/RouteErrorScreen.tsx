// src/screens/RouteErrorScreen.tsx
import { StyleSheet, View } from 'react-native';
import { Text, Button, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types';
import { COLORS, FONTS } from '../constants/theme';

import SearchXIcon from '../../assets/icons/search-x.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'RouteError'>;

export default function RouteErrorScreen({ navigation, route }: Props) {
  const { originName, destinationName, message, hint } = route.params;

  const handleRetry = () => {
    // Go back to Home so the user can adjust their search.
    navigation.popToTop();
    navigation.navigate('Home');
  };

  const handleGoBack = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={handleGoBack} color={COLORS.textLight} />
        <Appbar.Content
          title="Aucun trajet"
          titleStyle={styles.appbarTitle}
        />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Icon circle */}
        <View style={styles.iconCircle}>
          <SearchXIcon width={72} height={72} fill={COLORS.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Aucun trajet trouvé</Text>

        {/* Origin → Destination summary */}
        <View style={styles.journeyRow}>
          <View style={styles.journeyPoint}>
            <View style={[styles.dot, styles.originDot]} />
            <Text style={styles.journeyLabel}>De</Text>
            <Text style={styles.journeyStop} numberOfLines={2}>
              {originName}
            </Text>
          </View>
          <Text style={styles.journeyArrow}>→</Text>
          <View style={styles.journeyPoint}>
            <View style={[styles.dot, styles.destinationDot]} />
            <Text style={styles.journeyLabel}>À</Text>
            <Text style={styles.journeyStop} numberOfLines={2}>
              {destinationName}
            </Text>
          </View>
        </View>

        {/* Error card */}
        <View style={styles.errorCard}>
          <View style={styles.errorAccent} />
          <View style={styles.errorContent}>
            <Text style={styles.errorMessage}>{message}</Text>
            {hint && <Text style={styles.errorHint}>{hint}</Text>}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleRetry}
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
            buttonColor={COLORS.primary}
            textColor={COLORS.textLight}
            icon="magnify"
          >
            Nouvelle recherche
          </Button>
          <Button
            mode="outlined"
            onPress={handleGoBack}
            style={styles.secondaryButton}
            contentStyle={styles.secondaryButtonContent}
            icon="arrow-left"
            textColor={COLORS.primary}
          >
            Retour
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  appbar: {
    backgroundColor: COLORS.primary,
  },
  appbarTitle: {
    fontFamily: FONTS.heading,
    color: COLORS.textLight,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Icon
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  // Title
  title: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Journey summary
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  journeyPoint: {
    flex: 1,
    alignItems: 'center',
  },
  journeyLabel: {
    fontFamily: FONTS.heading,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 4,
    fontWeight: '600',
  },
  journeyStop: {
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: COLORS.primary,
    fontSize: 15,
    textAlign: 'center',
  },
  journeyArrow: {
    fontSize: 20,
    color: COLORS.textMuted,
    marginHorizontal: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  originDot: { backgroundColor: COLORS.accent },
  destinationDot: { backgroundColor: COLORS.highlight },

  // Error card
  errorCard: {
    backgroundColor: '#FFF3F3',
    borderRadius: 14,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 24,
  },
  errorAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#B00020',
  },
  errorContent: {
    padding: 16,
  },
  errorMessage: {
    color: '#B00020',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  errorHint: {
    color: '#B00020',
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.85,
    lineHeight: 18,
  },

  // Actions
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    elevation: 3,
  },
  primaryButtonContent: {
    paddingVertical: 6,
  },
  secondaryButton: {
    borderRadius: 12,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  secondaryButtonContent: {
    paddingVertical: 6,
  },
});
