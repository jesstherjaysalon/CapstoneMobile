import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TabBar from './TabBar';
import { getRequest } from '../api';
import { BASE_URL, fixImageUrl } from '../api';

const HomeScreen = ({ user, onLogout, navigate }) => {
  const insets = useSafeAreaInsets();
  const [completedServices, setCompletedServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    fetchCompletedServices();
  }, []);

  const fetchCompletedServices = async () => {
    try {
      const response = await getRequest('/bookings/completed-services');
      console.log('Completed services response:', response);
      if (response && response.success) {
        console.log('Services data:', response.data);
        setCompletedServices(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching completed services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const renderServiceCard = ({ item }) => {
    console.log('Service item:', item);
    let serviceImage = null;
    // Use image_url if provided by API, otherwise fall back to constructing URL
    if (item.image_url) {
      serviceImage = fixImageUrl(item.image_url);
      console.log('Using image_url (fixed):', serviceImage);
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
      console.log('Constructed image URL:', serviceImage);
    } else {
      console.log('No image found');
    }

    const serviceName = item.service?.name || 'Service';
    const rating = item.rating || 0;

    const renderStars = (rating) => {
      const stars = [];
      for (let i = 1; i <= 5; i++) {
        stars.push(
          <MaterialCommunityIcons
            key={i}
            name={i <= rating ? 'star' : 'star-outline'}
            size={14}
            color={i <= rating ? '#f59e0b' : '#d1d5db'}
          />
        );
      }
      return stars;
    };

    return (
      <TouchableOpacity style={styles.serviceCard}>
        <View style={styles.imageContainer}>
          {serviceImage ? (
            <Image source={{ uri: serviceImage }} style={styles.serviceImage} />
          ) : (
            <View style={[styles.serviceImage, styles.serviceImagePlaceholder]}>
              <MaterialCommunityIcons name="car" size={32} color="#9ca3af" />
            </View>
          )}
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName} numberOfLines={1}>{serviceName}</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>{renderStars(rating)}</View>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Good to see you,</Text>
              <Text style={styles.userName}>{user?.name || 'Customer'}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
              <MaterialCommunityIcons name="logout" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Account Status</Text>
            <Text style={styles.balanceValue}>Active</Text>
            <View style={styles.balanceBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#ffffff" />
              <Text style={styles.balanceBadgeText}>Verified</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigate('myBookings')}>
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name="calendar-check" size={24} color="#1e40af" />
              </View>
              <Text style={styles.quickActionLabel}>My Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigate('paymentHistory')}>
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name="receipt" size={24} color="#1e40af" />
              </View>
              <Text style={styles.quickActionLabel}>Payment History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigate('bookingHistory')}>
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name="calendar-multiple" size={24} color="#1e40af" />
              </View>
              <Text style={styles.quickActionLabel}>Booking History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => navigate('services')}>
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons name="wrench" size={24} color="#1e40af" />
              </View>
              <Text style={styles.quickActionLabel}>Services</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.completedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Completed Services</Text>
            <TouchableOpacity onPress={() => navigate('bookingHistory')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {loadingServices ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#1e40af" />
            </View>
          ) : completedServices.length > 0 ? (
            <FlatList
              data={completedServices}
              renderItem={renderServiceCard}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesList}
              ItemSeparatorComponent={() => <View style={styles.serviceSeparator} />}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No completed services yet</Text>
            </View>
          )}
        </View>

        <View style={styles.promoSection}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <View style={styles.promoCard}>
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Premium Services</Text>
              <Text style={styles.promoSubtitle}>Get exclusive deals on premium car services</Text>
              <TouchableOpacity style={styles.promoButton} onPress={() => navigate('services')}>
                <Text style={styles.promoButtonText}>Explore Now</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoIcon}>
              <MaterialCommunityIcons name="car-wash" size={48} color="#1e40af" />
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 96,
    backgroundColor: '#f5f5f5',
  },
  headerSection: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    color: '#1f2937',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    backgroundColor: '#1e40af',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1e40af',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  balanceValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  balanceBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  quickActionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  promoSection: {
    marginBottom: 20,
  },
  promoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  promoSubtitle: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  promoButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  promoIcon: {
    marginLeft: 16,
  },
  completedSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#1e40af',
    fontSize: 13,
    fontWeight: '600',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: 140,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: 140,
    height: 100,
    backgroundColor: '#f3f4f6',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  serviceImagePlaceholder: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    padding: 12,
  },
  serviceName: {
    color: '#1f2937',
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
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabItemActive: {
    backgroundColor: '#111827',
    borderRadius: 20,
  },
  tabLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  activeIndicator: {
    marginTop: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60a5fa',
  },
});

export default HomeScreen;
