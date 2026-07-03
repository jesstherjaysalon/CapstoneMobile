/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, useColorScheme, View, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/Login';
import RegisterScreen from './src/Register';
import FaceVerifyScreen from './src/FaceVerify';
import HomeScreen from './src/Home';
import Services from './src/Services';
import Booking from './src/Booking';
import PaymentScreen from './src/Payment';
import MyBookingsScreen from './src/MyBookings';
import BookingHistoryScreen from './src/BookingHistory';
import ServiceDetails from './src/ServiceDetails';
import Vehicles from './src/Vehicles';
import PaymentHistory from './src/PaymentHistory';
import { getData, removeData, storeData } from './storageUtils';
import { removeToken } from './api';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [currentScreen, setCurrentScreen] = useState('login');
  const [screenParams, setScreenParams] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const validScreens = ['login', 'register', 'services', 'car', 'faceverify', 'home', 'serviceDetails', 'booking', 'payment', 'myBookings', 'bookingHistory', 'paymentHistory'];

  const isValidScreen = (screen) => validScreens.includes(screen);

  const getDefaultScreen = (userData) => {
    return userData?.role === 'Customer' ? 'faceverify' : 'home';
  };

  const getSafeScreen = (screen, userData, params) => {
    if (!isValidScreen(screen)) {
      return userData ? getDefaultScreen(userData) : 'login';
    }

    if ((screen === 'home' || screen === 'faceverify' || screen === 'payment' || screen === 'booking' || screen === 'myBookings' || screen === 'bookingHistory' || screen === 'paymentHistory') && !userData) {
      return 'login';
    }

    if (screen === 'serviceDetails' && !params?.id) {
      return userData ? 'home' : 'login';
    }

    return screen;
  };

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const savedAuth = await getData('authState');
        const savedUser = savedAuth?.user ?? null;
        const restoredScreen = savedAuth?.currentScreen;

        setUser(savedUser);
        setCurrentScreen(getSafeScreen(restoredScreen, savedUser, savedAuth?.screenParams ?? null));
        setScreenParams(savedAuth?.screenParams ?? null);
      } catch (error) {
        console.error('Error restoring auth state:', error);
        setUser(null);
        setCurrentScreen('login');
        setScreenParams(null);
      } finally {
        setLoadingAuth(false);
      }
    };

    restoreAuth();
  }, []);

  const handleDeepLink = async (eventUrl) => {
    const url = eventUrl?.url || eventUrl;
    if (!url) return;

    const path = url.split('://')[1] || '';
    const pathParts = path.split('?')[0].split('/').filter(Boolean);

    if (pathParts[0] === 'payment' && pathParts[1] === 'success') {
      await setScreen('home');
      return;
    }

    if (pathParts[0] === 'payment' && pathParts[1] === 'failed') {
      await setScreen('booking');
      return;
    }
  };

  useEffect(() => {
    const initLinking = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          handleDeepLink(initialUrl);
        }
      } catch (error) {
        console.error('Error getting initial URL', error);
      }
    };

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    initLinking();
    return () => subscription.remove();
  }, [user]);

  const handleLoginSuccess = async (userData) => {
    setUser(userData);
    const nextScreen = userData?.role === 'Customer' ? 'faceverify' : 'home';
    setCurrentScreen(nextScreen);
    setScreenParams(null);
    await storeData('authState', { user: userData, currentScreen: nextScreen, screenParams: null });
  };

  const handleLogout = async () => {
    setUser(null);
    setCurrentScreen('login');
    setScreenParams(null);
    await removeData('authState');
    await removeToken();
  };

  const setScreen = async (screen, params = null) => {
    const safeScreen = getSafeScreen(screen, user, params);
    setCurrentScreen(safeScreen);
    setScreenParams(params);
    const authState = await getData('authState');
    if (authState?.user) {
      await storeData('authState', { ...authState, currentScreen: safeScreen, screenParams: params });
    }
  };

  const activeScreen = useMemo(
    () => getSafeScreen(currentScreen, user, screenParams),
    [currentScreen, user, screenParams],
  );

  const renderScreen = () => {
    switch (activeScreen) {
      case 'login':
        return (
          <LoginScreen
            onNavigateToRegister={() => setCurrentScreen('register')}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'register':
        return <RegisterScreen onNavigateToLogin={() => setCurrentScreen('login')} />;
      case 'services':
        return <Services navigate={setScreen} />;
      case 'booking':
        return <Booking navigate={setScreen} routeParams={screenParams} />;
      case 'payment':
        return <PaymentScreen navigate={setScreen} routeParams={screenParams} />;
      case 'myBookings':
        return <MyBookingsScreen navigate={setScreen} />;
      case 'bookingHistory':
        return <BookingHistoryScreen navigate={setScreen} />;
      case 'paymentHistory':
        return user ? (
          <PaymentHistory navigate={setScreen} />
        ) : (
          <LoginScreen
            onNavigateToRegister={() => setCurrentScreen('register')}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'car':
        return <Vehicles navigate={setScreen} />;
      case 'faceverify':
        return user ? (
          <FaceVerifyScreen
            user={user}
            onVerified={async () => {
              await setScreen('home');
              await storeData('authState', { user, currentScreen: 'home', screenParams: null });
            }}
            onCancel={handleLogout}
          />
        ) : (
          <LoginScreen
            onNavigateToRegister={() => setCurrentScreen('register')}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'home':
        return user ? (
          <HomeScreen user={user} onLogout={handleLogout} navigate={setScreen} />
        ) : (
          <LoginScreen
            onNavigateToRegister={() => setCurrentScreen('register')}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'serviceDetails':
        return screenParams?.id ? (
          <ServiceDetails id={screenParams.id} service={screenParams.service} navigate={setScreen} />
        ) : (
          <HomeScreen user={user} onLogout={handleLogout} navigate={setScreen} />
        );
      default:
        return (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackText}>Loading app... please wait.</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {loadingAuth ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <View style={styles.container}>{renderScreen()}</View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
  },
  fallbackText: {
    color: '#374151',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default App;
