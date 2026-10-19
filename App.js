/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { StatusBar, StyleSheet, Text, View, Linking } from 'react-native';
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
import StaffDashboard from './src/StaffDashboard';
import StaffTasks from './src/StaffTasks';
import StaffServiceAssignments from './src/StaffServiceAssignments';
import Loading, { LoadingContext } from './loading/loading';
import { getData, removeData, storeData } from './storageUtils';
import { removeToken } from './api';

function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [screenParams, setScreenParams] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingScreen, setLoadingScreen] = useState(false);
  const [screenLoading, setScreenLoading] = useState(false);
  const previousRoute = useRef(null);

  const validScreens = ['login', 'register', 'services', 'car', 'faceverify', 'home', 'serviceDetails', 'booking', 'payment', 'myBookings', 'bookingHistory', 'paymentHistory', 'staffDashboard', 'staffTasks', 'staffServiceAssignments'];

  const isValidScreen = (screen) => validScreens.includes(screen);

  const getDefaultScreen = (userData) => {
    if (userData?.role === 'Staff') {
      return 'staffDashboard';
    }
    if (userData?.role === 'Customer') {
      return 'home';
    }
    return 'home';
  };

  const getSafeScreen = (screen, userData, params) => {
    if (!isValidScreen(screen)) {
      return userData ? getDefaultScreen(userData) : 'login';
    }

    if ((screen === 'home' || screen === 'faceverify' || screen === 'payment' || screen === 'booking' || screen === 'myBookings' || screen === 'bookingHistory' || screen === 'paymentHistory' || screen === 'staffDashboard' || screen === 'staffTasks' || screen === 'staffServiceAssignments') && !userData) {
      return 'login';
    }

    // Staff users should not access faceverify or customer screens
    if (userData?.role === 'Staff' && (screen === 'faceverify' || screen === 'home' || screen === 'services' || screen === 'booking' || screen === 'payment' || screen === 'myBookings' || screen === 'bookingHistory' || screen === 'paymentHistory' || screen === 'car')) {
      return 'staffDashboard';
    }

    // Customer users should not access staff screens
    if (userData?.role === 'Customer' && (screen === 'staffDashboard' || screen === 'staffTasks' || screen === 'staffServiceAssignments')) {
      return 'home';
    }

    if (screen === 'serviceDetails' && !params?.id) {
      return userData ? getDefaultScreen(userData) : 'login';
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
    let nextScreen;

    if (userData?.role === 'Staff') {
      nextScreen = 'staffDashboard';
    } else if (userData?.role === 'Customer') {
      nextScreen = userData?.requiresFaceVerification ? 'faceverify' : 'home';
    } else {
      nextScreen = 'home';
    }

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

  useEffect(() => {
    if (loadingAuth) return;

    const previous = previousRoute.current;
    previousRoute.current = { screen: activeScreen, params: screenParams };
    if (!previous || (previous.screen === activeScreen && previous.params === screenParams)) {
      return;
    }

    setLoadingScreen(true);
    const timeoutId = setTimeout(() => setLoadingScreen(false), 800);
    return () => clearTimeout(timeoutId);
  }, [activeScreen, screenParams, loadingAuth]);

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
            pendingToken={user?.pendingToken}
            onVerified={async (verifiedData) => {
              const verifiedUser = { ...(verifiedData || user) };
              delete verifiedUser.pendingToken;
              delete verifiedUser.requiresFaceVerification;
              setUser(verifiedUser);

              let nextScreen;
              if (verifiedUser?.role === 'Staff') {
                nextScreen = 'staffDashboard';
              } else {
                nextScreen = 'home';
              }

              await setScreen(nextScreen);
              await storeData('authState', { user: verifiedUser, currentScreen: nextScreen, screenParams: null });
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
      case 'staffDashboard':
        return user ? (
          <StaffDashboard navigate={setScreen} />
        ) : (
          <LoginScreen
            onNavigateToRegister={() => setCurrentScreen('register')}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'staffTasks':
        return user ? (
          <StaffTasks navigate={setScreen} />
        ) : (
          <LoginScreen
            onNavigateToRegister={() => setCurrentScreen('register')}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'staffServiceAssignments':
        return user ? (
          <StaffServiceAssignments navigate={setScreen} />
        ) : (
          <LoginScreen
            onNavigateToRegister={() => setCurrentScreen('register')}
            onLoginSuccess={handleLoginSuccess}
          />
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
      <LoadingContext.Provider value={setScreenLoading}>
        <StatusBar
          hidden={false}
          barStyle="dark-content"
          backgroundColor={loadingAuth || loadingScreen || screenLoading ? '#F3F7FD' : '#FFFFFF'}
        />
        <View style={styles.container}>
          {!loadingAuth && renderScreen()}
          {(loadingAuth || loadingScreen || screenLoading) && (
            <Loading
              message={loadingAuth ? 'Preparing your experience' : 'Loading screen'}
              overlay
            />
          )}
        </View>
      </LoadingContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
