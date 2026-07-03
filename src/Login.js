import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { postRequest, setToken } from '../api';

const LoginScreen = ({ onNavigateToRegister, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const toggleShowPassword = () => setShowPassword((prev) => !prev);

  const handleLogin = async () => {
    setMessage('');
    setMessageType('');

    if (!email.trim() || !password.trim()) {
      setMessage('Please enter both email and password.');
      setMessageType('error');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email: email.trim(),
        password,
      };

      const response = await postRequest('/login', payload);

      if (response && response.success && response.data?.user) {
        // Store the authentication token
        if (response.data.token) {
          await setToken(response.data.token);
        }
        setMessage('Login successful.');
        setMessageType('success');
        setEmail('');
        setPassword('');
        onLoginSuccess?.(response.data.user);
      } else {
        const errorMessage = response?.message || 'Unable to login. Please try again.';
        setMessage(errorMessage);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('A network error occurred. Please try again later.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundCircles}>
        <View style={styles.circleLarge} />
        <View style={styles.circleSmall} />
        <View style={styles.circleAccent} />
      </View>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue booking your prefered services.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="name@gmail.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
            </View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={styles.toggleButton} onPress={toggleShowPassword}>
                <Text style={styles.toggleButtonText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.forgotUnder} onPress={() => {}}>
              <Text style={styles.forgotTextUnder}>Forgot?</Text>
            </TouchableOpacity>
          </View>

          {message ? (
            <Text style={[styles.message, messageType === 'success' ? styles.success : styles.error]}>
              {message}
            </Text>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>No account yet?</Text>
            <TouchableOpacity onPress={onNavigateToRegister}>
              <Text style={styles.linkText}>Create one</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backgroundCircles: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 0,
  },
  circleLarge: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
    top: -120,
    right: -120,
  },
  circleSmall: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    top: 140,
    left: -90,
  },
  circleAccent: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    bottom: -90,
    right: -80,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  formContainer: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    padding: 26,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 24,
    lineHeight: 22,
  },
  sectionHeading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    color: '#475569',
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 24,
    maxWidth: '94%',
  },
  formGroup: {
    marginBottom: 22,
    width: '100%',
    maxWidth: 420,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  forgotText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  passwordWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    shadowColor: '#2563eb',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 6,
    width: '100%',
  },
  toggleButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toggleButtonText: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '700',
  },
  forgotUnder: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  forgotTextUnder: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#2563eb',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 9,
    width: '100%',
    maxWidth: 420,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    alignItems: 'center',
  },
  bottomText: {
    color: '#7b8794',
    marginRight: 6,
  },
  linkText: {
    color: '#93c5fd',
    fontWeight: '700',
  },
  message: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
  success: {
    color: '#15803D',
  },
  error: {
    color: '#B91C1C',
  },
});

export default LoginScreen;
