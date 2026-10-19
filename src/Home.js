import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import TabBar from './TabBar';
import Loading from '../loading/loading';
import { getRequest } from '../api';
import { BASE_URL, fixImageUrl } from '../api';

const ServiceCard = ({ item }) => {
  const [imageError, setImageError] = React.useState(false);

  let serviceImage = null;
  // Use image_url if provided by API, otherwise fall back to constructing URL
  if (item.image_url) {
    serviceImage = fixImageUrl(item.image_url);
  } else if (item.image) {
    // Remove /api from BASE_URL for image URLs
    const baseUrl = BASE_URL.replace('/api', '');
    // Try different path constructions
    if (item.image.startsWith('http')) {
      serviceImage = fixImageUrl(item.image);
    } else if (item.image.startsWith('/')) {
      serviceImage = `${baseUrl}${item.image}`;
    } else {
      serviceImage = `${baseUrl}/storage/${item.image}`;
    }
  }

  const serviceName = item.service?.name || 'Service';
  const rating = Number(item.rating) || 0;

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <MaterialCommunityIcons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color={i <= rating ? '#F59E0B' : '#CBD5E1'}
        />
      );
    }
    return stars;
  };

  return (
    <TouchableOpacity style={styles.serviceCard}>
      <View style={styles.imageContainer}>
        {serviceImage && !imageError ? (
          <Image
            source={{ uri: serviceImage }}
            style={styles.serviceImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.serviceImage, styles.serviceImagePlaceholder]}>
            <MaterialCommunityIcons name="car" size={32} color="#94A3B8" />
          </View>
        )}
      </View>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName} numberOfLines={1}>{serviceName}</Text>
        <View style={styles.ratingContainer}>
          <View style={styles.stars}>{renderStars()}</View>
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ServiceSeparator = () => <View style={styles.serviceSeparator} />;

const HomeScreen = ({ user, onLogout, navigate }) => {
  const [completedServices, setCompletedServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    fetchCompletedServices();
  }, []);

  const fetchCompletedServices = async () => {
    try {
      const response = await getRequest('/bookings/completed-services');
      if (response && response.success) {
        setCompletedServices(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching completed services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const renderServiceCard = ({ item }) => {
    return <ServiceCard item={item} />;
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.headerGlow} />
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.eyebrowRow}>
                <MaterialCommunityIcons name="car-connected" size={15} color="#C7D2FE" />
                <Text style={styles.eyebrow}>ROADREADY CARE</Text>
              </View>
              <Text style={styles.greeting}>Good to see you,</Text>
              <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Customer'}</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={onLogout}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <MaterialCommunityIcons name="logout" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.balanceCard}>
            <View style={styles.statusIcon}>
              <MaterialCommunityIcons name="shield-check-outline" size={21} color="#FFFFFF" />
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.balanceLabel}>ACCOUNT STATUS</Text>
              <Text style={styles.balanceValue}>Your account is active</Text>
            </View>
            <View style={styles.balanceBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.balanceBadgeText}>Verified</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigate('myBookings')} activeOpacity={0.82}>
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name="calendar-check-outline" size={23} color="#2563EB" />
              </View>
              <View style={styles.quickActionCopy}>
                <Text style={styles.quickActionLabel}>My Bookings</Text>
                <Text style={styles.quickActionHint}>Track appointments</Text>
              </View>
              <MaterialCommunityIcons style={styles.quickActionArrow} name="arrow-top-right" size={16} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigate('paymentHistory')} activeOpacity={0.82}>
              <View style={styles.quickActionIcon}>
                <MaterialIcons name="receipt" size={23} color="#2563EB" />
              </View>
              <View style={styles.quickActionCopy}>
                <Text style={styles.quickActionLabel}>Payment History</Text>
                <Text style={styles.quickActionHint}>View transactions</Text>
              </View>
              <MaterialCommunityIcons style={styles.quickActionArrow} name="arrow-top-right" size={16} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigate('bookingHistory')} activeOpacity={0.82}>
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name="history" size={23} color="#2563EB" />
              </View>
              <View style={styles.quickActionCopy}>
                <Text style={styles.quickActionLabel}>Booking History</Text>
                <Text style={styles.quickActionHint}>Review past visits</Text>
              </View>
              <MaterialCommunityIcons style={styles.quickActionArrow} name="arrow-top-right" size={16} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigate('services')} activeOpacity={0.82}>
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name="tools" size={23} color="#2563EB" />
              </View>
              <View style={styles.quickActionCopy}>
                <Text style={styles.quickActionLabel}>Our Services</Text>
                <Text style={styles.quickActionHint}>Explore car care</Text>
              </View>
              <MaterialCommunityIcons style={styles.quickActionArrow} name="arrow-top-right" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.completedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Completed Services</Text>
            <TouchableOpacity style={styles.seeAllButton} onPress={() => navigate('bookingHistory')} activeOpacity={0.75}>
              <Text style={styles.seeAllText}>See All</Text>
              <MaterialCommunityIcons name="arrow-right" size={15} color="#2563EB" />
            </TouchableOpacity>
          </View>
          {loadingServices ? (
            <View style={styles.loadingContainer}>
              <Loading message="Loading completed services" compact />
            </View>
          ) : completedServices.length > 0 ? (
            <FlatList
              data={completedServices}
              renderItem={renderServiceCard}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesList}
              ItemSeparatorComponent={ServiceSeparator}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="car-clock" size={24} color="#94A3B8" />
              <Text style={styles.emptyText}>No completed services yet</Text>
            </View>
          )}
        </View>

        <View style={styles.promoSection}>
          <View style={styles.promoCard}>
            <View style={styles.promoGlow} />
            <View style={styles.promoContent}>
              <Text style={styles.promoEyebrow}>PERSONALIZED CAR CARE</Text>
              <Text style={styles.promoTitle}>Premium Services</Text>
              <Text style={styles.promoSubtitle}>Get exclusive deals on premium car services</Text>
              <TouchableOpacity style={styles.promoButton} onPress={() => navigate('services')} activeOpacity={0.85}>
                <Text style={styles.promoButtonText}>Explore services</Text>
                <MaterialCommunityIcons name="arrow-right" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.promoIcon}>
              <MaterialCommunityIcons name="car-wash" size={42} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </ScrollView>

      <TabBar activeTab="Home" onTabPress={() => {}} navigate={navigate} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FC',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#F4F7FC',
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    minHeight: '100%',
  },
  headerSection: {
    marginHorizontal: -20,
    marginTop: -12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 22,
    backgroundColor: '#4F46E5',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#3730A3',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  headerGlow: {
    position: 'absolute',
    top: -88,
    right: -52,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  eyebrow: { color: '#E0E7FF', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginLeft: 6 },
  userName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.7,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: 10,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  statusIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  statusCopy: { flex: 1 },
  balanceLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220,252,231,0.96)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A', marginRight: 5 },
  balanceBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  quickActionsSection: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: -0.35,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48.5%',
    minHeight: 126,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 13,
    alignItems: 'flex-start',
    marginBottom: 10,
    shadowColor: '#1E293B',
    shadowOpacity: 0.035,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E9EEF5',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  quickActionCopy: { flex: 1, width: '100%' },
  quickActionLabel: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  quickActionHint: { color: '#94A3B8', fontSize: 10, marginTop: 3 },
  quickActionArrow: {
    position: 'absolute',
    top: 14,
    right: 12,
  },
  promoSection: {
    marginBottom: 16,
  },
  promoCard: {
    backgroundColor: '#172554',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#1E293B',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#263B70',
    overflow: 'hidden',
  },
  promoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    right: -70,
    top: -78,
    borderRadius: 90,
    backgroundColor: 'rgba(99,102,241,0.22)',
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  promoEyebrow: { color: '#A5B4FC', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 7 },
  promoSubtitle: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 13,
  },
  promoButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  promoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  promoIcon: {
    marginLeft: 12,
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  servicesList: {
    paddingHorizontal: 4,
  },
  serviceSeparator: {
    width: 12,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: 158,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOpacity: 0.045,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  imageContainer: {
    width: 158,
    height: 108,
    backgroundColor: '#F1F5F9',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  serviceImagePlaceholder: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    padding: 12,
  },
  serviceName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabItemActive: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  tabLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#3B82F6',
  },
  activeIndicator: {
    marginTop: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
});

export default HomeScreen;
