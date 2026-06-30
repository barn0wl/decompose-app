import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@decompose_device_id';

/**
 * Get or create a unique device ID stored in AsyncStorage
 * Used for user identification without requiring authentication
 */
export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getOrCreateDeviceId = async () => {
      try {
        // Try to get existing device ID
        let stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
        
        if (!stored) {
          // Create new device ID
          stored = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await AsyncStorage.setItem(DEVICE_ID_KEY, stored);
        }
        
        setDeviceId(stored);
      } catch (error) {
        console.error('Failed to get/create device ID:', error);
        // Fallback: generate in-memory ID
        setDeviceId(`device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
      } finally {
        setLoading(false);
      }
    };

    getOrCreateDeviceId();
  }, []);

  return loading ? null : deviceId;
}
