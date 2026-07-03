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
import { postRequest } from '../api';

const RegisterScreen = ({ onNavigateToLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleRegister = async () => {
    setMessage('');
    setMessageType('');

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setMessage('All fields are required.');
      setMessageType('error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageType('error');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: fullName.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
        role: 'Customer',
      };

      const response = await postRequest('/register', payload);

      if (response && response.success) {
        setMessage('Registration successful! Check your email to complete your profile.');
        setMessageType('success');
        setFullName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        // navigate back to login after a short delay so user sees confirmation
        setTimeout(() => {
          onNavigateToLogin && onNavigateToLogin();
        }, 2500);
      } else {
        const errorMessage = response?.message || 'Unable to register. Please try again.';
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your customer journey with a secure account.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="ex. Diane Valle"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="name@gmail.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {message ? (
            <Text style={[styles.message, messageType === 'success' ? styles.success : styles.error]}>
              {message}
            </Text>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account?</Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.linkText}>Sign in</Text>
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
  formGroup: {
    marginBottom: 18,
    width: '100%',
  },
  label: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8FAFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#2563eb',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 5,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#2563eb',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 7,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  bottomText: {
    color: '#6B7280',
    marginRight: 6,
  },
  linkText: {
    color: '#2563EB',
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

export default RegisterScreen;
