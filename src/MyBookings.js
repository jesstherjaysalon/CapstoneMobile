import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRequest } from '../api';
import Icon from 'react-native-vector-icons/MaterialIcons';

const STATUS_STEPS = [
  { key: 'accepted', label: 'Accepted', icon: 'check-circle' },
  { key: 'assigned', label: 'Assigned', icon: 'person' },
  { key: 'completed', label: 'Completed', icon: 'verified' },
];

const BookingProgressTracker = ({ status }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;

  const currentStepIndex = STATUS_STEPS.findIndex(step => step.key === status?.toLowerCase());
  const validIndex = currentStepIndex >= 0 ? currentStepIndex : -1;

  useEffect(() => {
    progressAnim.setValue(0);
    glowAnim.setValue(0);
    pulseAnim.setValue(1);
    successScaleAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: validIndex,
      duration: 800,
      useNativeDriver: false,
    }).start();

    if (status?.toLowerCase() !== 'completed') {
      glowAnim.setValue(0);
      const glowAnimation = Animated.loop(
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        })
      );
      glowAnimation.start();

      return () => {
        glowAnimation.stop();
      };
    } else {
      Animated.spring(successScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [status, validIndex]);

  const stepWidth = (Dimensions.get('window').width - 48) / 3;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View style={styles.lineLayer}>
          <View style={styles.lineBackgroundFull} />
          <Animated.View
            style={[
              styles.lineProgressFull,
              {
                width: Animated.multiply(progressAnim, (Dimensions.get('window').width - 72) / 2),
              },
            ]}
          />
          {status?.toLowerCase() !== 'completed' && (
            <Animated.View
              style={[
                styles.glowLight,
                {
                  left: Animated.multiply(glowAnim, (Dimensions.get('window').width - 72) / 2),
                },
              ]}
            />
          )}
        </View>

        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index <= validIndex;
          const isCurrent = index === validIndex;

          return (
            <View key={step.key} style={styles.stepWrapper}>
              <Animated.View
                style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleActive,
                  !isCompleted && styles.stepCircleInactive,
                ]}
              >
                <Icon
                  name={step.icon}
                  size={20}
                  color={isCompleted ? '#2563eb' : '#9ca3af'}
                />
              </Animated.View>

              <Text
                style={[
                  styles.stepLabel,
                  isCompleted && styles.stepLabelActive,
                  !isCompleted && styles.stepLabelInactive,
                ]}
              >
                {step.label}
              </Text>

              {isCurrent && status?.toLowerCase() === 'completed' && (
                <Animated.View
                  style={[
                    styles.successBadge,
                    {
                      transform: [{ scale: successScaleAnim }],
                      opacity: successScaleAnim,
                    },
                  ]}
                >
                  <Icon name="check" size={16} color="#ffffff" />
                </Animated.View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const BookingItem = ({ booking }) => {
  const displayDate = (() => {
    const d = booking?.date;
    if (!d) return 'N/A';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    const day = String(dt.getDate()).padStart(2, '0');
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthName = months[dt.getMonth()];
    const year = dt.getFullYear();
    return `${day} ${monthName} ${year}`;
  })();

  const totalAmount = (() => {
    if (!booking.services || !booking.services.length) return 0;
    return booking.services.reduce((sum, svc) => {
      const p = svc?.service?.price;
      const n = p == null ? 0 : Number(p);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  })();

  const paidAmount = (() => {
    let total = 0;

    // Calculate from online payments
    if (booking.payments && booking.payments.length) {
      total += booking.payments.reduce((sum, payment) => {
        if (payment.status === 'paid') {
          const amount = Number(payment.amount) || 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }
        return sum;
      }, 0);
    }

    // Calculate from manual payments
    if (booking.manual_payments && booking.manual_payments.length) {
      total += booking.manual_payments.reduce((sum, payment) => {
        const amount = Number(payment.amount) || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
    }

    return total;
  })();

  const balance = totalAmount - paidAmount;
  const paymentStatus = (() => {
    if (paidAmount >= totalAmount) return 'paid';
    if (paidAmount > 0) return 'partial';
    return 'unpaid';
  })();

  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingTitle}>Booking #{booking.id}</Text>
        <Text style={styles.bookingStatus}>{booking.status || 'pending'}</Text>
      </View>

      <BookingProgressTracker status={booking.status} />

      <View style={styles.bookingMeta}>
        <Text style={styles.metaLabel}>Date:</Text>
        <Text style={styles.metaValue}>{displayDate}</Text>
      </View>
      {booking.rating != null && (
        <View style={styles.bookingMeta}>
          <Text style={styles.metaLabel}>Rating:</Text>
          <Text style={styles.metaValue}>{booking.rating}</Text>
        </View>
      )}
      <View style={styles.bookingMeta}>
        <Text style={styles.metaLabel}>Total:</Text>
        <Text style={styles.metaValue}>{`₱${Number(totalAmount).toFixed(2)}`}</Text>
      </View>
      <View style={styles.bookingMeta}>
        <Text style={styles.metaLabel}>Payment Status:</Text>
        <View style={[
          styles.paymentStatusBadge,
          paymentStatus === 'paid' && styles.paymentStatusPaid,
          paymentStatus === 'partial' && styles.paymentStatusPartial,
          paymentStatus === 'unpaid' && styles.paymentStatusUnpaid,
        ]}>
          <Text style={[
            styles.paymentStatusText,
            paymentStatus === 'paid' && styles.paymentStatusTextPaid,
            paymentStatus === 'partial' && styles.paymentStatusTextPartial,
            paymentStatus === 'unpaid' && styles.paymentStatusTextUnpaid,
          ]}>
            {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
          </Text>
        </View>
      </View>
      {paidAmount > 0 && (
        <View style={styles.bookingMeta}>
          <Text style={styles.metaLabel}>Paid Amount:</Text>
          <Text style={[styles.metaValue, styles.paidAmount]}>{`₱${paidAmount.toFixed(2)}`}</Text>
        </View>
      )}
      {balance > 0 && (
        <View style={styles.bookingMeta}>
          <Text style={styles.metaLabel}>Balance:</Text>
          <Text style={[styles.metaValue, styles.balanceAmount]}>{`₱${balance.toFixed(2)}`}</Text>
        </View>
      )}
      {booking.feedback ? (
        <View style={styles.bookingMeta}>
          <Text style={styles.metaLabel}>Feedback:</Text>
          <Text style={styles.metaValue}>{booking.feedback}</Text>
        </View>
      ) : null}

      <View style={styles.servicesList}>
        <Text style={styles.servicesTitle}>Services</Text>
        {booking.services && booking.services.length ? (
          booking.services.map((item) => {
            const staffName = item.job_order?.profile?.user?.name || item.job_order?.profile?.first_name && item.job_order?.profile?.last_name 
              ? `${item.job_order.profile.first_name} ${item.job_order.profile.last_name}` 
              : null;
            
            return (
              <View key={item.id} style={styles.serviceRow}>
                <View style={styles.serviceLeft}>
                  <Text style={styles.serviceName}>{item.service?.name || 'Service'}</Text>
                  <Text style={styles.serviceMeta}>{item.service?.description || 'No description'}</Text>
                  {staffName && (
                    <View style={styles.staffBadge}>
                      <Text style={styles.staffIcon}>👤</Text>
                      <Text style={styles.staffName}>{staffName}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.serviceRight}>
                  <Text style={styles.serviceStatus}>{item.status || 'pending'}</Text>
                  {item.scheduled_time ? <Text style={styles.serviceTime}>{item.scheduled_time}</Text> : null}
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No services added yet.</Text>
        )}
      </View>
    </View>
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const m = new Date(dateStr);
  if (isNaN(m.getTime())) return dateStr;
  const day = String(m.getDate()).padStart(2, '0');
  const months = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ];
  const monthName = months[m.getMonth()];
  const year = m.getFullYear();
  return `${day} ${monthName} ${year}`;
};

const MyBookingsScreen = ({ navigate }) => {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getRequest('/bookings');

        if (!response || response.success === false) {
          const message = response?.message || 'Unable to load bookings';
          throw new Error(message);
        }

        if (mounted) {
          setBookings(response.data || []);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || 'Failed to load bookings');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchBookings();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) => {
      if (String(b.id).includes(q)) return true;
      const dateLabel = formatDate(b.date).toLowerCase();
      if (dateLabel.includes(q)) return true;
      if (b.services && b.services.length) {
        for (const s of b.services) {
          const name = (s.service?.name || '').toLowerCase();
          if (name.includes(q)) return true;
        }
      }
      return false;
    });
  }, [bookings, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={styles.title}>My Bookings</Text>
            <Text style={styles.subtitle}>Your service requests and booking status.</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigate('home')}>
            <Text style={styles.closeText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search by ID, date or service"
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading your bookings...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => navigate('myBookings')}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <BookingItem booking={item} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No bookings found.</Text>
                <Text style={styles.emptySubtitle}>Book a service to see it here.</Text>
              </View>
            )}
            contentContainerStyle={bookings.length ? styles.listContent : styles.emptyListContent}
          />
        )}
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    maxWidth: '70%',
  },
  closeButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    color: '#475569',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 16,
    marginBottom: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 30,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  separator: {
    height: 16,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#2563eb',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  bookingStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'capitalize',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  bookingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    color: '#475569',
    fontSize: 13,
  },
  metaValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  servicesList: {
    marginTop: 12,
  },
  servicesTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  serviceLeft: {
    flex: 1,
    paddingRight: 12,
  },
  serviceName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  serviceMeta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
    maxWidth: Dimensions.get('window').width > 380 ? 180 : 140,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  staffIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  staffName: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
  },
  serviceRight: {
    alignItems: 'flex-end',
  },
  serviceStatus: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  serviceTime: {
    marginTop: 6,
    color: '#475569',
    fontSize: 12,
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentStatusPaid: {
    backgroundColor: '#dcfce7',
  },
  paymentStatusPartial: {
    backgroundColor: '#fef9c3',
  },
  paymentStatusUnpaid: {
    backgroundColor: '#fee2e2',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  paymentStatusTextPaid: {
    color: '#166534',
  },
  paymentStatusTextPartial: {
    color: '#854d0e',
  },
  paymentStatusTextUnpaid: {
    color: '#991b1b',
  },
  paidAmount: {
    color: '#166534',
    fontWeight: '700',
  },
  balanceAmount: {
    color: '#dc2626',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 260,
  },
  searchRow: {
    marginBottom: 16,
  },
  searchInput: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e6eefc',
    paddingHorizontal: 16,
    color: '#111827',
    fontSize: 15,
  },
  progressContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: 60,
  },
  lineLayer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    height: 4,
  },
  lineBackgroundFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  lineProgressFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  stepWrapper: {
    alignItems: 'center',
    position: 'relative',
    flex: 1,
    zIndex: 2,
    flexDirection: 'column',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepCircleActive: {
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  stepCircleInactive: {
  },
  glowLight: {
    position: 'absolute',
    top: -2,
    width: 50,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60a5fa',
    shadowColor: '#60a5fa',
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    elevation: 12,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
    marginTop: 8,
  },
  stepLabelActive: {
    color: '#2563eb',
  },
  stepLabelInactive: {
    color: '#9ca3af',
  },
  successBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
});

export default MyBookingsScreen;
