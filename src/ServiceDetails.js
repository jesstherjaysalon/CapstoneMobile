import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL, fixImageUrl } from '../api';
import { getRequest, getToken } from '../api';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Loading from '../loading/loading';

const ServiceDetails = ({ id, service: initialService, navigate }) => {
  const insets = useSafeAreaInsets();
  const [service, setService] = useState(initialService || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedServices, setCompletedServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    // If the parent passed the service object, use it directly and skip fetching
    if (initialService) {
      setService(initialService);
      setLoading(false);
    } else {
      let mounted = true;
      const load = async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await fetch(`${BASE_URL}/services/${id}`);
          const contentType = res.headers.get('content-type') || '';
          let json = null;
          if (contentType.includes('application/json')) {
            json = await res.json();
          } else {
            const txt = await res.text();
            throw new Error(`Unexpected response (not JSON): ${txt.substring(0, 300)}`);
          }

          if (!res.ok) throw new Error(json?.message || res.statusText || 'Failed to load');
          if (mounted) setService(json.data || json);
        } catch (e) {
          if (mounted) setError(e.message);
        } finally {
          if (mounted) setLoading(false);
        }
      };

      if (id) load();

      return () => {
        mounted = false;
      };
    }
  }, [id, initialService]);

  useEffect(() => {
    if (id) {
      fetchCompletedServices();
    }
  }, [id]);

  const fetchCompletedServices = async () => {
    try {
      setLoadingServices(true);
      const response = await getRequest(`/bookings/completed-services/${id}`);
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

  const calculateOverallRating = () => {
    // Use the average_rating from the API response if available
    if (service?.average_rating !== undefined) {
      return service.average_rating > 0 ? service.average_rating.toFixed(1) : '0.0';
    }
    // Fallback to manual calculation from completed services
    if (completedServices.length === 0) return service?.rating || '0.0';
    const totalRating = completedServices.reduce((sum, item) => sum + (item.rating || 0), 0);
    const avgRating = totalRating / completedServices.length;
    return avgRating.toFixed(1);
  };

  const renderServiceCard = ({ item }) => {
    console.log('Service item:', item);
    let serviceImage = null;
    // Use image_url if provided by API, otherwise fall back to constructing URL
    if (item.image_url) {
      serviceImage = fixImageUrl(item.image_url);
      console.log('Using image_url (fixed):', serviceImage);
    } else if (item.image) {
      const baseUrl = BASE_URL.replace('/api', '');
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
      <View style={styles.serviceCard}>
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
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>{renderStars(rating)}</View>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centered]}>
          <Loading message="Loading service details" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.errorText}>Error loading service.</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <TouchableOpacity onPress={() => navigate && navigate('services')} style={styles.backButton}>
            <Text style={styles.backText}>Back to Services</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 140, paddingTop: insets.top + 16 }}>
        <View style={styles.headerCard}>
          <TouchableOpacity onPress={() => navigate && navigate('services')} style={styles.iconBack}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerEyebrow}>SERVICE OVERVIEW</Text>
              <Text style={styles.title}>{service?.name}</Text>
              <Text style={styles.subTitle}>{service?.category?.name || 'Service details'}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#2563EB" />
                  <Text style={styles.metaText}>{service?.duration || '30m'}</Text>
                </View>
                <View style={styles.metaPill}>
                  <MaterialCommunityIcons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.metaText}>{calculateOverallRating()}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionText}>{service?.description || 'No description available.'}</Text>

          <View style={styles.rowSplit}>
            <View>
              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Price</Text>
              <Text style={styles.priceText}>{service?.price ? `₱${service.price}` : 'Contact us'}</Text>
            </View>
            <View style={styles.rightBlock}>
              <Text style={styles.availabilityLabel}>{service?.availability || 'Available'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.completedSection}>
          <Text style={styles.sectionTitle}>Completed Services</Text>
          {loadingServices ? (
            <View style={styles.loadingContainer}>
              <Loading message="Loading completed services" compact />
            </View>
          ) : completedServices.length > 0 ? (
            <FlatList
              data={completedServices}
              renderItem={renderServiceCard}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.servicesRow}
              contentContainerStyle={styles.servicesList}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No completed services yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigate && navigate('booking', { preselected: service })}
        >
          <Text style={styles.bookText}>Book This Service</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#F5F7FB',
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  centered: { justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    padding: 20,
    paddingTop: 58,
    marginBottom: 14,
    overflow: 'hidden',
  },
  headerEyebrow: { color: '#C7D2FE', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  title: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', marginBottom: 6, letterSpacing: -0.6 },
  subTitle: { color: '#E0E7FF', fontSize: 14, fontWeight: '500' },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800', marginBottom: 8 },
  sectionText: { color: '#64748B', fontSize: 14, lineHeight: 22 },
  actionButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  iconBack: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  backButton: { marginTop: 12, padding: 12, backgroundColor: '#EFF5FF', borderRadius: 12 },
  backText: { color: '#1D4ED8', fontWeight: '600' },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTextWrap: { flex: 1 },
  metaRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  metaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  metaText: { color: '#FFFFFF', marginLeft: 4, fontSize: 12, fontWeight: '700' },
  rowSplit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { color: '#4F46E5', fontSize: 23, fontWeight: '800', marginTop: 8 },
  rightBlock: { alignItems: 'flex-end' },
  availabilityLabel: { backgroundColor: '#ECFDF3', color: '#15803D', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, fontWeight: '700', fontSize: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  stickyFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: 'rgba(245,247,251,0.97)', borderTopWidth: 1, borderTopColor: '#E5EAF2' },
  bookButton: { backgroundColor: '#4F46E5', borderRadius: 15, paddingVertical: 16, alignItems: 'center', shadowColor: '#4F46E5', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  bookText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  errorText: { color: '#0F172A', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  errorDetail: { color: '#64748B', fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  completedSection: {
    marginTop: 20,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  servicesList: {
    paddingBottom: 8,
  },
  servicesRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '48%',
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
    width: '100%',
    height: 100,
    backgroundColor: '#f3f4f6',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  serviceImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    padding: 12,
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
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});

export default ServiceDetails;
