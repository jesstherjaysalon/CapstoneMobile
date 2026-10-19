import React, { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRequest, BASE_URL, fixImageUrl } from '../api';
import Loading from '../loading/loading';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${monthName} ${year}, ${hours}:${minutes}`;
};

const renderStars = (rating) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <MaterialCommunityIcons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={13}
        color={i <= rating ? '#F59E0B' : '#D1D5DB'}
      />
    );
  }
  return stars;
};

const AssignmentItem = ({ task, onOpenRequestsModal, onOpenImageModal }) => {
  const rating = Number(task.service?.rating) || 0;

  return (
    <View style={styles.assignmentCard}>
      <View style={styles.assignmentHeader}>
        <Text style={styles.assignmentId}>TASK #{task.id}</Text>
        <View style={styles.completedBadge}>
          <Icon name="check-circle" size={14} color="#10B981" />
          <Text style={styles.completedText}>Completed</Text>
        </View>
      </View>

      <View style={styles.serviceRow}>
        <View style={styles.serviceIcon}>
          <Icon name="build" size={17} color="#6366F1" />
        </View>
        <Text style={styles.serviceName} numberOfLines={1}>
          {task.service?.service_name || 'Unknown service'}
        </Text>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Icon name="person-outline" size={15} color="#6B7280" />
          <Text style={styles.detailText} numberOfLines={1}>
            {task.customer?.name || 'Unknown customer'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="directions-car" size={15} color="#6B7280" />
          <Text style={styles.detailText} numberOfLines={1}>
            {task.vehicle
              ? `${task.vehicle.brand || ''} ${task.vehicle.model || ''} · ${task.vehicle.plate_number || ''}`.trim()
              : 'No vehicle'}
          </Text>
        </View>
      </View>

      <View style={styles.assignmentMetaRow}>
        <View style={styles.ratingRow}>
          <Icon name="star" size={15} color="#F59E0B" />
          <View style={styles.starsContainer}>{renderStars(rating)}</View>
          <Text style={styles.ratingValue}>{rating}/5</Text>
        </View>
      </View>

      <View style={styles.assignmentTimeRow}>
        <View style={styles.timeCompact}>
          <Icon name="schedule" size={14} color="#9CA3AF" />
          <Text style={styles.timeCompactLabel}>START</Text>
          <Text style={styles.timeCompactText} numberOfLines={1}>
            {formatDate(task.start_time)}
          </Text>
        </View>
        <View style={styles.timeCompact}>
          <Icon name="schedule" size={14} color="#9CA3AF" />
          <Text style={styles.timeCompactLabel}>END</Text>
          <Text style={styles.timeCompactText} numberOfLines={1}>
            {formatDate(task.end_time)}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onOpenRequestsModal(task)}
        >
          <Icon name="list-alt" size={17} color="#6366F1" />
          <Text style={styles.actionButtonText}>Requests</Text>
        </TouchableOpacity>

        {task.service?.image && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onOpenImageModal(task)}
          >
            <Icon name="image" size={17} color="#10B981" />
            <Text style={styles.actionButtonText}>Photo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const StaffServiceAssignments = ({ navigate }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getRequest('/staff/service-assignments');

        if (!response || response.success === false) {
          const message = response?.message || 'Unable to load assignments';
          throw new Error(message);
        }

        if (mounted) {
          setAssignments(response.data?.jobOrders || []);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || 'Failed to load assignments');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAssignments();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredAssignments = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return assignments;

    return assignments.filter((assignment) => {
      const serviceName = (assignment.service?.service_name || '').toLowerCase();
      const customerName = (assignment.customer?.name || '').toLowerCase();
      const vehicleBrand = (assignment.vehicle?.brand || '').toLowerCase();
      const vehicleModel = (assignment.vehicle?.model || '').toLowerCase();
      const vehiclePlate = (assignment.vehicle?.plate_number || '').toLowerCase();

      return [serviceName, customerName, vehicleBrand, vehicleModel, vehiclePlate].some((value) =>
        value.includes(q)
      );
    });
  }, [assignments, search]);

  const handleOpenRequestsModal = (assignment) => {
    setSelectedAssignment(assignment);
    setIsRequestsModalOpen(true);
  };

  const handleOpenImageModal = (assignment) => {
    setSelectedAssignment(assignment);
    setIsImageModalOpen(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar hidden={false} barStyle="light-content" backgroundColor="#6366F1" translucent={false} />
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Loading message="Loading assignments" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar hidden={false} barStyle="light-content" backgroundColor="#6366F1" translucent={false} />
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <Icon name="error-outline" size={48} color="#EF4444" />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => navigate('staffServiceAssignments')}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <StatusBar hidden={false} barStyle="light-content" backgroundColor="#4F46E5" translucent={false} />
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 18 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigate('staffDashboard')}>
                <Icon name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View>
                <Text style={styles.greeting}>Completed work</Text>
                <Text style={styles.title}>Assignments</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerSummary}>
            <View style={styles.headerSummaryTextWrap}>
              <Text style={styles.summaryEyebrow}>History</Text>
              <Text style={styles.summaryTitle}>{filteredAssignments.length} completed jobs</Text>
            </View>
            <View style={styles.headerPill}>
              <Icon name="task-alt" size={18} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search completed tasks..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
            {!!search && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Icon name="close" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={filteredAssignments}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <AssignmentItem
              task={item}
              onOpenRequestsModal={handleOpenRequestsModal}
              onOpenImageModal={handleOpenImageModal}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Icon name="history" size={56} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyTitle}>No completed tasks</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different search term' : 'Completed tasks will appear here'}
              </Text>
            </View>
          )}
          contentContainerStyle={filteredAssignments.length ? styles.listContent : styles.emptyListContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Requests Modal */}
        <Modal
          visible={isRequestsModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsRequestsModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleWrap}>
                  <Text style={styles.modalEyebrow}>TASK #{selectedAssignment?.id || ''}</Text>
                  <Text style={styles.modalTitle}>Inventory requests</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {selectedAssignment?.service?.service_name || 'Completed service'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setIsRequestsModalOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close inventory requests"
                >
                  <Icon name="close" size={26} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                <View style={styles.taskInfoCard}>
                  <View style={styles.taskInfoRow}>
                    <View style={styles.taskInfoIcon}>
                      <Icon name="assignment" size={17} color="#4F46E5" />
                    </View>
                    <View style={styles.taskInfoCopy}>
                      <Text style={styles.taskInfoLabel}>Job order</Text>
                      <Text style={styles.taskInfoValue}>#{selectedAssignment?.id}</Text>
                    </View>
                  </View>
                  <View style={[styles.taskInfoRow, styles.taskInfoRowLast]}>
                    <View style={styles.taskInfoIcon}>
                      <Icon name="build" size={17} color="#4F46E5" />
                    </View>
                    <View style={styles.taskInfoCopy}>
                      <Text style={styles.taskInfoLabel}>Service</Text>
                      <Text style={styles.taskInfoValue} numberOfLines={1}>
                        {selectedAssignment?.service?.service_name || 'Unknown'}
                      </Text>
                    </View>
                  </View>
                </View>

                {selectedAssignment?.service_product_usages && selectedAssignment.service_product_usages.length > 0 ? (
                  <View style={styles.usagesList}>
                    <View style={styles.modalSectionHeading}>
                      <Text style={styles.modalSectionTitle}>Products used</Text>
                      <View style={styles.usageCountBadge}>
                        <Text style={styles.usageCountText}>{selectedAssignment.service_product_usages.length}</Text>
                      </View>
                    </View>
                    {selectedAssignment.service_product_usages.map((usage) => (
                      <View key={usage.id} style={styles.usageItem}>
                        <View style={styles.usageInfo}>
                          <View style={styles.usageIcon}>
                            <Icon name="inventory" size={19} color="#6366F1" />
                          </View>
                          <View style={styles.usageText}>
                            <Text style={styles.usageProductName} numberOfLines={1}>
                              {usage.product?.name || 'Unknown Product'}
                            </Text>
                            <Text style={styles.usageQuantity}>
                              Qty used: {usage.quantity_used} {usage.product?.unit || ''}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.usageStatusBadge, { backgroundColor: getStatusColor(usage.status) }]}>
                          <Text style={[styles.usageStatusText, { color: getStatusTextColor(usage.status) }]}>
                            {usage.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noUsagesContainer}>
                    <View style={styles.noUsagesIcon}>
                      <Icon name="inventory" size={28} color="#9CA3AF" />
                    </View>
                    <Text style={styles.noUsagesTitle}>No products used</Text>
                    <Text style={styles.noUsagesText}>There are no inventory requests for this completed job.</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setIsRequestsModalOpen(false)}
                >
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Image Modal */}
        <Modal
          visible={isImageModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsImageModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleWrap}>
                  <Text style={styles.modalEyebrow}>TASK #{selectedAssignment?.id || ''}</Text>
                  <Text style={styles.modalTitle}>Completion photo</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {selectedAssignment?.service?.service_name || 'Completed service'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setIsImageModalOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close completion photo"
                >
                  <Icon name="close" size={26} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {selectedAssignment?.service?.image ? (
                  <View style={styles.imageContainer}>
                    <View style={styles.photoFrameHeader}>
                      <View style={styles.photoFrameIcon}>
                        <Icon name="verified" size={16} color="#059669" />
                      </View>
                      <Text style={styles.photoFrameLabel}>COMPLETION PHOTO</Text>
                    </View>
                    <Image
                      source={{ uri: fixImageUrl(`${BASE_URL}/storage/${selectedAssignment.service.image}`) }}
                      style={styles.completionImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View style={styles.noImageContainer}>
                    <View style={styles.noImageIcon}>
                      <Icon name="image-not-supported" size={30} color="#9CA3AF" />
                    </View>
                    <Text style={styles.noImageTitle}>No photo available</Text>
                    <Text style={styles.noImageText}>A completion photo was not added to this job.</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setIsImageModalOpen(false)}
                >
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const getStatusColor = (status) => {
  const colors = {
    Pending: '#FEF3C7',
    Approved: '#D1FAE5',
    Rejected: '#FEE2E2',
  };
  return colors[status] || '#F3F4F6';
};

const getStatusTextColor = (status) => {
  const colors = {
    Pending: '#F59E0B',
    Approved: '#10B981',
    Rejected: '#EF4444',
  };
  return colors[status] || '#6B7280';
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#1F2937',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 28,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  headerRow: {
    backgroundColor: '#4F46E5',
    paddingTop: 18,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 12,
    position: 'relative',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  greeting: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSummaryTextWrap: {
    flex: 1,
  },
  summaryEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  headerPill: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  separator: {
    height: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  assignmentId: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    gap: 5,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 9,
  },
  serviceIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 9,
  },
  detailItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  assignmentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginBottom: 9,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  ratingValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 3,
  },
  assignmentTimeRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginBottom: 9,
  },
  timeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  timeCompactLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  timeCompactText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 5,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '76%',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  modalTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 3,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    maxHeight: 420,
    flexShrink: 1,
  },
  modalBodyContent: {
    paddingBottom: 8,
  },
  taskInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  taskInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EEF5',
  },
  taskInfoRowLast: {
    borderBottomWidth: 0,
  },
  taskInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfoCopy: {
    flex: 1,
    minWidth: 0,
  },
  taskInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  taskInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  modalSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  usageCountBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  usagesList: {
    marginTop: 2,
  },
  usageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  usageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 9,
  },
  usageIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usageText: {
    flex: 1,
    minWidth: 0,
  },
  usageProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  usageQuantity: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  usageStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  usageStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  noUsagesContainer: {
    marginTop: 4,
    marginBottom: 8,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  noUsagesIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  noUsagesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  noUsagesText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  imageContainer: {
    marginTop: 2,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  photoFrameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  photoFrameIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFrameLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  completionImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
  },
  noImageContainer: {
    marginTop: 2,
    marginBottom: 8,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  noImageIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 11,
  },
  noImageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  noImageText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  modalFooter: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#4F46E5',
  },
  modalButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default StaffServiceAssignments;
