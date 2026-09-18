import { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Text,
  Appbar,
  Button,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList, Stop } from '../types';
import { createSuggestion } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';
import { TRANSPORT_ICONS } from '../constants/transport';
import StopSearchInput from '../components/StopSearchInput';

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
        '✅ Suggestion envoyée !',
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

  const renderContent = () => (
    <>
      <Text variant="titleMedium" style={styles.sectionLabel}>
        Aidez les autres à découvrir de nouveaux trajets !
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        Votre suggestion sera vérifiée par la communauté avant d'être disponible.
      </Text>

      {/* Origin - Using StopSearchInput */}
      <StopSearchInput
        label="Point de départ"
        selectedStop={fromStop}
        onStopSelected={setFromStop}
        zIndex={2}
      />

      {/* Destination - Using StopSearchInput */}
      <StopSearchInput
        label="Destination"
        selectedStop={toStop}
        onStopSelected={setToStop}
        zIndex={1}
      />

      {/* Transport Type */}
      <View style={styles.field}>
        <Text variant="labelMedium" style={styles.fieldLabel}>Type de transport</Text>
        <SegmentedButtons
          value={transportType}
          onValueChange={(val) => setTransportType(val as TransportType)}
          buttons={[
            { value: 'communal_taxi', label: `${TRANSPORT_ICONS.communal_taxi} Taxi` },
            { value: 'gbaka', label: `${TRANSPORT_ICONS.gbaka} Gbaka` },
            { value: 'sotra_bus', label: `${TRANSPORT_ICONS.sotra_bus} SOTRA` },
          ]}
        />
      </View>

      {/* Price & Duration */}
      <View style={styles.row}>
        <View style={[styles.field, styles.halfField]}>
          <Text variant="labelMedium" style={styles.fieldLabel}>Prix (CFA)</Text>
          <TextInput
            mode="outlined"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="ex. 300"
          />
        </View>
        <View style={[styles.field, styles.halfField]}>
          <Text variant="labelMedium" style={styles.fieldLabel}>Durée (min)</Text>
          <TextInput
            mode="outlined"
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            placeholder="ex. 20"
          />
        </View>
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text variant="labelMedium" style={styles.fieldLabel}>Description (optionnelle)</Text>
        <TextInput
          mode="outlined"
          value={description}
          onChangeText={setDescription}
          placeholder="ex. Gbaka d'Adjamé à Yopougon"
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Submit Button */}
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!canSubmit}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        {isSubmitting ? 'Envoi en cours...' : 'Envoyer la suggestion'}
      </Button>

      <Text variant="bodySmall" style={styles.footerText}>
        Votre identifiant d'appareil sera utilisé pour suivre vos soumissions.
        Vous ne pouvez confirmer chaque suggestion qu'une seule fois.
      </Text>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Suggérer un trajet" />
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
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    marginBottom: 4,
    fontWeight: '600',
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 4,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 6,
  },
  footerText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
  },
});
