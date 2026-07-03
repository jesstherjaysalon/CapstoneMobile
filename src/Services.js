import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import TabBar from './TabBar';
import { BASE_URL } from '../api';

const ServiceItem = ({ item, onPress }) => {
  const iconLabel = item.name ? item.name.charAt(0).toUpperCase() : 'S';
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
        </View>
      </View>
      <View style={styles.serviceFooter}>
        <Text style={styles.servicePrice}>{item.price ? `₱${item.price}` : 'Contact us'}</Text>
        <Text style={styles.serviceArrow}>{'>'}</Text>
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
        if (mounted) setServices(json.data || []);
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
          <Text style={styles.errorText}>Error loading services.</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.welcomeText}>Our Services</Text>
          <Text style={styles.headerSubtitle}>Choose the best care package for your vehicle.</Text>
        </View>

        <View style={styles.searchCard}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search services"
            placeholderTextColor="#d1d5db"
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
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 64, 175, 0.12)',
  },
  welcomeText: {
    color: '#1f2937',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 64, 175, 0.08)',
  },
  searchInput: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    color: '#1f2937',
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: 'rgba(30, 64, 175, 0.08)',
  },
  listContent: {
    paddingBottom: 30,
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 64, 175, 0.08)',
    shadowColor: '#1e40af',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  serviceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  serviceIconPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 64, 175, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  serviceIconLabel: {
    color: '#1e40af',
    fontSize: 20,
    fontWeight: '800',
  },
  serviceHeaderText: {
    flex: 1,
  },
  serviceTitle: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  serviceDescription: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePrice: {
    color: '#1e40af',
    fontSize: 15,
    fontWeight: '700',
  },
  serviceArrow: {
    color: 'rgba(30, 64, 175, 0.3)',
    fontSize: 18,
    fontWeight: '700',
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorDetail: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default Services;
