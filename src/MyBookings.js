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

const normalizeBookingStatus = (status) => {
  if (!status) return null;

  const value = String(status).trim().toLowerCase();
  if (!value) return null;

  const aliases = {
    pending: 'pending',
    awaiting: 'pending',
    wait: 'pending',
    approved: 'accepted',
    accepted: 'accepted',
    confirmed: 'accepted',
    assign: 'assigned',
    assigned: 'assigned',
    in_progress: 'assigned',
    inprogress: 'assigned',
    processing: 'assigned',
    ongoing: 'assigned',
    completed: 'completed',
    done: 'completed',
    finished: 'completed',
    success: 'completed',
    cancelled: 'cancelled',
    cancel: 'cancelled',
    rejected: 'cancelled',
  };

  return aliases[value] || value;
};

const formatBookingStatus = (status) => {
  const normalized = normalizeBookingStatus(status);

  if (!normalized) return 'Pending';

  const labels = {
    pending: 'Pending',
    accepted: 'Accepted',
    assigned: 'Assigned',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return labels[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const BookingProgressTracker = ({ status }) => {
  const normalizedStatus = normalizeBookingStatus(status);
  const currentStepIndex = normalizedStatus
    ? STATUS_STEPS.findIndex((step) => step.key === normalizedStatus)
    : -1;

  const safeIndex = currentStepIndex >= 0 ? currentStepIndex : -1;
  const progressPercent = safeIndex >= 0 ? ((safeIndex + 1) / STATUS_STEPS.length) * 100 : 0;
  const isCompleted = normalizedStatus === 'completed';

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View style={styles.lineLayer}>
          <View style={styles.lineBackgroundFull} />
          <View
            style={[
              styles.lineProgressFull,
              { width: `${progressPercent}%` },
            ]}
          />
          {!isCompleted && safeIndex >= 0 && (
            <View
              style={[
                styles.glowLight,
                { left: `${Math.max(progressPercent - 10, 0)}%` },
              ]}
            />
          )}
        </View>

        {STATUS_STEPS.map((step, index) => {
          const isCompletedStep = index <= safeIndex;
          const isCurrentStep = index === safeIndex;

          return (
            <View key={step.key} style={styles.stepWrapper}>
              <View
                style={[
                  styles.stepCircle,
                  isCompletedStep && styles.stepCircleActive,
                  !isCompletedStep && styles.stepCircleInactive,
                  isCurrentStep && styles.stepCircleCurrent,
                ]}
              >
                <Icon
                  name={step.icon}
                  size={18}
                  color={isCompletedStep ? '#ffffff' : '#94a3b8'}
                />
              </View>

              <Text
                style={[
                  styles.stepLabel,
                  isCompletedStep && styles.stepLabelActive,
                  !isCompletedStep && styles.stepLabelInactive,
                ]}
              >
                {step.label}
              </Text>

              {isCurrentStep && isCompleted && (
                <View style={styles.successBadge}>
                  <Icon name="check" size={14} color="#ffffff" />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const BookingItem = ({ booking, expanded, onToggle }) => {
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

  const bookingStatusLabel = formatBookingStatus(booking.status);

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

    if (booking.payments && booking.payments.length) {
      total += booking.payments.reduce((sum, payment) => {
        if (payment.status === 'paid') {
          const amount = Number(payment.amount) || 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }
        return sum;
      }, 0);
    }

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
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onToggle(booking.id)}
      style={styles.bookingCard}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingTitle}>Booking #{booking.id}</Text>
        <Text style={styles.bookingStatus}>{bookingStatusLabel}</Text>
      </View>

      <BookingProgressTracker status={booking.status} />

      <View style={styles.bookingMeta}>
        <Text style={styles.metaLabel}>Date:</Text>
        <Text style={styles.metaValue}>{displayDate}</Text>
      </View>

      <View style={styles.bookingMeta}>
        <Text style={styles.metaLabel}>Total:</Text>
        <Text style={styles.metaValue}>{`₱${Number(totalAmount).toFixed(2)}`}</Text>
      </View>

      <View style={styles.bookingMeta}>
        <Text style={styles.metaLabel}>Payment:</Text>
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

      {!expanded && (
        <View style={styles.collapseRow}>
          <Text style={styles.collapseText}>Tap to view details</Text>
          <Icon name={expanded ? 'expand-less' : 'expand-more'} size={18} color="#475569" />
        </View>
      )}

      {expanded && (
        <View style={styles.expandedDetails}>
          {booking.rating != null && (
            <View style={styles.bookingMeta}>
              <Text style={styles.metaLabel}>Rating:</Text>
              <Text style={styles.metaValue}>{booking.rating}</Text>
            </View>
          )}
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

          <View style={styles.collapseRow}>
            <Text style={styles.collapseText}>Tap to hide details</Text>
            <Icon name="expand-less" size={18} color="#475569" />
          </View>
        </View>
      )}
    </TouchableOpacity>
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
  const [expandedId, setExpandedId] = useState(null);

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
            renderItem={({ item }) => (
              <BookingItem
                booking={item}
                expanded={expandedId === item.id}
                onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              />
            )}
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
    backgroundColor: '#edf3ff',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#5b6476',
    lineHeight: 18,
    maxWidth: '74%',
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
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
    borderColor: '#e7efff',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ff',
  },
  bookingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  bookingStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
    textTransform: 'capitalize',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#dbeafe',
    borderRadius: 9,
    overflow: 'hidden',
  },
  bookingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
    paddingVertical: 1,
  },
  metaLabel: {
    color: '#5b6476',
    fontSize: 12.5,
    fontWeight: '600',
  },
  metaValue: {
    color: '#111827',
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  servicesList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef2ff',
  },
  servicesTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  serviceLeft: {
    flex: 1,
    paddingRight: 10,
  },
  serviceName: {
    color: '#111827',
    fontSize: 13.5,
    fontWeight: '700',
  },
  serviceMeta: {
    color: '#6b7280',
    fontSize: 11.5,
    marginTop: 4,
    maxWidth: Dimensions.get('window').width > 380 ? 180 : 140,
    lineHeight: 16,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  staffIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  staffName: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  serviceRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  serviceStatus: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  serviceTime: {
    marginTop: 6,
    color: '#475569',
    fontSize: 11,
  },
  collapseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#edf2ff',
  },
  collapseText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  expandedDetails: {
    marginTop: 8,
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
    marginBottom: 14,
  },
  searchInput: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dfe9ff',
    paddingHorizontal: 14,
    color: '#111827',
    fontSize: 14,
    shadowColor: '#93c5fd',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  progressContainer: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    position: 'relative',
    height: 74,
    paddingTop: 0,
  },
  lineLayer: {
    position: 'absolute',
    top: 18,
    left: 28,
    right: 28,
    height: 4,
    borderRadius: 4,
    overflow: 'visible',
  },
  lineBackgroundFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#dfe7f7',
    borderRadius: 4,
  },
  lineProgressFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: '#2563eb',
    borderRadius: 4,
    zIndex: 1,
  },
  stepWrapper: {
    alignItems: 'center',
    position: 'relative',
    flex: 1,
    zIndex: 2,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  stepCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    borderWidth: 2,
    borderColor: '#dfe7f7',
    backgroundColor: '#ffffff',
    shadowColor: '#94a3b8',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  stepCircleActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  stepCircleCurrent: {
    transform: [{ scale: 1.03 }],
  },
  stepCircleInactive: {
    backgroundColor: '#ffffff',
  },
  glowLight: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#93c5fd',
    shadowColor: '#60a5fa',
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    zIndex: 2,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
    marginTop: 7,
    letterSpacing: 0.1,
    lineHeight: 14,
  },
  stepLabelActive: {
    color: '#1d4ed8',
  },
  stepLabelInactive: {
    color: '#94a3b8',
  },
  successBadge: {
    position: 'absolute',
    top: -4,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
});

export default MyBookingsScreen;
