import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

import { CiviClient } from '../services/civiClient';
import { AuthCredentials, ContactSummary } from '../types';

interface AuthContextValue {
  credentials: AuthCredentials | null;
  contact: ContactSummary | null;
  client: CiviClient | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  credentials: null,
  contact: null,
  client: null,
  isLoading: false,
  error: null,
  login: async () => {
    throw new Error('AuthContext not initialised');
  },
  logout: async () => {
    throw new Error('AuthContext not initialised');
  }
});

const STORAGE_KEY = 'civicrm.credentials';

const isSecureStoreAvailable = async () => {
  try {
    return SecureStore.isAvailableAsync ? await SecureStore.isAvailableAsync() : false;
  } catch (error) {
    console.warn('Unable to determine SecureStore availability', error);
    return false;
  }
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [credentials, setCredentials] = useState<AuthCredentials | null>(null);
  const [contact, setContact] = useState<ContactSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => {
    return credentials ? new CiviClient(credentials) : null;
  }, [credentials]);

  useEffect(() => {
    const restore = async () => {
      if (!(await isSecureStoreAvailable())) {
        return;
      }

      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (!stored) {
          return;
        }

        const parsed: AuthCredentials = JSON.parse(stored);
        const restoredClient = new CiviClient(parsed);
        const profile = await restoredClient.getContactSummary(parsed.contactId);
        setCredentials(parsed);
        setContact(profile);
      } catch (restoreError) {
        console.warn('Unable to restore credentials', restoreError);
      }
    };

    restore();
  }, []);

  const persistCredentials = useCallback(async (value: AuthCredentials | null) => {
    if (!(await isSecureStoreAvailable())) {
      return;
    }

    if (value) {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(value));
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async (input: AuthCredentials) => {
      setIsLoading(true);
      setError(null);
      try {
        const nextClient = new CiviClient(input);
        const profile = await nextClient.getContactSummary(input.contactId);
        setCredentials(input);
        setContact(profile);
        await persistCredentials(input);
      } catch (loginError) {
        const message = loginError instanceof Error ? loginError.message : 'Unable to login';
        setError(message);
        Alert.alert('Login failed', message);
        throw loginError;
      } finally {
        setIsLoading(false);
      }
    },
    [persistCredentials]
  );

  const logout = useCallback(async () => {
    setCredentials(null);
    setContact(null);
    setError(null);
    await persistCredentials(null);
  }, [persistCredentials]);

  const value = useMemo<AuthContextValue>(
    () => ({ credentials, contact, client, isLoading, error, login, logout }),
    [client, contact, credentials, error, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
