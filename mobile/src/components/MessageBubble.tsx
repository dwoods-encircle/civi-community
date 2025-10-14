import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GroupMessage } from '../types';

interface Props {
  message: GroupMessage;
  isOwnMessage: boolean;
}

const MessageBubble: React.FC<Props> = ({ message, isOwnMessage }) => {
  return (
    <View style={[styles.container, isOwnMessage ? styles.containerRight : styles.containerLeft]}>
      <View style={[styles.bubble, isOwnMessage ? styles.bubbleOwn : styles.bubbleRemote]}>
        {!isOwnMessage && <Text style={styles.author}>{message.authorName}</Text>}
        <Text style={[styles.details, isOwnMessage ? styles.detailsOwn : undefined]}>{message.details}</Text>
        <Text style={[styles.timestamp, isOwnMessage ? styles.timestampOwn : styles.timestampRemote]}>
          {new Date(message.timestamp).toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12
  },
  containerLeft: {
    justifyContent: 'flex-start'
  },
  containerRight: {
    justifyContent: 'flex-end'
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  bubbleOwn: {
    backgroundColor: '#0d6efd',
    borderTopRightRadius: 0
  },
  bubbleRemote: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 0
  },
  author: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#0d6efd'
  },
  details: {
    fontSize: 16,
    color: '#111827'
  },
  detailsOwn: {
    color: '#ffffff'
  },
  timestamp: {
    marginTop: 6,
    fontSize: 12
  },
  timestampOwn: {
    color: 'rgba(255,255,255,0.75)'
  },
  timestampRemote: {
    color: '#6b7280'
  }
});

export default MessageBubble;
