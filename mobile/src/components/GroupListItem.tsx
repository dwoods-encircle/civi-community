import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GroupSummary } from '../types';

interface Props {
  group: GroupSummary;
  onPress: (group: GroupSummary) => void;
}

const GroupListItem: React.FC<Props> = ({ group, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(group)} style={styles.container}>
      <View>
        <Text style={styles.title}>{group.title}</Text>
        {group.description ? <Text style={styles.description}>{group.description}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomColor: '#e1e4e8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#ffffff'
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  description: {
    fontSize: 14,
    color: '#6c757d'
  }
});

export default GroupListItem;
