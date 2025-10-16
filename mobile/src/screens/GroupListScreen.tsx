import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import GroupListItem from '../components/GroupListItem';
import { useAuth } from '../hooks/useAuth';
import { RootStackParamList } from '../navigation/types';
import { GroupSummary } from '../types';
import { getCachedGroups, setCachedGroups } from '../storage/offlineCache';

type Props = NativeStackScreenProps<RootStackParamList, 'Groups'>;

const GroupListScreen: React.FC<Props> = ({ navigation }) => {
  const { client, contact, logout } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const hasCachedGroups = useRef(false);

  useEffect(() => {
    const loadCachedGroups = async () => {
      if (!contact) {
        hasCachedGroups.current = false;
        return;
      }

      try {
        const cached = await getCachedGroups(contact.id);
        if (cached) {
          hasCachedGroups.current = true;
          setGroups(cached);
        } else {
          hasCachedGroups.current = false;
        }
      } catch (cacheError) {
        console.warn('Unable to load cached groups', cacheError);
      }
    };

    loadCachedGroups();
  }, [contact]);

  const loadGroups = useCallback(async () => {
    if (!client || !contact) {
      return;
    }

    if (!hasCachedGroups.current) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const list = await client.getGroupMembership(contact.id);
      setGroups(list);
      hasCachedGroups.current = true;
      await setCachedGroups(contact.id, list);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load groups';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [client, contact]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const refresh = useCallback(async () => {
    if (!client || !contact) {
      return;
    }

    setRefreshing(true);
    try {
      const list = await client.getGroupMembership(contact.id);
      setGroups(list);
      hasCachedGroups.current = true;
      await setCachedGroups(contact.id, list);
      setError(null);
    } catch (refreshError) {
      console.error('Unable to refresh groups', refreshError);
    } finally {
      setRefreshing(false);
    }
  }, [client, contact]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      )
    });
  }, [logout, navigation]);

  const handleSelectGroup = (group: GroupSummary) => {
    navigation.navigate('GroupChat', { group });
  };

  if (!client || !contact) {
    return (
      <View style={styles.centered}>
        <Text>Missing credentials.</Text>
      </View>
    );
  }

  if (isLoading && groups.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0d6efd" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupListItem group={item} onPress={handleSelectGroup} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No groups found.</Text>}
        contentContainerStyle={groups.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    color: '#6c757d',
    fontSize: 16
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12
  },
  errorText: {
    color: '#b91c1c'
  },
  logoutButton: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  logoutText: {
    color: '#0d6efd',
    fontWeight: '600'
  }
});

export default GroupListScreen;
