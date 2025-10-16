import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import MessageBubble from '../components/MessageBubble';
import { useAuth } from '../hooks/useAuth';
import { RootStackParamList } from '../navigation/types';
import { GroupMessage } from '../types';
import { getCachedGroupMessages, setCachedGroupMessages } from '../storage/offlineCache';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupChat'>;

const GroupChatScreen: React.FC<Props> = ({ route }) => {
  const { group } = route.params;
  const { client, contact } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const hasCachedMessages = useRef(false);

  useEffect(() => {
    let isMounted = true;
    hasCachedMessages.current = false;
    setMessages([]);

    const loadCachedMessages = async () => {
      if (!contact) {
        return;
      }

      try {
        const cached = await getCachedGroupMessages(contact.id, group.id);
        if (cached && isMounted) {
          hasCachedMessages.current = true;
          setMessages(cached);
          setError(null);
          setIsLoading(false);
        }
      } catch (cacheError) {
        console.warn('Unable to load cached messages', cacheError);
      }
    };

    loadCachedMessages();

    return () => {
      isMounted = false;
    };
  }, [contact, group.id]);

  const loadMessages = useCallback(async () => {
    if (!client || !contact) {
      return;
    }

    try {
      const result = await client.getGroupMessages(group.id);
      const enriched = await client.hydrateAuthorNames(result);
      setMessages(enriched);
      hasCachedMessages.current = true;
      await setCachedGroupMessages(contact.id, group.id, enriched);
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load messages';
      setError(message);
    }
  }, [client, contact, group.id]);

  const loadMembers = useCallback(async () => {
    if (!client) {
      return;
    }

    try {
      const ids = await client.getGroupMembers(group.id);
      setMembers(Array.from(new Set(ids)));
    } catch (memberError) {
      console.error('Unable to fetch group members', memberError);
    }
  }, [client, group.id]);

  const initialise = useCallback(async () => {
    if (!hasCachedMessages.current) {
      setIsLoading(true);
    }
    setError(null);
    try {
      await Promise.all([loadMessages(), loadMembers()]);
    } finally {
      setIsLoading(false);
    }
  }, [loadMembers, loadMessages]);

  useEffect(() => {
    initialise();
  }, [initialise]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadMessages(), loadMembers()]);
    setRefreshing(false);
  }, [loadMembers, loadMessages]);

  const handleSend = useCallback(async () => {
    if (!client || !contact) {
      return;
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const recipients = members.filter((memberId) => memberId !== contact.id);

    setIsSending(true);
    try {
      await client.sendGroupMessage(group.id, trimmed, recipients);
      setInput('');
      await loadMessages();
      setError(null);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Unable to send message';
      setError(message);
    } finally {
      setIsSending(false);
    }
  }, [client, contact, group.id, input, loadMessages, members]);

  if (!client || !contact) {
    return (
      <View style={styles.centered}>
        <Text>Missing credentials.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0d6efd" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} isOwnMessage={item.authorId === contact.id} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={messages.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>}
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message"
          value={input}
          onChangeText={setInput}
          editable={!isSending}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isSending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isSending || !input.trim()}
        >
          {isSending ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 10
  },
  errorText: {
    color: '#b91c1c'
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    color: '#6c757d',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopColor: '#dbe2ef',
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#ffffff'
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#ffffff'
  },
  sendButton: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12
  },
  sendButtonDisabled: {
    opacity: 0.7
  },
  sendText: {
    color: '#ffffff',
    fontWeight: '600'
  }
});

export default GroupChatScreen;
