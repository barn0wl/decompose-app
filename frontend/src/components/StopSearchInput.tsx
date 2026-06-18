import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';

import { useDebounce } from '../hooks/useDebounce';
import { searchStops } from '../services/api';
import { Stop } from '../types';

interface Props {
  label: string;
  onStopSelected: (stop: Stop) => void;
  selectedStop: Stop | null;
}

export default function StopSearchInput({ label, onStopSelected, selectedStop }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 400);

  // Search whenever the debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false; // prevents stale responses from overwriting newer ones

    const fetchStops = async () => {
      setIsLoading(true);
      try {
        const stops = await searchStops(debouncedQuery);
        if (!cancelled) {
          setResults(stops);
          setIsOpen(stops.length > 0);
        }
      } catch (err) {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchStops();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = useCallback((stop: Stop) => {
    onStopSelected(stop);
    setQuery(stop.name);
    setResults([]);
    setIsOpen(false);
  }, [onStopSelected]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    // If user edits after selecting, clear the selection
    if (selectedStop && text !== selectedStop.name) {
      onStopSelected(null as unknown as Stop); // signal parent to clear
    }
  }, [selectedStop, onStopSelected]);

  return (
    <View style={styles.container}>
      <TextInput
        label={label}
        value={query}
        onChangeText={handleChangeText}
        mode="outlined"
        right={isLoading ? <TextInput.Icon icon={() => <ActivityIndicator size={16} />} /> : null}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {isOpen && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestion}
                onPress={() => handleSelect(item)}
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
    zIndex: 1, // ensures dropdown renders above sibling elements
    marginBottom: 12,
  },
  dropdown: {
    position: 'absolute',
    top: 58, // sits just below the TextInput
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 4,
    elevation: 4, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    maxHeight: 200,
    zIndex: 2,
  },
  suggestion: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionCommune: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});
