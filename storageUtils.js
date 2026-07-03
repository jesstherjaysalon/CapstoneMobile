import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Save data
 */
export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    console.error('Error saving data:', e);
  }
};

/**
 * Get data
 */
export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue == null) return null;
    
    try {
      return JSON.parse(jsonValue);
    } catch (parseError) {
      // If JSON parse fails, return the raw string value
      // This handles cases where the value was stored as a plain string
      return jsonValue;
    }
  } catch (e) {
    console.error('Error reading data:', e);
    return null;
  }
};

/**
 * Remove data
 */
export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error('Error removing data:', e);
  }
};

/**
 * Clear all storage (use carefully)
 */
export const clearStorage = async () => {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    console.error('Error clearing storage:', e);
  }
};