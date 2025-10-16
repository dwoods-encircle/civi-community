import AsyncStorage from '@react-native-async-storage/async-storage';

import { GroupMessage, GroupSummary } from '../types';

type CacheRecord<T> = {
  payload: T;
  timestamp: number;
};

const GROUPS_KEY_PREFIX = 'civi.offline.groups.';
const MESSAGES_KEY_PREFIX = 'civi.offline.messages.';

const groupKey = (contactId: string) => `${GROUPS_KEY_PREFIX}${contactId}`;
const messageKey = (contactId: string, groupId: string) => `${MESSAGES_KEY_PREFIX}${contactId}.${groupId}`;

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as CacheRecord<T>;
    return parsed.payload;
  } catch (error) {
    console.warn(`Unable to read offline cache for key ${key}`, error);
    return null;
  }
}

async function writeCache<T>(key: string, payload: T): Promise<void> {
  try {
    const record: CacheRecord<T> = {
      payload,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(key, JSON.stringify(record));
  } catch (error) {
    console.warn(`Unable to persist offline cache for key ${key}`, error);
  }
}

export async function getCachedGroups(contactId: string): Promise<GroupSummary[] | null> {
  return readCache<GroupSummary[]>(groupKey(contactId));
}

export async function setCachedGroups(contactId: string, groups: GroupSummary[]): Promise<void> {
  await writeCache(groupKey(contactId), groups);
}

export async function getCachedGroupMessages(
  contactId: string,
  groupId: string
): Promise<GroupMessage[] | null> {
  return readCache<GroupMessage[]>(messageKey(contactId, groupId));
}

export async function setCachedGroupMessages(
  contactId: string,
  groupId: string,
  messages: GroupMessage[]
): Promise<void> {
  await writeCache(messageKey(contactId, groupId), messages);
}

export async function clearOfflineCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matching = keys.filter((key) => key.startsWith(GROUPS_KEY_PREFIX) || key.startsWith(MESSAGES_KEY_PREFIX));
    if (matching.length > 0) {
      await AsyncStorage.multiRemove(matching);
    }
  } catch (error) {
    console.warn('Unable to clear offline cache', error);
  }
}
