import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const tabs = [
  { key: 'Home', label: 'Home', icon: 'home-outline' },
  { key: 'Car', label: 'Car', icon: 'car-outline' },
  { key: 'Booking', label: 'Bookings', icon: 'calendar-clock', isCenter: true },
  { key: 'Services', label: 'Services', icon: 'wrench-outline' },
  { key: 'Profile', label: 'Profile', icon: 'account-outline' },
];

const TabBar = ({ activeTab, onTabPress, navigate, navigateOnTabPress }) => {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: activeTab === 'Booking' ? 1.1 : 1,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  }, [activeTab, scaleAnim]);

  const handleTabPress = (key) => {
    onTabPress?.(key);
    const targetScreen = key.toLowerCase();

    if (typeof navigateOnTabPress === 'function') {
      navigateOnTabPress(targetScreen);
      return;
    }

    if (typeof navigate === 'function') {
      navigate(targetScreen);
    }
  };

  const renderTab = (tab) => {
    const isActive = activeTab === tab.key;
    const isCenter = !!tab.isCenter;
    const tabButton = (
      <TouchableOpacity
        style={[styles.tabItem, isActive && styles.tabItemActive, isCenter && styles.bookTabItem]}
        onPress={() => handleTabPress(tab.key)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={isActive ? tab.icon.replace('-outline', '') : tab.icon}
          size={isCenter ? 22 : 21}
          color={isActive ? '#2563EB' : '#8793A7'}
          style={styles.tabIcon}
        />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{isCenter ? 'Book' : tab.label}</Text>
      </TouchableOpacity>
    );
    return isCenter ? (
      <Animated.View
        key={tab.key}
        style={[styles.animatedTab, { transform: [{ scale: scaleAnim }] }]}
      >
        {tabButton}
      </Animated.View>
    ) : tabButton;
  };

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.tabBar}>
        {tabs.map(renderTab)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'relative',
    paddingHorizontal: 18,
    paddingBottom: 10,
    paddingTop: 9,
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E9EEF5',
    shadowColor: '#1E293B',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 12,
    elevation: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 16,
    minHeight: 52,
  },
  tabItemActive: {
    backgroundColor: '#EFF5FF',
  },
  animatedTab: { flex: 1 },
  bookTabItem: {},
  tabIcon: {
    marginBottom: 3,
  },
  tabLabel: {
    color: '#7B8799',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.05,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 10,
  },
});

export default TabBar;
