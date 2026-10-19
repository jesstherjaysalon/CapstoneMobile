import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import TabBar from './TabBar';
import { BASE_URL } from '../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import Loading from '../loading/loading';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ServiceItem = ({ item, onPress }) => {
  const iconLabel = item.name ? item.name.charAt(0).toUpperCase() : 'S';
  const rating = item.average_rating || 0;

  const renderStars = (rating) => {
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
    <TouchableOpacity style={styles.serviceCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.serviceTopRow}>
        <View style={styles.serviceIconPlaceholder}>
          <Text style={styles.serviceIconLabel}>{iconLabel}</Text>
        </View>
        <View style={styles.serviceHeaderText}>
          <Text style={styles.serviceTitle}>{item.name}</Text>
          <Text style={styles.serviceDescription} numberOfLines={2}>
            {item.description || 'Premium service tailored for your vehicle.'}
          </Text>
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>{renderStars(rating)}</View>
            <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.serviceFooter}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Starting at</Text>
          <Text style={styles.servicePrice}>{item.price ? `₱${item.price}` : 'Contact us'}</Text>
        </View>
        <View style={styles.arrowContainer}>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#2563EB" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const Services = ({ navigate }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${BASE_URL}/services`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to load');
        if (mounted) {
          console.log('Services data:', json.data);
          setServices(json.data || []);
        }
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredServices = services.filter((service) => {
    const lowerQuery = query.toLowerCase();
    return (
      service.name.toLowerCase().includes(lowerQuery) ||
      (service.description || '').toLowerCase().includes(lowerQuery)
    );
  });

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={[styles.container, styles.centered]}>
          <Loading message="Loading services" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.errorText}>Error loading services.</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerEyebrow}>
            <MaterialCommunityIcons name="sparkles" size={15} color="#C7D2FE" />
            <Text style={styles.headerEyebrowText}>ROADREADY CARE</Text>
          </View>
          <Text style={styles.welcomeText}>Our Services</Text>
          <Text style={styles.headerSubtitle}>Choose the best care package for your vehicle.</Text>
        </View>

        <View style={styles.searchCard}>
          <MaterialCommunityIcons name="magnify" size={21} color="#64748B" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search services and care packages"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
        </View>

        <FlatList
          data={filteredServices}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ServiceItem
              item={item}
              onPress={() => navigate && navigate('serviceDetails', { id: item.id, service: item })}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No services match your search.</Text>
            </View>
          )}
        />
      </View>

      <TabBar activeTab="Services" onTabPress={() => {}} navigate={navigate} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#F5F7FB',
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  headerEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  headerEyebrowText: { color: '#E0E7FF', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    color: '#E0E7FF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#0F172A',
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 30,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#1E293B',
    shadowOpacity: 0.055,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  serviceTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  serviceIconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#DCE8FF',
  },
  serviceIconLabel: {
    color: '#2563EB',
    fontSize: 22,
    fontWeight: '800',
  },
  serviceHeaderText: {
    flex: 1,
  },
  serviceTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  serviceDescription: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceContainer: {
    flexDirection: 'column',
  },
  priceLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  servicePrice: {
    color: '#1D4ED8',
    fontSize: 18,
    fontWeight: '800',
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCE8FF',
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorDetail: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default Services;
