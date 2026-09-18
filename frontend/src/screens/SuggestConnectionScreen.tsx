import { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Appbar,
  Button,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, Stop } from '../types';
import { createSuggestion } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';
import { TRANSPORT_LABELS } from '../constants/transport';
import { COLORS, FONTS } from '../constants/theme';
import StopSearchInput from '../components/StopSearchInput';
import TransportIcon from '../components/TransportIcon';

type Props = NativeStackScreenProps<RootStackParamList, 'SuggestConnection'>;

type TransportType = 'communal_taxi' | 'gbaka' | 'sotra_bus';

export default function SuggestConnectionScreen({ navigation }: Props) {
  const deviceId = useDeviceId();

  const [fromStop, setFromStop] = useState<Stop | null>(null);
  const [toStop, setToStop] = useState<Stop | null>(null);
  const [transportType, setTransportType] = useState<TransportType>('communal_taxi');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!deviceId) {
      Alert.alert('Erreur', 'Impossible d\'identifier l\'appareil. Veuillez réessayer.');
      return;
    }

    if (!fromStop || !toStop) {
      Alert.alert('Erreur', 'Veuillez sélectionner les arrêts de départ et d\'arrivée.');
      return;
    }

    if (fromStop.id === toStop.id) {
      Alert.alert('Erreur', 'Le départ et la destination ne peuvent pas être identiques.');
      return;
    }

    const priceNum = parseInt(price);
    const durationNum = parseInt(duration);

    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide.');
      return;
    }

    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une durée valide.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createSuggestion({
        fromStopId: fromStop.id,
        toStopId: toStop.id,
        transportType,
        basePrice: priceNum,
        durationMinutes: durationNum,
        routeDescription: description || undefined,
        deviceId,
      });

      Alert.alert(
        'Suggestion envoyée !',
        'Merci pour votre contribution ! Votre suggestion sera examinée par la communauté. Elle nécessite 5 confirmations pour devenir active.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de l\'envoi de la suggestion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = fromStop && toStop && price && duration && !isSubmitting;

  const transportOptions: { value: TransportType; label: string }[] = [
    { value: 'communal_taxi', label: TRANSPORT_LABELS.communal_taxi },
    { value: 'gbaka', label: TRANSPORT_LABELS.gbaka },
    { value: 'sotra_bus', label: TRANSPORT_LABELS.sotra_bus },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color={COLORS.textLight} />
        <Appbar.Content
          title="Suggérer un trajet"
          titleStyle={styles.appbarTitle}
        />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* Intro card */}
          <View style={styles.card}>
            <View style={styles.cardAccent} />
            <View style={styles.cardContent}>
              <Text style={styles.sectionLabel}>
                Aidez les autres à découvrir de nouveaux trajets !
              </Text>
              <Text style={styles.subtitle}>
                Votre suggestion sera vérifiée par la communauté avant d'être disponible.
              </Text>
            </View>
          </View>

          {/* Route card */}
          <View style={[styles.card, styles.searchCard]}>
            <View style={styles.cardAccent} />
            <View style={styles.cardContent}>
              <Text style={styles.sectionLabel}>Itinéraire</Text>

              <StopSearchInput
                label="Point de départ"
                selectedStop={fromStop}
                onStopSelected={setFromStop}
                zIndex={2}
              />

              <StopSearchInput
                label="Destination"
                selectedStop={toStop}
                onStopSelected={setToStop}
                zIndex={1}
              />
            </View>
          </View>

          {/* Transport card */}
          <View style={[styles.card, styles.optimizationCard]}>
            <View style={styles.cardAccent} />
            <View style={styles.cardContent}>
              <Text style={styles.sectionLabel}>Type de transport</Text>

              <View style={styles.transportContainer}>
                {transportOptions.map((option) => {
                  const isSelected = transportType === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setTransportType(option.value)}
                      activeOpacity={0.8}
                      style={[
                        styles.transportButton,
                        isSelected && styles.transportButtonSelected,
                      ]}
                    >
                      <TransportIcon
                        type={option.value}
                        size={16}
                        color={isSelected ? COLORS.textLight : COLORS.primary}
                      />
                      <Text
                        style={[
                          styles.transportButtonText,
                          isSelected && styles.transportButtonTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Details card */}
          <View style={styles.card}>
            <View style={styles.cardAccent} />
            <View style={styles.cardContent}>
              <Text style={styles.sectionLabel}>Détails du trajet</Text>

              <View style={styles.row}>
                <View style={[styles.field, styles.halfField]}>
                  <Text style={styles.fieldLabel}>Prix (CFA)</Text>
                  <TextInput
                    mode="outlined"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    placeholder="ex. 300"
                    outlineColor={COLORS.border}
                    activeOutlineColor={COLORS.primary}
                    style={styles.input}
                    theme={{ colors: { background: COLORS.surface } }}
                  />
                </View>
                <View style={[styles.field, styles.halfField]}>
                  <Text style={styles.fieldLabel}>Durée (min)</Text>
                  <TextInput
                    mode="outlined"
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                    placeholder="ex. 20"
                    outlineColor={COLORS.border}
                    activeOutlineColor={COLORS.primary}
                    style={styles.input}
                    theme={{ colors: { background: COLORS.surface } }}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Description (optionnelle)</Text>
                <TextInput
                  mode="outlined"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="ex. Gbaka d'Adjamé à Yopougon"
                  multiline
                  numberOfLines={2}
                  outlineColor={COLORS.border}
                  activeOutlineColor={COLORS.primary}
                  style={styles.input}
                  theme={{ colors: { background: COLORS.surface } }}
                />
              </View>
            </View>
          </View>

          {/* Submit */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            buttonColor={COLORS.primary}
            textColor={COLORS.textLight}
          >
            {isSubmitting ? 'Envoi en cours...' : 'Envoyer la suggestion'}
          </Button>

          <Text style={styles.footerText}>
            Votre identifiant d'appareil sera utilisé pour suivre vos soumissions.
            Vous ne pouvez confirmer chaque suggestion qu'une seule fois.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  appbar: {
    backgroundColor: COLORS.primary,
  },
  appbarTitle: {
    fontFamily: FONTS.heading,
    color: COLORS.textLight,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Card base
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 16,
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  searchCard: {
    zIndex: 10,
    elevation: 10,
  },
  optimizationCard: {
    zIndex: 1,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.accent,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    zIndex: 2,
  },
  cardContent: {
    padding: 16,
    overflow: 'visible',
  },

  // Typography
  sectionLabel: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  // Transport buttons
  transportContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  transportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  transportButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  transportButtonText: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  transportButtonTextSelected: {
    color: COLORS.textLight,
  },

  // Form fields
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: FONTS.heading,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: COLORS.surface,
  },

  // Submit
  submitButton: {
    marginTop: 8,
    borderRadius: 12,
    elevation: 3,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  footerText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
