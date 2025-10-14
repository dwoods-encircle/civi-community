import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../hooks/useAuth';

const LoginScreen = () => {
  const { login, isLoading, error } = useAuth();
  const [siteUrl, setSiteUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [siteKey, setSiteKey] = useState('');
  const [contactId, setContactId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);
    if (!siteUrl || !apiKey || !siteKey || !contactId) {
      setFormError('All fields are required.');
      return;
    }

    try {
      await login({ siteUrl, apiKey, siteKey, contactId });
    } catch (submitError) {
      console.error('Login error', submitError);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      contentContainerStyle={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Connect to CiviCRM</Text>
        <Text style={styles.description}>
          Enter your CiviCRM site details. The Contact ID is used to load your profile and send messages on your behalf.
        </Text>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Site URL (e.g. https://example.org)"
          style={styles.input}
          value={siteUrl}
          onChangeText={setSiteUrl}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="API Key"
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Site Key"
          style={styles.input}
          value={siteKey}
          onChangeText={setSiteKey}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Contact ID"
          style={styles.input}
          value={contactId}
          onChangeText={setContactId}
        />

        {(formError || error) && <Text style={styles.errorText}>{formError ?? error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f4f5f7'
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12
  },
  description: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 24
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12
  },
  button: {
    marginTop: 12,
    backgroundColor: '#0d6efd',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16
  },
  errorText: {
    color: '#d62d20',
    marginTop: 4
  }
});

export default LoginScreen;
