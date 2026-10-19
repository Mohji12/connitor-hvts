import AsyncStorage from '@react-native-async-storage/async-storage';

export type PersonaId = 'staff' | 'visitor' | 'attendant' | 'distributor';

const KEY = 'conninterPersona';

export async function getLastPersona(): Promise<PersonaId | null> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    if (
      value === 'staff' ||
      value === 'visitor' ||
      value === 'attendant' ||
      value === 'distributor'
    ) {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setLastPersona(id: PersonaId): Promise<void> {
  await AsyncStorage.setItem(KEY, id);
}
