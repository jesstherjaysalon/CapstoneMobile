import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Easing } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const tabs = [
  { key: 'Home', label: 'Home', icon: 'home-outline' },
  { key: 'Car', label: 'Car', icon: 'car-outline' },
  { key: 'Booking', label: 'Bookings', icon: 'calendar-clock', isCenter: true },
  { key: 'Services', label: 'Services', icon: 'wrench-outline' },
  { key: 'Profile', label: 'Profile', icon: 'account-outline' },
];

const TabBar = ({ activeTab, onTabPress, navigate, navigateOnTabPress }) => {
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

  const leftTabs = tabs.filter(t => !t.isCenter).slice(0, 2);
  const centerTab = tabs.find(t => t.isCenter);
  const rightTabs = tabs.filter(t => !t.isCenter).slice(2);

  const renderTab = (tab) => {
    const isActive = activeTab === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tabItem, isActive && styles.tabItemActive]}
        onPress={() => handleTabPress(tab.key)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={tab.icon}
          size={20}
          color={isActive ? '#ffffff' : '#94a3b8'}
          style={styles.tabIcon}
        />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        <View style={styles.tabSection}>
          {leftTabs.map(renderTab)}
        </View>

        <View style={styles.centerTabPlaceholder} />

        <View style={styles.tabSection}>
          {rightTabs.map(renderTab)}
        </View>
      </View>

      <Animated.View
        style={[
          styles.centerTabButton,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.centerTabContent}
          onPress={() => handleTabPress('Booking')}
          activeOpacity={0.85}
        >
          <View style={styles.centerTabGlow} />
          <MaterialCommunityIcons
            name={centerTab.icon}
            size={28}
            color="#ffffff"
          />
          <Text style={styles.centerTabLabel}>{centerTab.label}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: '#ffffff',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f7f4',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 2,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 50,
    flex: 1,
  },
  tabItemActive: {
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
  },
  tabIcon: {
    marginBottom: 6,
  },
  tabLabel: {
    color: '#b8b8b8',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#7a7a7a',
    fontWeight: '700',
    fontSize: 8,
  },
  centerTabPlaceholder: {
    width: 90,
    height: 1,
  },
  centerTabButton: {
    position: 'absolute',
    bottom: 45,
    left: '50%',
    marginLeft: -40,
    zIndex: 10,
  },
  centerTabContent: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e40af',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e40af',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 14,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  centerTabGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e40af',
    opacity: 0.1,
    zIndex: -1,
  },
  centerTabLabel: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.3,
  },
});

export default TabBar;
