import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Keyboard } from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';

import { useDebounce } from '../hooks/useDebounce';
import { searchStops } from '../services/api';
import { Stop } from '../types';

interface Props {
  label: string;
  onStopSelected: (stop: Stop | null) => void;
  selectedStop: Stop | null;
  zIndex?: number; // controls stacking order relative to sibling inputs
}

export default function StopSearchInput({ label, onStopSelected, selectedStop, zIndex = 1 }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 400);

  // When a stop is selected externally, update the query
  useEffect(() => {
    if (selectedStop) {
      setQuery(selectedStop.name);
      setIsOpen(false);
    }
  }, [selectedStop]);

  useEffect(() => {
    // Only search if the input is actually focused — prevents ghost searches
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
        console.log('🔍 Searching for:', debouncedQuery);
        const stops = await searchStops(debouncedQuery);
        console.log(`✅ Found ${stops.length} stops:`, stops.map(s => s.name).join(', '));
        if (!cancelled) {
          setResults(stops);
          setIsOpen(stops.length > 0);
        }
      } catch (err) {
        console.error('❌ Search error:', err);
        if (!cancelled) {
          setResults([]);
          setIsOpen(false);
          setError(err instanceof Error ? err.message : 'Failed to search stops');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchStops();
    return () => { cancelled = true; };
  }, [debouncedQuery, isFocused]);

  const handleSelect = useCallback((stop: Stop) => {
    console.log('✅ Selected stop:', stop.name);
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

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // If we have a query, trigger search on focus
    if (query.length >= 2) {
      // The useEffect will handle the search
    }
  }, [query]);

  const handleBlur = useCallback(() => {
    // Small delay so tapping a suggestion registers before the list closes
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
        right={isLoading ? <TextInput.Icon icon={() => <ActivityIndicator size={16} />} /> : null}
        autoCorrect={false}
        autoCapitalize="none"
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
  },
  dropdown: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    maxHeight: 200,
    zIndex: 999,
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
  errorText: {
    fontSize: 12,
    color: '#B00020',
    marginTop: 4,
    marginLeft: 4,
  },
});
