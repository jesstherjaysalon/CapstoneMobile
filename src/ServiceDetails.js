import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
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
          <ActivityIndicator size="large" color="#1f2937" />
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
            <MaterialCommunityIcons name="arrow-left" size={20} color="#1f2937" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{service?.name}</Text>
              <Text style={styles.subTitle}>{service?.category?.name || 'Service details'}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#3b82f6" />
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
              <ActivityIndicator size="small" color="#1e40af" />
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
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, paddingHorizontal: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 64, 175, 0.12)',
  },
  title: { color: '#1f2937', fontSize: 24, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
  subTitle: { color: '#6b7280', fontSize: 14, fontWeight: '500' },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { color: '#1f2937', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionText: { color: '#6b7280', fontSize: 14, lineHeight: 22 },
  actionButton: {
    backgroundColor: '#1f2937',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  iconBack: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: { marginTop: 12, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 12 },
  backText: { color: '#1f2937', fontWeight: '600' },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTextWrap: { flex: 1 },
  metaRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  metaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 64, 175, 0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 6 },
  metaText: { color: '#1f2937', marginLeft: 4, fontSize: 12, fontWeight: '500' },
  rowSplit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { color: '#1f2937', fontSize: 20, fontWeight: '800', marginTop: 8 },
  rightBlock: { alignItems: 'flex-end' },
  availabilityLabel: { backgroundColor: 'rgba(30, 64, 175, 0.12)', color: '#1e40af', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, fontWeight: '700', fontSize: 12 },
  stickyFooter: { position: 'absolute', left: 0, right: 0, bottom: 18, paddingHorizontal: 16 },
  bookButton: { backgroundColor: '#1e40af', borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: '#1e40af', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4 },
  bookText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  errorText: { color: '#1f2937', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  errorDetail: { color: '#6b7280', fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '48%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
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
});

export default ServiceDetails;
