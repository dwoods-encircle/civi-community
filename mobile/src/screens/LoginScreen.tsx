import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Microsoft from 'expo-auth-session/providers/microsoft';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';

import { CiviClient } from '../services/civiClient';
import { useAuth } from '../hooks/useAuth';

WebBrowser.maybeCompleteAuthSession();

type MicrosoftIdentity = {
  provider: 'microsoft';
  token: string;
  expiresAt?: number;
  name?: string;
  email?: string;
};

const LoginScreen = () => {
  const { login, isLoading, error } = useAuth();
  const [siteUrl, setSiteUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [siteKey, setSiteKey] = useState('');
  const [contactId, setContactId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<MicrosoftIdentity | null>(null);
  const [isResolvingContact, setIsResolvingContact] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const expoConfig = Constants.expoConfig ?? Constants.manifest;
  const microsoftClientId = (expoConfig?.extra as Record<string, unknown> | undefined)?.microsoftClientId as string | undefined;
  const microsoftTenantId =
    ((expoConfig?.extra as Record<string, unknown> | undefined)?.microsoftTenantId as string | undefined) ?? 'common';
  const scheme = (expoConfig as { scheme?: string } | null)?.scheme ?? 'civicrm';

  const redirectUri = useMemo(() => makeRedirectUri({ scheme }), [scheme]);

  const [request, response, promptAsync] = Microsoft.useAuthRequest({
    clientId: microsoftClientId ?? '',
    tenantId: microsoftTenantId,
    scopes: ['User.Read'],
    redirectUri
  });

  useEffect(() => {
    if (response?.type !== 'success' || !response.authentication?.accessToken) {
      return;
    }

    const token = response.authentication.accessToken;
    const expiresAt = response.authentication.expiresIn
      ? Date.now() + response.authentication.expiresIn * 1000
      : undefined;

    const fetchProfile = async () => {
      try {
        setProfileError(null);
        const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!profileResponse.ok) {
          throw new Error(`Microsoft profile request failed (${profileResponse.status})`);
        }

        const profile = await profileResponse.json();
        const identityEmail = profile.mail ?? profile.userPrincipalName ?? undefined;

        setIdentity({
          provider: 'microsoft',
          token,
          expiresAt,
          name: profile.displayName,
          email: identityEmail
        });

        if (identityEmail && !contactId) {
          setContactId(identityEmail);
        }
      } catch (fetchError) {
        console.error('Unable to load Microsoft profile', fetchError);
        const message = fetchError instanceof Error ? fetchError.message : 'Unable to load Microsoft profile';
        setProfileError(message);
      }
    };

    fetchProfile();
  }, [response, contactId]);

  const handleMicrosoftLogin = async () => {
    setFormError(null);
    if (!microsoftClientId) {
      setFormError('Configure a Microsoft client ID in app.json to enable OAuth sign-in.');
      return;
    }

    try {
      await promptAsync();
    } catch (authError) {
      console.error('Microsoft login failed', authError);
      const message = authError instanceof Error ? authError.message : 'Microsoft login failed';
      setFormError(message);
    }
  };

  const handleResolveContact = async () => {
    setFormError(null);
    if (!identity?.email) {
      setFormError('Sign in with Microsoft to discover your CiviCRM contact.');
      return;
    }

    if (!siteUrl || !apiKey || !siteKey) {
      setFormError('Provide the site URL, API key, and site key to search for your contact.');
      return;
    }

    try {
      setIsResolvingContact(true);
      const lookupClient = new CiviClient({
        siteUrl,
        apiKey,
        siteKey,
        contactId: contactId || identity.email
      });
      const contact = await lookupClient.findContactByEmail(identity.email);
      if (!contact) {
        setFormError(`No CiviCRM contact was found for ${identity.email}.`);
        return;
      }

      setContactId(contact.id);
    } catch (resolveError) {
      console.error('Unable to resolve contact', resolveError);
      const message = resolveError instanceof Error ? resolveError.message : 'Unable to resolve contact';
      setFormError(message);
    } finally {
      setIsResolvingContact(false);
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!siteUrl || !apiKey || !siteKey || !contactId) {
      setFormError('All fields are required.');
      return;
    }

    try {
      await login({
        siteUrl,
        apiKey,
        siteKey,
        contactId,
        identityProvider: identity?.provider,
        identityToken: identity?.token,
        identityTokenExpiresAt: identity?.expiresAt,
        identityEmail: identity?.email,
        identityName: identity?.name
      });
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
          Sign in with your organisation&apos;s identity provider and provide your CiviCRM connection details. The Contact ID is
          used to load your profile and send messages on your behalf.
        </Text>

        <View style={styles.oauthSection}>
          <Text style={styles.sectionLabel}>Single sign-on</Text>
          <TouchableOpacity
            style={[styles.oauthButton, !microsoftClientId || request === null ? styles.oauthButtonDisabled : null]}
            onPress={handleMicrosoftLogin}
            disabled={!microsoftClientId || request === null}
          >
            {identity ? (
              <Text style={styles.oauthButtonText}>Signed in with Microsoft</Text>
            ) : (
              <Text style={styles.oauthButtonText}>Sign in with Microsoft</Text>
            )}
          </TouchableOpacity>
          {identity && (
            <View style={styles.identitySummary}>
              <Text style={styles.identityText}>{identity.name ?? 'Microsoft account connected'}</Text>
              {identity.email && <Text style={styles.identitySecondary}>{identity.email}</Text>}
            </View>
          )}
          {profileError && <Text style={styles.errorText}>{profileError}</Text>}
          {!microsoftClientId && (
            <Text style={styles.helperText}>
              Add your Microsoft Entra application client ID to <Text style={styles.helperHighlight}>app.json</Text> to enable
              OAuth sign-in.
            </Text>
          )}
        </View>

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
        <View style={styles.contactRow}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Contact ID"
            style={[styles.input, styles.contactInput]}
            value={contactId}
            onChangeText={setContactId}
          />
          <TouchableOpacity
            style={[styles.secondaryButton, isResolvingContact ? styles.secondaryButtonDisabled : null]}
            onPress={handleResolveContact}
            disabled={isResolvingContact}
          >
            {isResolvingContact ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>Lookup</Text>}
          </TouchableOpacity>
        </View>

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
  oauthSection: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f8f9fb'
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2328',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8
  },
  oauthButton: {
    backgroundColor: '#2b579a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  oauthButtonDisabled: {
    backgroundColor: '#9fb0d6'
  },
  oauthButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16
  },
  identitySummary: {
    marginTop: 12
  },
  identityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2328'
  },
  identitySecondary: {
    fontSize: 14,
    color: '#4e5b6e',
    marginTop: 2
  },
  helperText: {
    marginTop: 12,
    fontSize: 13,
    color: '#4e5b6e'
  },
  helperHighlight: {
    fontWeight: '600'
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  contactInput: {
    flex: 1,
    marginBottom: 0
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2b579a'
  },
  secondaryButtonDisabled: {
    opacity: 0.7
  },
  secondaryButtonText: {
    color: '#2b579a',
    fontWeight: '600'
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
