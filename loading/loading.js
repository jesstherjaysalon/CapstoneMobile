import React, { createContext, useContext, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Modal, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export const LoadingContext = createContext(null);

const Loading = ({ message = 'Getting things ready', compact = false, overlay = false }) => {
  const setScreenLoading = useContext(LoadingContext);
  const pulse = useRef(new Animated.Value(1)).current;
  const entranceY = useRef(new Animated.Value(8)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const driveX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(entranceY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    const drift = compact ? 4 : 12;
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1.015,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatY, {
            toValue: -2,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(driveX, {
            toValue: drift,
            duration: 850,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatY, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(driveX, {
            toValue: -drift,
            duration: 1700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(driveX, {
            toValue: 0,
            duration: 850,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    opacity.setValue(0);
    entranceY.setValue(8);
    floatY.setValue(0);
    driveX.setValue(0);
    entrance.start();
    breathing.start();
    return () => {
      entrance.stop();
      breathing.stop();
    };
  }, [compact, driveX, entranceY, floatY, opacity, pulse]);

  useEffect(() => {
    if (compact || overlay || !setScreenLoading) return undefined;

    setScreenLoading(true);
    return () => setScreenLoading(false);
  }, [compact, overlay, setScreenLoading]);

  if (!compact && !overlay) return null;

  const loader = (
    <View
      pointerEvents={overlay || !compact ? 'auto' : 'none'}
      style={[
        styles.container,
        compact && styles.compactContainer,
        overlay && styles.overlay,
      ]}
    >
      <Animated.View
        style={[
          styles.loadingContent,
          compact && styles.compactContent,
          !compact && { opacity, transform: [{ translateY: entranceY }] },
        ]}
      >
        {!compact && (
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <MaterialCommunityIcons name="car-cog" size={21} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandName}>ROADREADY</Text>
              <Text style={styles.brandCaption}>CAR CARE</Text>
            </View>
          </View>
        )}
        <Animated.View
          style={[
            styles.illustration,
            compact && styles.compactIllustration,
            { transform: [{ scale: pulse }, { translateY: floatY }, { translateX: driveX }] },
          ]}
        >
          <Image
            source={require('../src/assets/loading.gif')}
            resizeMode="contain"
            style={[styles.animation, compact && styles.compactAnimation]}
            accessibilityLabel="Animated car loading"
          />
        </Animated.View>
        <View style={[styles.statusRow, compact && styles.compactStatusRow]}>
          <ActivityIndicator size="small" color="#4F46E5" />
          {message ? (
            <Text style={[styles.message, compact && styles.compactMessage]}>{message}</Text>
          ) : null}
        </View>
        {!compact && (
          <View style={styles.statusHintRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusHint}>This will only take a moment</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );

  if (overlay) {
    return (
      <Modal
        visible
        animationType="none"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => undefined}
      >
        {loader}
      </Modal>
    );
  }

  return loader;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  compactContainer: {
    flex: 0,
    minHeight: 110,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 20,
    backgroundColor: 'transparent',
  },
  loadingContent: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  compactContent: {
    flex: 0,
    width: 'auto',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
    justifyContent: 'flex-start',
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  brand: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 7,
    elevation: 3,
  },
  brandName: {
    color: '#172554',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  brandCaption: {
    marginTop: 2,
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 142,
    marginTop: 10,
    marginBottom: 0,
  },
  animation: {
    width: 190,
    height: 88,
  },
  compactAnimation: {
    width: 48,
    height: 24,
  },
  compactIllustration: {
    width: 'auto',
    minHeight: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    marginTop: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  compactStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 0,
    marginLeft: 5,
    padding: 0,
    minHeight: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  message: {
    marginLeft: 9,
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  compactMessage: {
    marginTop: 0,
    marginLeft: 8,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  statusHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 13,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#818CF8',
  },
  statusHint: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
});

export default Loading;