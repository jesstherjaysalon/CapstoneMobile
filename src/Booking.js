import React, { useEffect, useState, useMemo } from 'react';
import { getData } from '../storageUtils';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarList } from 'react-native-calendars';
import { BASE_URL } from '../api';

const ServiceRow = ({ item, selected, onToggle }) => (
  <TouchableOpacity style={[styles.serviceRow, selected && styles.serviceRowSelected]} onPress={() => onToggle(item)}>
    <View style={styles.serviceLeft}> 
      <Text style={styles.serviceName}>{item.name}</Text>
      <Text style={styles.serviceDesc} numberOfLines={1}>{item.description}</Text>
    </View>
    <View style={styles.serviceRight}>
      <Text style={styles.servicePrice}>{item.price ? `₱${item.price}` : 'Contact'}</Text>
      <Text style={styles.checkbox}>{selected ? '✓' : ''}</Text>
    </View>
  </TouchableOpacity>
);

const Booking = ({ navigate, routeParams }) => {
  const insets = useSafeAreaInsets();
  const preselected = routeParams?.preselected ?? null;
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(preselected ? [preselected] : []);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0,10);
  });
  const [availability, setAvailability] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [bookingState, setBookingState] = useState(null); // 'loading', 'success', 'error'
  const [bookingMessage, setBookingMessage] = useState('');
  
  // Animation for checkmark
  const scaleAnim = useMemo(() => new Animated.Value(0), []);
  const opacityAnim = useMemo(() => new Animated.Value(0), []);

  // Trigger animation on success
  useEffect(() => {
    if (bookingState === 'success') {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [bookingState]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setBookingMessage('');
        setBookingState(null);
        
        const res = await fetch(`${BASE_URL}/services`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to load services');
        if (mounted) setServices(json.data || []);

        // fetch slots for selected date
        try {
          const slotUrl = `${BASE_URL}/schedules/slots?date=${encodeURIComponent(selectedDate)}`;
          const sres = await fetch(slotUrl);
          const sjson = await sres.json().catch(() => null);

          if (sres.ok && sjson) {
            if (mounted) setSlots(sjson.data || []);
          } else {
            if (mounted) {
              setSlots([]);
              // Don't set error state here - just log it
              console.warn('Failed to load slots:', sjson?.message);
            }
          }
        } catch (e) {
          if (mounted) {
            console.warn('Slot fetch failed:', e.message);
          }
        }
      } catch (e) {
        if (mounted) {
          console.error('Load error:', e.message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => (mounted = false);
  }, [selectedDate]);

  // prepare next 14 days for the date picker
  const days = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  // fetch availability for all days (simple parallel requests)
  useEffect(() => {
    let mounted = true;
    const fetchAvailability = async () => {
      try {
        const promises = days.map((d) => {
          const iso = d.toISOString().slice(0,10);
          return fetch(`${BASE_URL}/schedules/slots?date=${encodeURIComponent(iso)}`)
            .then(async (res) => {
              if (!res.ok) return { iso, available: false };
              const json = await res.json().catch(() => null);
              if (!json) return { iso, available: false };
              const list = json.data || [];
              const anyAvailable = list.some((s) => s.available === undefined ? true : !!s.available);
              return { iso, available: anyAvailable };
            }).catch(() => ({ iso, available: false }));
        });

        const results = await Promise.all(promises);
        if (!mounted) return;
        const map = {};
        results.forEach((r) => { map[r.iso] = r.available; });
        setAvailability(map);
      } catch (e) {
        // ignore
      }
    };

    fetchAvailability();
    return () => { mounted = false; };
  }, [days]);

  const toggleService = (svc) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.id === svc.id);
      if (exists) return prev.filter((s) => s.id !== svc.id);
      return [...prev, svc];
    });
  };

  const total = selected.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  const selectDate = (iso) => {
    setSelectedDate(iso);
    setSelectedSlot(null);
  };

  const handleSubmit = async () => {
    if (!selected.length) {
      setBookingMessage('Select at least one service');
      setBookingState('error');
      return;
    }
    if (!selectedSlot) {
      setBookingMessage('Choose an available slot');
      setBookingState('error');
      return;
    }

    const timeValue = typeof selectedSlot === 'string' ? selectedSlot : (selectedSlot.time || selectedSlot);
    if (navigate) {
      navigate('payment', {
        services: selected,
        date: selectedDate,
        time: timeValue,
        total,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#1f2937" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Book Your Service</Text>
          <TouchableOpacity 
            onPress={() => navigate && navigate('services')} 
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={[1]} // Single item to enable scrolling
          renderItem={() => (
            <View style={styles.scrollContent}>
              {/* Services Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Services</Text>
                <FlatList
                  data={services}
                  scrollEnabled={false}
                  keyExtractor={(i) => String(i.id)}
                  renderItem={({ item }) => (
                    <ServiceRow item={item} selected={!!selected.find((s) => s.id === item.id)} onToggle={toggleService} />
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                />
              </View>

              {/* Calendar Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Date</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateScrollContainer}
                >
                  {days.map((d, index) => {
                    const iso = d.toISOString().slice(0, 10);
                    const isSelected = iso === selectedDate;
                    const isAvailable = availability[iso];
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNum = d.getDate();
                    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
                    
                    return (
                      <TouchableOpacity
                        key={iso}
                        style={[
                          styles.dateCard,
                          isSelected && styles.dateCardSelected,
                        ]}
                        onPress={() => selectDate(iso)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.dateMonth,
                          isSelected && styles.dateMonthSelected
                        ]}>
                          {monthName}
                        </Text>
                        <Text style={[
                          styles.dateDay,
                          isSelected && styles.dateDaySelected
                        ]}>
                          {dayNum}
                        </Text>
                        <Text style={[
                          styles.dateWeekday,
                          isSelected && styles.dateWeekdaySelected
                        ]}>
                          {dayName}
                        </Text>
                        {isAvailable && (
                          <View style={[
                            styles.availabilityDot,
                            isSelected && styles.availabilityDotSelected
                          ]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Slots Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Time Slot</Text>
                <View style={styles.slotsContainer}>
                  {slots.length ? (
                    slots.map((slot) => (
                      <TouchableOpacity
                        key={String(slot.time ?? slot)}
                        style={[
                          styles.slotButton,
                          selectedSlot === (slot.time ?? slot) && styles.slotButtonSelected,
                          !slot.available && styles.slotButtonDisabled,
                        ]}
                        onPress={() => slot.available && setSelectedSlot(slot.time ?? slot)}
                        disabled={!slot.available}
                      >
                        <Text style={[
                          styles.slotText,
                          selectedSlot === (slot.time ?? slot) && styles.slotTextSelected,
                          !slot.available && styles.slotTextDisabled,
                        ]}>
                          {slot.label || slot.time || slot}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noSlots}>No slots available for this date</Text>
                  )}
                </View>
              </View>

              {/* Booking Error Message */}
              {bookingState === 'error' && (
                <View style={styles.errorCard}>
                  <Text style={styles.errorIcon}>⚠</Text>
                  <Text style={styles.errorMessage}>{bookingMessage}</Text>
                </View>
              )}

              <View style={{ height: 100 }} />
            </View>
          )}
          scrollEnabled
          contentContainerStyle={{ flexGrow: 1 }}
        />

        {/* Bottom Summary Card */}
        <View style={styles.bottomCard}>
          <View style={styles.summaryContent}>
            <View>
              <Text style={styles.summaryLabel}>Total Cost</Text>
              <Text style={styles.summaryPrice}>₱{total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.bookButton, (!selectedSlot || submitting) && styles.bookButtonDisabled]}
              onPress={handleSubmit}
              disabled={!selectedSlot || submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.bookButtonText}>
                {submitting ? 'Processing...' : 'Book Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Booking State Modal */}
      <Modal
        visible={!!bookingState}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (bookingState !== 'loading') {
            setBookingState(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            bookingState === 'success' && styles.modalSuccess,
            bookingState === 'error' && styles.modalError,
          ]}>
            {bookingState === 'loading' && (
              <>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.modalText}>{bookingMessage}</Text>
              </>
            )}
            
            {bookingState === 'success' && (
              <>
                <Animated.View style={[
                  styles.checkmarkContainer,
                  {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                  }
                ]}>
                  <Text style={styles.checkmark}>✓</Text>
                </Animated.View>
                <Text style={styles.modalTitle}>{bookingMessage}</Text>
                <Text style={styles.modalSubtext}>Your booking has been confirmed</Text>
              </>
            )}

            {bookingState === 'error' && (
              <>
                <Text style={styles.errorModalIcon}>!</Text>
                <Text style={styles.modalTitle}>Something went wrong</Text>
                <Text style={styles.modalMessage}>{bookingMessage}</Text>
                <TouchableOpacity
                  style={styles.errorDismissButton}
                  onPress={() => setBookingState(null)}
                >
                  <Text style={styles.errorDismissText}>Try Again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, backgroundColor: '#ffffff' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#4b5563', fontSize: 16, fontWeight: '500' },
  
  /* Header */
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  closeButton: { 
    width: 36, 
    height: 36, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
  },
  closeIcon: { fontSize: 20, color: '#4b5563', fontWeight: '600' },

  /* Scroll Content */
  scrollContent: { paddingHorizontal: 16 },

  /* Section */
  section: { marginTop: 24, marginBottom: 8 },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1f2937',
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  /* Service Row */
  serviceRow: { 
    backgroundColor: '#f9fafb', 
    padding: 14, 
    borderRadius: 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    width: '100%',
  },
  serviceRowSelected: { 
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  serviceLeft: { flex: 1, paddingRight: 12 },
  serviceName: { color: '#1f2937', fontWeight: '700', fontSize: 15 },
  serviceDesc: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  serviceRight: { alignItems: 'flex-end', minWidth: 80 },
  servicePrice: { color: '#1f2937', fontWeight: '800', fontSize: 16 },
  checkbox: { color: '#3b82f6', fontWeight: '900', marginTop: 6, fontSize: 18 },

  /* Modern Date Picker */
  dateScrollContainer: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  dateCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginRight: 12,
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  dateCardSelected: {
    backgroundColor: '#1f2937',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateMonthSelected: {
    color: '#93c5fd',
  },
  dateDay: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    marginTop: 4,
    lineHeight: 32,
  },
  dateDaySelected: {
    color: '#ffffff',
  },
  dateWeekday: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 2,
  },
  dateWeekdaySelected: {
    color: '#93c5fd',
  },
  availabilityDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  availabilityDotSelected: {
    backgroundColor: '#34d399',
  },

  /* Slots */
  slotsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  slotButton: { 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    backgroundColor: '#f3f4f6', 
    marginRight: 8,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    minWidth: Dimensions.get('window').width > 380 ? '22%' : '30%',
    alignItems: 'center',
  },
  slotButtonSelected: { 
    backgroundColor: '#1f2937',
    borderColor: '#1f2937',
  },
  slotButtonDisabled: {
    opacity: 0.4,
  },
  slotText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  slotTextSelected: { color: '#fff', fontWeight: '700' },
  slotTextDisabled: { color: '#9ca3af' },
  noSlots: { color: '#9ca3af', fontSize: 14, fontStyle: 'italic' },

  /* Error Card */
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  errorIcon: { fontSize: 32, color: '#dc2626', textAlign: 'center', marginBottom: 8 },
  errorMessage: { color: '#991b1b', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  /* Bottom Card */
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  summaryPrice: { color: '#1f2937', fontSize: 24, fontWeight: '800' },
  bookButton: { 
    backgroundColor: '#1f2937', 
    paddingVertical: 14, 
    paddingHorizontal: 28, 
    borderRadius: 12,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonDisabled: {
    opacity: 0.5,
  },
  bookButtonText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalSuccess: {
    backgroundColor: '#f0fdf4',
  },
  modalError: {
    backgroundColor: '#fef2f2',
  },
  modalText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  modalTitle: {
    color: '#1f2937',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalSubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalMessage: {
    color: '#991b1b',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  checkmarkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 48,
    color: '#16a34a',
    fontWeight: '900',
  },
  errorModalIcon: {
    fontSize: 48,
    color: '#dc2626',
    fontWeight: '900',
  },
  errorDismissButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    marginTop: 20,
  },
  errorDismissText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default Booking;
