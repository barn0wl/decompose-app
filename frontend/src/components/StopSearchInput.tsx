import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Keyboard } from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';

import { useDebounce } from '../hooks/useDebounce';
import { searchStops } from '../services/api';
import { Stop } from '../types';
import { COLORS, FONTS } from '../constants/theme';

interface Props {
  label: string;
  onStopSelected: (stop: Stop | null) => void;
  selectedStop: Stop | null;
  zIndex?: number;
}

export default function StopSearchInput({ label, onStopSelected, selectedStop, zIndex = 1 }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (selectedStop) {
      setQuery(selectedStop.name);
      setIsOpen(false);
    }
  }, [selectedStop]);

  useEffect(() => {
    if (!isFocused || debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchStops = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const stops = await searchStops(debouncedQuery);
        if (!cancelled) {
          setResults(stops);
          setIsOpen(stops.length > 0);
        }
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          setIsOpen(false);
          setError(err instanceof Error ? err.message : 'Erreur de recherche');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchStops();
    return () => { cancelled = true; };
  }, [debouncedQuery, isFocused]);

  const handleSelect = useCallback((stop: Stop) => {
    onStopSelected(stop);
    setQuery(stop.name);
    setResults([]);
    setIsOpen(false);
    setIsFocused(false);
    Keyboard.dismiss();
  }, [onStopSelected]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    setError(null);
    if (selectedStop) {
      onStopSelected(null);
    }
  }, [selectedStop, onStopSelected]);

  const handleFocus = useCallback(() => setIsFocused(true), []);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsOpen(false);
      setIsFocused(false);
    }, 150);
  }, []);

  return (
    <View style={[styles.container, { zIndex }]}>
      <TextInput
        label={label}
        value={query}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        mode="outlined"
        right={isLoading ? <TextInput.Icon icon={() => <ActivityIndicator size={16} color={COLORS.primary} />} /> : null}
        autoCorrect={false}
        autoCapitalize="none"
        outlineColor={COLORS.border}
        activeOutlineColor={COLORS.primary}
        style={styles.input}
        theme={{ colors: { background: COLORS.surface } }}
      />

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {isOpen && results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
            nestedScrollEnabled={true}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestion}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionName}>{item.name}</Text>
                <Text style={styles.suggestionCommune}>{item.commune}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
    overflow: 'visible',
  },
  input: {
    backgroundColor: COLORS.surface,
  },
  dropdown: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    maxHeight: 240,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  suggestion: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceAlt,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  suggestionCommune: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#B00020',
    marginTop: 4,
    marginLeft: 4,
  },
});
