import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../hooks/useAuth';
import GroupChatScreen from '../screens/GroupChatScreen';
import GroupListScreen from '../screens/GroupListScreen';
import LoginScreen from '../screens/LoginScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { credentials } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {credentials ? (
          <>
            <Stack.Screen name="Groups" component={GroupListScreen} options={{ title: 'My Groups' }} />
            <Stack.Screen
              name="GroupChat"
              component={GroupChatScreen}
              options={({ route }) => ({
                title: route.params.group.title
              })}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
