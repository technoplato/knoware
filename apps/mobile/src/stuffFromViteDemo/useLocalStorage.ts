import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';

type SetValue<T> = Dispatch<SetStateAction<T>>;

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>] {
  const readValue = useCallback(async (): Promise<T> => {
    try {
      const item = await AsyncStorage.getItem(key);
      return item ? parseJSON(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading AsyncStorage key “${key}”:`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(initialValue);

  const setValue: SetValue<T> = async (value) => {
    try {
      const newValue = value instanceof Function ? value(storedValue) : value;
      await AsyncStorage.setItem(key, JSON.stringify(newValue));
      setStoredValue(newValue);
    } catch (error) {
      console.warn(`Error setting AsyncStorage key “${key}”:`, error);
    }
  };

  useEffect(() => {
    const init = async () => {
      const value = await readValue();
      setStoredValue(value);
    };
    init();
  }, [JSON.stringify(storedValue)]);

  return [storedValue, setValue];
}

function parseJSON<T>(value: string | null): T | undefined {
  try {
    return value === 'undefined' ? undefined : JSON.parse(value ?? '');
  } catch {
    console.log('parsing error on', { value });
    return undefined;
  }
}
