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
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRequest, postRequest } from '../api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Loading from '../loading/loading';

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

const BookingItem = ({ booking, onShowCostBreakdown, onRate, expanded, onToggle }) => {
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

  const serviceAmount = (() => {
    if (!booking.services || !booking.services.length) return 0;
    return booking.services.reduce((sum, svc) => {
      const p = svc?.service?.price;
      const n = p == null ? 0 : Number(p);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  })();

  const productCost = Number(booking.product_cost) || 0;

  const totalAmount = serviceAmount + productCost;

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

  const handleCardPress = () => {
    onToggle(booking.id);
  };

  const handleRatePress = () => {
    onRate(booking);
  };

  return (
    <TouchableOpacity style={styles.bookingCard} onPress={handleCardPress} activeOpacity={0.8}>
      <View style={styles.bookingHeader}>
        <View>
          <Text style={styles.bookingTitle}>Booking #{booking.id}</Text>
          <Text style={styles.bookingDate}>{displayDate}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.bookingStatus}>{bookingStatusLabel}</Text>
        </View>
      </View>

      {!expanded && (
        <View style={styles.collapsedRow}>
          <Text style={styles.collapsedText}>Tap to view details</Text>
          <Icon name="expand-more" size={18} color="#475569" />
        </View>
      )}

      {expanded && (
        <View style={styles.expandedSection}>
          {booking.rating != null && (
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Rating:</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon key={star} name="star" size={16} color={star <= booking.rating ? '#fbbf24' : '#d1d5db'} />
                ))}
              </View>
            </View>
          )}

          <View style={styles.costSection}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Service Cost</Text>
              <Text style={styles.costValue}>{`₱${Number(serviceAmount).toFixed(2)}`}</Text>
            </View>
            {productCost > 0 && (
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Product Cost</Text>
                <Text style={[styles.costValue, styles.productCostValue]}>{`₱${Number(productCost).toFixed(2)}`}</Text>
              </View>
            )}
            <View style={[styles.costRow, styles.totalCostRow]}>
              <Text style={styles.totalCostLabel}>Total</Text>
              <TouchableOpacity onPress={() => onShowCostBreakdown(booking.id)}>
                <Text style={[styles.totalCostValue, styles.clickableValue]}>{`₱${Number(totalAmount).toFixed(2)}`}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.paymentSection}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Status</Text>
              <View style={[
                styles.paymentBadge,
                paymentStatus === 'paid' && styles.paymentBadgePaid,
                paymentStatus === 'partial' && styles.paymentBadgePartial,
                paymentStatus === 'unpaid' && styles.paymentBadgeUnpaid,
              ]}>
                <Text style={[
                  styles.paymentBadgeText,
                  paymentStatus === 'paid' && styles.paymentBadgeTextPaid,
                  paymentStatus === 'partial' && styles.paymentBadgeTextPartial,
                  paymentStatus === 'unpaid' && styles.paymentBadgeTextUnpaid,
                ]}>
                  {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                </Text>
              </View>
            </View>
            {paidAmount > 0 && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Paid</Text>
                <Text style={[styles.paymentValue, styles.paidAmountValue]}>{`₱${paidAmount.toFixed(2)}`}</Text>
              </View>
            )}
            {balance > 0 && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Balance</Text>
                <Text style={[styles.paymentValue, styles.balanceAmountValue]}>{`₱${balance.toFixed(2)}`}</Text>
              </View>
            )}
          </View>

          {booking.feedback && (
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>Feedback</Text>
              <Text style={styles.feedbackText}>{booking.feedback}</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.rateButton} onPress={handleRatePress}>
              <Icon name="star-rate" size={16} color="#ffffff" />
              <Text style={styles.rateButtonText}>Rate Booking</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.servicesSection}>
            <Text style={styles.servicesTitle}>Services</Text>
            {booking.services && booking.services.length ? (
              booking.services.map((item) => {
                // Handle multiple staff members
                const staffList = (() => {
                  const profiles = item.job_order?.staff || [];
                  if (!profiles || !Array.isArray(profiles) || profiles.length === 0) return null;

                  return profiles.map(profile => {
                    const name = profile?.user?.name || (profile?.first_name && profile?.last_name
                      ? `${profile.first_name} ${profile.last_name}`
                      : 'Unknown Staff');
                    return name;
                  });
                })();

                return (
                  <View key={item.id} style={styles.serviceRow}>
                    <View style={styles.serviceLeft}>
                      <Text style={styles.serviceName}>{item.service?.name || 'Service'}</Text>
                      <Text style={styles.serviceMeta}>{item.service?.description || 'No description'}</Text>
                      {staffList && staffList.length > 0 && (
                        <View style={styles.staffContainer}>
                          {staffList.map((staffName, index) => (
                            <View key={index} style={styles.staffBadge}>
                              <Text style={styles.staffIcon}>👤</Text>
                              <Text style={styles.staffName}>{staffName}</Text>
                            </View>
                          ))}
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

          <View style={styles.collapsedRow}>
            <Text style={styles.collapsedText}>Tap to hide details</Text>
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

const BookingHistoryScreen = ({ navigate }) => {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingRating, setBookingRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [serviceRatings, setServiceRatings] = useState({});
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getRequest('/bookings/completed');

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

  const handleShowCostBreakdown = async (bookingId) => {
    setModalVisible(true);
    setModalLoading(true);
    setModalError('');
    setCostBreakdown(null);

    try {
      const response = await getRequest(`/bookings/${bookingId}/product-usage`);
      if (!response || response.success === false) {
        throw new Error(response?.message || 'Unable to load cost breakdown');
      }
      setCostBreakdown(response.data);
    } catch (err) {
      setModalError(err.message || 'Failed to load cost breakdown');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenRatingModal = (booking) => {
    setSelectedBooking(booking);
    setBookingRating(booking.rating || 0);
    setFeedback(booking.feedback || '');
    const initialServiceRatings = {};
    if (booking.services) {
      booking.services.forEach(service => {
        initialServiceRatings[service.id] = service.rating || 0;
      });
    }
    setServiceRatings(initialServiceRatings);
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async () => {
    if (bookingRating === 0) {
      alert('Please select a rating');
      return;
    }

    setSubmittingRating(true);
    try {
      const serviceRatingsArray = Object.entries(serviceRatings)
        .filter(([_, rating]) => rating > 0)
        .map(([bookingServiceId, rating]) => ({
          booking_service_id: parseInt(bookingServiceId),
          rating,
        }));

      const response = await postRequest(`/bookings/${selectedBooking.id}/rate`, {
        rating: bookingRating,
        feedback: feedback.trim() || null,
        service_ratings: serviceRatingsArray.length > 0 ? serviceRatingsArray : undefined,
      });

      if (!response || response.success === false) {
        throw new Error(response?.message || 'Failed to submit rating');
      }

      alert('Rating submitted successfully!');
      setRatingModalVisible(false);
      // Refresh bookings
      const bookingsResponse = await getRequest('/bookings/completed');
      if (bookingsResponse && bookingsResponse.success) {
        setBookings(bookingsResponse.data || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={styles.title}>Booking History</Text>
            <Text style={styles.subtitle}>Your service booking history.</Text>
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
            <Loading message="Loading booking history" />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => navigate('bookingHistory')}>
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
                onShowCostBreakdown={handleShowCostBreakdown}
                onRate={handleOpenRatingModal}
                expanded={expandedId === item.id}
                onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No bookings found.</Text>
                <Text style={styles.emptySubtitle}>Your booking history will appear here.</Text>
              </View>
            )}
            contentContainerStyle={bookings.length ? styles.listContent : styles.emptyListContent}
          />
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cost Breakdown</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {modalLoading ? (
              <View style={styles.modalLoading}>
                <Loading message="Loading cost breakdown" compact />
                <Text style={styles.modalLoadingText}>Loading cost breakdown...</Text>
              </View>
            ) : modalError ? (
              <View style={styles.modalError}>
                <Text style={styles.modalErrorText}>{modalError}</Text>
              </View>
            ) : costBreakdown ? (
              <ScrollView style={styles.modalBody}>
                <View style={styles.totalCostRow}>
                  <Text style={styles.totalCostLabel}>Total Cost:</Text>
                  <Text style={styles.totalCostValue}>{`₱${Number(costBreakdown.total_cost).toFixed(2)}`}</Text>
                </View>

                <View style={styles.itemsHeader}>
                  <Text style={styles.itemsHeaderText}>Products Used</Text>
                </View>

                {costBreakdown.items && costBreakdown.items.length > 0 ? (
                  costBreakdown.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text style={styles.itemName}>{item.product_name}</Text>
                        <Text style={styles.itemQuantity}>{`Qty: ${item.quantity}`}</Text>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={styles.itemUnitPrice}>{`₱${Number(item.unit_price).toFixed(2)}`}</Text>
                        <Text style={styles.itemTotal}>{`₱${Number(item.total).toFixed(2)}`}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noItemsText}>No products with recorded costs found.</Text>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={ratingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ratingModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Booking</Text>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                <Icon name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.ratingModalBody}>
              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>Overall Rating</Text>
                <View style={styles.starContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setBookingRating(star)}>
                      <Icon
                        name="star"
                        size={32}
                        color={star <= bookingRating ? '#fbbf24' : '#d1d5db'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackSectionTitle}>Feedback</Text>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Share your experience..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  value={feedback}
                  onChangeText={setFeedback}
                />
              </View>

              {selectedBooking && selectedBooking.services && selectedBooking.services.length > 0 && (
                <View style={styles.serviceRatingsSection}>
                  <Text style={styles.serviceRatingsTitle}>Rate Services</Text>
                  {selectedBooking.services.map((service) => (
                    <View key={service.id} style={styles.serviceRatingRow}>
                      <Text style={styles.serviceRatingName}>{service.service?.name || 'Service'}</Text>
                      <View style={styles.serviceStarContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => setServiceRatings({
                              ...serviceRatings,
                              [service.id]: star,
                            })}
                          >
                            <Icon
                              name="star"
                              size={24}
                              color={star <= (serviceRatings[service.id] || 0) ? '#fbbf24' : '#d1d5db'}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.ratingModalFooter}>
              <TouchableOpacity
                style={[styles.ratingSubmitButton, submittingRating && styles.ratingSubmitButtonDisabled]}
                onPress={handleSubmitRating}
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.ratingSubmitButtonText}>Submit Rating</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bookingStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'capitalize',
  },
  collapsedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  collapsedText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  rateButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  costSection: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fafbfc',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  costValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  totalCostRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginBottom: 0,
  },
  totalCostLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  totalCostValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  paymentSection: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentBadgePaid: {
    backgroundColor: '#dcfce7',
  },
  paymentBadgePartial: {
    backgroundColor: '#fef9c3',
  },
  paymentBadgeUnpaid: {
    backgroundColor: '#fee2e2',
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  paymentBadgeTextPaid: {
    color: '#166534',
  },
  paymentBadgeTextPartial: {
    color: '#854d0e',
  },
  paymentBadgeTextUnpaid: {
    color: '#991b1b',
  },
  paidAmountValue: {
    color: '#166534',
    fontWeight: '700',
  },
  balanceAmountValue: {
    color: '#dc2626',
    fontWeight: '700',
  },
  feedbackSection: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 6,
  },
  feedbackText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  servicesSection: {
    padding: 16,
  },
  servicesTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
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
  staffContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
  emptyText: {
    color: '#6b7280',
    fontSize: 13,
    fontStyle: 'italic',
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 2,
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
  stepCircleCurrent: {
    transform: [{ scale: 1.03 }],
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
  clickableValue: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  productCostValue: {
    color: '#dc2626',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalLoading: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    color: '#475569',
  },
  modalError: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalErrorText: {
    color: '#b91c1c',
    textAlign: 'center',
  },
  modalBody: {
    maxHeight: 400,
  },
  totalCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
  totalCostLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  totalCostValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563eb',
  },
  itemsHeader: {
    marginBottom: 12,
  },
  itemsHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemUnitPrice: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  noItemsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  ratingModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    padding: 20,
  },
  ratingModalBody: {
    maxHeight: 500,
    marginBottom: 16,
  },
  ratingSection: {
    marginBottom: 24,
  },
  ratingSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  feedbackSection: {
    marginBottom: 24,
  },
  feedbackSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  serviceRatingsSection: {
    marginBottom: 16,
  },
  serviceRatingsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  serviceRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  serviceRatingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  serviceStarContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingModalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  ratingSubmitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ratingSubmitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  ratingSubmitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default BookingHistoryScreen;
