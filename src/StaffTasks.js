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
  Alert,
  Image,
  StatusBar,
  Dimensions,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRequest, postRequest, putRequest, BASE_URL, fixImageUrl } from '../api';
import Loading from '../loading/loading';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'react-native-image-picker';

const { width } = Dimensions.get('window');

const STATUS_STEPS = {
  pending: { label: 'Pending', color: '#F59E0B', bgColor: '#FEF3C7', icon: 'schedule' },
  in_progress: { label: 'In Progress', color: '#3B82F6', bgColor: '#DBEAFE', icon: 'play-circle' },
  completed: { label: 'Completed', color: '#10B981', bgColor: '#D1FAE5', icon: 'check-circle' },
};

const REQUEST_STATUS_STEPS = {
  Pending: { label: 'Pending', color: '#F59E0B', bgColor: '#FEF3C7' },
  Approved: { label: 'Approved', color: '#10B981', bgColor: '#D1FAE5' },
  Rejected: { label: 'Rejected', color: '#EF4444', bgColor: '#FEE2E2' },
};

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

const TaskItem = ({ task, onStatusChange, onOpenRequestModal, onOpenImageModal, onOpenProductUsageModal }) => {
  const statusStyle = STATUS_STEPS[task.status] || STATUS_STEPS.pending;

  const handleStatusChange = async (newStatus) => {
    Alert.alert(
      'Change Status',
      `Change task status to ${STATUS_STEPS[newStatus].label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => onStatusChange(task.id, newStatus),
        },
      ]
    );
  };

  const hasOutstandingReturnableItems = (task.product_usages || []).some(
    (usage) => usage.is_returnable && !usage.returned_at
  );

  const canComplete = task.service?.image && !hasOutstandingReturnableItems;

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskId}>TASK #{task.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bgColor }]}>
          <Icon name={statusStyle.icon} size={14} color={statusStyle.color} />
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {statusStyle.label}
          </Text>
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

      <View style={styles.timeRow}>
        <View style={styles.timeItem}>
          <Icon name="schedule" size={14} color="#9CA3AF" />
          <Text style={styles.timeCompactLabel}>START</Text>
          <Text style={styles.timeValue} numberOfLines={1}>{formatDate(task.start_time)}</Text>
        </View>
        <View style={styles.timeItem}>
          <Icon name="schedule" size={14} color="#9CA3AF" />
          <Text style={styles.timeCompactLabel}>END</Text>
          <Text style={styles.timeValue} numberOfLines={1}>{formatDate(task.end_time)}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onOpenRequestModal(task)}
        >
          <Icon name="add-shopping-cart" size={17} color="#6366F1" />
          <Text style={styles.actionButtonText} numberOfLines={1}>Request</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onOpenImageModal(task)}
        >
          <Icon name="photo-camera" size={17} color="#10B981" />
          <Text style={styles.actionButtonText} numberOfLines={1}>Photo</Text>
        </TouchableOpacity>

        {task.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={() => handleStatusChange('in_progress')}
          >
            <Icon name="play-arrow" size={17} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, styles.startButtonText]} numberOfLines={1}>Start</Text>
          </TouchableOpacity>
        )}

        {task.status === 'in_progress' && canComplete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleStatusChange('completed')}
          >
            <Icon name="check" size={17} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, styles.completeButtonText]} numberOfLines={1}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {task.product_usages && task.product_usages.length > 0 && (
        <View style={styles.productUsageSection}>
          <Icon name="inventory" size={15} color="#6366F1" />
          <Text style={styles.productUsageTitle}>
            {task.product_usages.length} {task.product_usages.length === 1 ? 'product' : 'products'} used
          </Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => onOpenProductUsageModal(task)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="View product usage details"
          >
            <Icon name="help-outline" size={17} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const StaffTasks = ({ navigate }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isProductUsageModalOpen, setIsProductUsageModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [requestFormData, setRequestFormData] = useState({
    product_id: '',
    quantity_used: 1,
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getRequest('/staff/tasks');

        if (!response || response.success === false) {
          const message = response?.message || 'Unable to load tasks';
          throw new Error(message);
        }

        if (mounted) {
          setTasks(response.data?.jobOrders || []);
          setProducts(response.data?.products || []);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || 'Failed to load tasks');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchTasks();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredTasks = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q && !statusFilter) return tasks;

    return tasks.filter((task) => {
      if (statusFilter && task.status !== statusFilter) return false;

      const serviceName = (task.service?.service_name || '').toLowerCase();
      const customerName = (task.customer?.name || '').toLowerCase();
      const vehicleBrand = (task.vehicle?.brand || '').toLowerCase();
      const vehicleModel = (task.vehicle?.model || '').toLowerCase();
      const vehiclePlate = (task.vehicle?.plate_number || '').toLowerCase();

      return [serviceName, customerName, vehicleBrand, vehicleModel, vehiclePlate].some((value) =>
        value.includes(q)
      );
    });
  }, [tasks, search, statusFilter]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => product.name?.toLowerCase().includes(query));
  }, [products, productSearch]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await putRequest(`/staff/tasks/${taskId}`, { status: newStatus });

      if (!response || response.success === false) {
        Alert.alert('Error', response?.message || 'Failed to update status');
        return;
      }

      Alert.alert('Success', 'Task status updated successfully');
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleOpenRequestModal = (task) => {
    setSelectedTask(task);
    setRequestFormData({ product_id: '', quantity_used: 1 });
    setProductSearch('');
    setIsProductDropdownOpen(false);
    setIsRequestModalOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!requestFormData.product_id) {
      Alert.alert('Error', 'Please select a product');
      return;
    }

    try {
      const response = await postRequest('/staff/service-product-usage', {
        job_order_id: selectedTask.id,
        product_id: requestFormData.product_id,
        quantity_used: requestFormData.quantity_used,
      });

      if (!response || response.success === false) {
        Alert.alert('Error', response?.message || 'Failed to submit request');
        return;
      }

      Alert.alert('Success', 'Product request submitted successfully');
      setIsRequestModalOpen(false);
      setSelectedTask(null);
      setRequestFormData({ product_id: '', quantity_used: 1 });
    } catch (error) {
      Alert.alert('Error', 'Failed to submit request');
    }
  };

  const handleReturnProduct = async (usageId) => {
    Alert.alert(
      'Return Product',
      'Are you sure you want to return this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return',
          onPress: async () => {
            try {
              const response = await postRequest(`/staff/service-product-usage/${usageId}/return`);

              if (!response || response.success === false) {
                Alert.alert('Error', response?.message || 'Failed to return product');
                return;
              }

              Alert.alert('Success', 'Product returned successfully');
              setTasks((prev) =>
                prev.map((task) => ({
                  ...task,
                  product_usages: task.product_usages?.map((usage) =>
                    usage.id === usageId
                      ? { ...usage, returned_at: new Date().toISOString(), status: 'Approved' }
                      : usage
                  ),
                }))
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to return product');
            }
          },
        },
      ]
    );
  };

  const handleOpenImageModal = (task) => {
    setSelectedTask(task);
    setSelectedImage(null);
    setIsImageModalOpen(true);
  };

  const handleOpenProductUsageModal = (task) => {
    setSelectedTask(task);
    setIsProductUsageModalOpen(true);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Unable to open gallery', result.errorMessage || 'Please try again.');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Unable to open gallery', error.message || 'Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera access',
            message: 'Allow camera access to take a completion photo.',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel',
          }
        );

        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Camera permission needed',
            'Allow camera access in your phone settings to take a completion photo.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        const message = result.errorCode === 'permission'
          ? 'Camera access was not granted. Allow camera access in your phone settings, then try again.'
          : result.errorMessage || 'Please check that your camera is available and try again.';
        Alert.alert('Unable to take photo', message);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Unable to open camera', error.message || 'Please try again.');
    }
  };

  const handleUploadImage = async () => {
    if (!selectedImage || !selectedTask) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      const imageUri = selectedImage.uri;
      const imageType = selectedImage.type || 'image/jpeg';
      const imageName = selectedImage.fileName || 'completion-image.jpg';

      formData.append('image', {
        uri: imageUri,
        type: imageType,
        name: imageName,
      });

      const response = await postRequest(`/staff/tasks/${selectedTask.id}/upload-image`, formData);

      if (!response || response.success === false) {
        Alert.alert('Error', response?.message || 'Failed to upload image');
        return;
      }

      Alert.alert('Success', 'Image uploaded successfully');
      setIsImageModalOpen(false);
      setSelectedTask(null);
      setSelectedImage(null);
      setTasks((prev) =>
        prev.map((task) =>
          task.id === selectedTask.id
            ? {
                ...task,
                service: {
                  ...task.service,
                  image: response.data?.image_path,
                },
              }
            : task
        )
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar hidden={false} barStyle="light-content" backgroundColor="#6366F1" translucent={false} />
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Loading message="Loading tasks" />
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
              onPress={() => navigate('staffTasks')}
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
      <StatusBar hidden={false} barStyle="light-content" backgroundColor="#6366F1" translucent={false} />
      <View style={styles.container}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 18 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigate('staffDashboard')}>
                <Icon name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.title}>My Tasks</Text>
              </View>
            </View>

          </View>

          <View style={styles.headerSummary}>
            <View style={styles.headerSummaryTextWrap}>
              <Text style={styles.summaryEyebrow}>Today</Text>
              <Text style={styles.summaryTitle}>{filteredTasks.length} active jobs</Text>
            </View>
            <View style={styles.headerPill}>
              <Text style={styles.headerPillValue}>{tasks.filter((task) => task.status === 'in_progress').length}</Text>
              <Text style={styles.headerPillLabel}>Live</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <View style={styles.searchIconWrapper}>
              <Icon name="search" size={22} color="#9CA3AF" />
            </View>
            <TextInput
              placeholder="Search tasks..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, !statusFilter && styles.filterButtonActive]}
            onPress={() => setStatusFilter('')}
          >
            <Text style={[styles.filterButtonText, !statusFilter && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'pending' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('pending')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'pending' && styles.filterButtonTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'in_progress' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('in_progress')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'in_progress' && styles.filterButtonTextActive]}>
              In Progress
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onStatusChange={handleStatusChange}
              onOpenRequestModal={handleOpenRequestModal}
              onOpenImageModal={handleOpenImageModal}
              onOpenProductUsageModal={handleOpenProductUsageModal}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Icon name="assignment" size={56} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different search term' : 'No tasks assigned to you yet'}
              </Text>
            </View>
          )}
          contentContainerStyle={filteredTasks.length ? styles.listContent : styles.emptyListContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Request Modal */}
        <Modal
          visible={isRequestModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsRequestModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Request Product</Text>
                <TouchableOpacity onPress={() => setIsRequestModalOpen(false)}>
                  <Icon name="close" size={26} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={[styles.modalBody, styles.requestModalBody]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalLabel}>Select Product</Text>
                <TouchableOpacity
                  style={[
                    styles.productDropdownTrigger,
                    isProductDropdownOpen && styles.productDropdownTriggerOpen,
                  ]}
                  onPress={() => setIsProductDropdownOpen((isOpen) => !isOpen)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Choose a product"
                  accessibilityState={{ expanded: isProductDropdownOpen }}
                >
                  <View style={styles.productDropdownIcon}>
                    <Icon name="inventory" size={20} color="#4F46E5" />
                  </View>
                  <View style={styles.productDropdownText}>
                    <Text
                      style={[
                        styles.productDropdownName,
                        !requestFormData.product_id && styles.productDropdownPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {products.find((product) => String(product.id) === requestFormData.product_id)?.name
                        || 'Choose a product'}
                    </Text>
                    <Text style={styles.productDropdownHint}>
                      {requestFormData.product_id
                        ? 'Selected product'
                        : `${products.length} products available`}
                    </Text>
                  </View>
                  <Icon
                    name={isProductDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={24}
                    color="#6B7280"
                  />
                </TouchableOpacity>

                {isProductDropdownOpen && (
                  <View style={styles.productDropdownPanel}>
                    <View style={styles.productSearchContainer}>
                      <Icon name="search" size={19} color="#9CA3AF" />
                      <TextInput
                        style={styles.productSearchInput}
                        placeholder="Search products..."
                        placeholderTextColor="#9CA3AF"
                        value={productSearch}
                        onChangeText={setProductSearch}
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel="Search products"
                      />
                      {!!productSearch && (
                        <TouchableOpacity
                          onPress={() => setProductSearch('')}
                          accessibilityRole="button"
                          accessibilityLabel="Clear product search"
                        >
                          <Icon name="close" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <ScrollView
                      style={styles.productDropdownList}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      {filteredProducts.length ? filteredProducts.map((product) => {
                        const isSelected = requestFormData.product_id === String(product.id);
                        return (
                          <TouchableOpacity
                            key={product.id}
                            style={[
                              styles.productDropdownOption,
                              isSelected && styles.productDropdownOptionSelected,
                            ]}
                            onPress={() => {
                              setRequestFormData((current) => ({
                                ...current,
                                product_id: String(product.id),
                              }));
                              setIsProductDropdownOpen(false);
                              setProductSearch('');
                            }}
                            activeOpacity={0.75}
                          >
                            <View style={styles.productDropdownOptionIcon}>
                              <Icon name="inventory" size={18} color={isSelected ? '#4F46E5' : '#6B7280'} />
                            </View>
                            <View style={styles.productOptionText}>
                              <Text style={styles.productOptionName} numberOfLines={1}>{product.name}</Text>
                              <Text style={styles.productOptionStock} numberOfLines={1}>
                                Stock: {product.current_stock} {product.unit}
                              </Text>
                            </View>
                            {isSelected && <Icon name="check-circle" size={21} color="#4F46E5" />}
                          </TouchableOpacity>
                        );
                      }) : (
                        <View style={styles.productSearchEmpty}>
                          <Icon name="search-off" size={22} color="#9CA3AF" />
                          <Text style={styles.productSearchEmptyText}>No products match your search</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}

                <Text style={styles.modalLabel}>Quantity</Text>
                <TextInput
                  style={styles.modalInput}
                  value={String(requestFormData.quantity_used)}
                  onChangeText={(text) => setRequestFormData((current) => ({
                    ...current,
                    quantity_used: parseInt(text, 10) || 1,
                  }))}
                  keyboardType="numeric"
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setIsRequestModalOpen(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleSubmitRequest}
                >
                  <Text style={styles.modalButtonTextConfirm}>Submit Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Product Usage Modal */}
        <Modal
          visible={isProductUsageModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsProductUsageModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Product Usage</Text>
                <TouchableOpacity onPress={() => setIsProductUsageModalOpen(false)}>
                  <Icon name="close" size={26} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {selectedTask?.product_usages?.length ? (
                  selectedTask.product_usages.map((usage) => (
                    <View key={usage.id} style={styles.usageDetailCard}>
                      <View style={styles.usageDetailHeader}>
                        <View style={styles.productOptionIcon}>
                          <Icon name="inventory" size={20} color="#6366F1" />
                        </View>
                        <View style={styles.productOptionText}>
                          <Text style={styles.productOptionName}>{usage.product?.name || 'Unknown product'}</Text>
                          <Text style={styles.productOptionStock}>Qty: {usage.quantity_used} {usage.product?.unit || ''}</Text>
                        </View>
                      </View>

                      <View style={styles.usageMetaRow}>
                        <Text style={styles.usageMetaLabel}>Status</Text>
                        <View style={[styles.usageStatusBadge, { backgroundColor: REQUEST_STATUS_STEPS[usage.status]?.bgColor || '#F3F4F6' }]}>
                          <Text style={[styles.usageStatusText, { color: REQUEST_STATUS_STEPS[usage.status]?.color || '#374151' }]}>
                            {usage.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.usageMetaRow}>
                        <Text style={styles.usageMetaLabel}>Returnable</Text>
                        <Text style={styles.usageMetaValue}>{usage.is_returnable ? 'Yes' : 'No'}</Text>
                      </View>

                      {usage.returned_at && (
                        <View style={styles.usageMetaRow}>
                          <Text style={styles.usageMetaLabel}>Returned</Text>
                          <Text style={styles.usageMetaValue}>{formatDate(usage.returned_at)}</Text>
                        </View>
                      )}

                      {usage.is_returnable && usage.status === 'Approved' && !usage.returned_at && (
                        <TouchableOpacity
                          style={styles.returnButtonModal}
                          onPress={() => {
                            setIsProductUsageModalOpen(false);
                            handleReturnProduct(usage.id);
                          }}
                        >
                          <Icon name="keyboard-return" size={16} color="#FFFFFF" />
                          <Text style={styles.returnButtonText}>Return product</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyModalText}>No product usage recorded for this task.</Text>
                )}
              </ScrollView>
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
                <View style={styles.imageModalTitleWrap}>
                  <Text style={styles.modalTitle}>Completion photo</Text>
                  <Text style={styles.imageModalSubtitle}>
                    {selectedTask?.service?.service_name || `Task #${selectedTask?.id || ''}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsImageModalOpen(false)}>
                  <Icon name="close" size={26} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={[styles.modalBody, styles.imageModalBody]}
                contentContainerStyle={styles.imageModalBodyContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.photoPrompt}>
                  <Text style={styles.photoPromptTitle}>Add a clear photo of the completed work</Text>
                  <Text style={styles.photoPromptText}>
                    Take a new photo or choose one from your gallery.
                  </Text>
                </View>

                {selectedTask?.service?.image && (
                  <View style={styles.existingImageContainer}>
                    <Text style={styles.photoSectionLabel}>CURRENT PHOTO</Text>
                    <Image
                      source={{ uri: fixImageUrl(`${BASE_URL}/storage/${selectedTask.service.image}`) }}
                      style={styles.existingImage}
                    />
                  </View>
                )}

                <View style={styles.imageOptions}>
                  <TouchableOpacity
                    style={[styles.imageOptionButton, styles.galleryOptionButton]}
                    onPress={handlePickImage}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.imageOptionIcon, styles.galleryIcon]}>
                      <Icon name="photo-library" size={25} color="#6366F1" />
                    </View>
                    <View style={styles.imageOptionCopy}>
                      <Text style={styles.imageOptionText}>Choose from gallery</Text>
                      <Text style={styles.imageOptionHint}>Select an existing photo</Text>
                    </View>
                    <Icon name="chevron-right" size={21} color="#9CA3AF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.imageOptionButton, styles.cameraOptionButton]}
                    onPress={handleTakePhoto}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.imageOptionIcon, styles.cameraIcon]}>
                      <Icon name="camera-alt" size={25} color="#10B981" />
                    </View>
                    <View style={styles.imageOptionCopy}>
                      <Text style={styles.imageOptionText}>Take a photo</Text>
                      <Text style={styles.imageOptionHint}>Open your phone camera</Text>
                    </View>
                    <Icon name="chevron-right" size={21} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {selectedImage && (
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                    <View style={styles.selectedPhotoBadge}>
                      <Icon name="check-circle" size={15} color="#FFFFFF" />
                      <Text style={styles.selectedPhotoBadgeText}>Ready to upload</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImage(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove selected photo"
                    >
                      <Icon name="close" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setIsImageModalOpen(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm, uploading && styles.modalButtonDisabled]}
                  onPress={handleUploadImage}
                  disabled={uploading || !selectedImage}
                >
                  {!uploading && <Icon name="cloud-upload" size={18} color="#FFFFFF" />}
                  <Text style={styles.modalButtonTextConfirm}>
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
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
    paddingBottom: 26,
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerPillValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  headerPillLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  searchRow: {
    paddingHorizontal: 24,
    marginTop: 22,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  searchIconWrapper: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    marginTop: 18,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  filterButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
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
  taskCard: {
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
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskId: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    gap: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
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
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginBottom: 9,
  },
  timeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  timeCompactLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  timeValue: {
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
    gap: 4,
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1F2937',
  },
  startButton: {
    backgroundColor: '#3B82F6',
  },
  startButtonText: {
    color: '#FFFFFF',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  completeButtonText: {
    color: '#FFFFFF',
  },
  productUsageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  productUsageTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  helpButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usageStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  usageStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  returnButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  usageDetailCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginBottom: 14,
  },
  usageDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  usageMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  usageMetaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  usageMetaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  returnButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 8,
    gap: 6,
  },
  emptyModalText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '100%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  imageModalTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  imageModalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  modalBody: {
    padding: 28,
    maxHeight: '60%',
  },
  imageModalBody: {
    maxHeight: '65%',
    flexShrink: 1,
  },
  imageModalBodyContent: {
    paddingBottom: 8,
  },
  requestModalBody: {
    maxHeight: '65%',
    flexShrink: 1,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    color: '#1F2937',
  },
  productDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productDropdownTriggerOpen: {
    borderColor: '#6366F1',
    backgroundColor: '#FAFAFF',
  },
  productDropdownIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDropdownText: {
    flex: 1,
    minWidth: 0,
  },
  productDropdownName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  productDropdownPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  productDropdownHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
  },
  productDropdownPanel: {
    marginTop: -4,
    marginBottom: 20,
    padding: 9,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    marginBottom: 7,
  },
  productSearchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 13,
    color: '#1F2937',
  },
  productDropdownList: {
    maxHeight: 190,
  },
  productDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 11,
  },
  productDropdownOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  productDropdownOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productSearchEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    gap: 7,
  },
  productSearchEmptyText: {
    fontSize: 12,
    color: '#6B7280',
  },
  productOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productOptionText: {
    flex: 1,
  },
  productOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  productOptionStock: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  existingImageContainer: {
    marginBottom: 18,
  },
  photoPrompt: {
    padding: 14,
    borderRadius: 15,
    backgroundColor: '#F5F6FF',
    marginBottom: 16,
  },
  photoPromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  photoPromptText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 4,
  },
  photoSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  existingImage: {
    width: '100%',
    height: 160,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
  },
  imageOptions: {
    gap: 9,
    marginBottom: 16,
  },
  imageOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  galleryOptionButton: {
    borderColor: '#E0E7FF',
  },
  cameraOptionButton: {
    borderColor: '#D1FAE5',
  },
  imageOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOptionCopy: {
    flex: 1,
  },
  galleryIcon: {
    backgroundColor: '#EEF2FF',
  },
  cameraIcon: {
    backgroundColor: '#ECFDF5',
  },
  imageOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  imageOptionHint: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
  },
  selectedImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  selectedImage: {
    width: '100%',
    height: 190,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  selectedPhotoBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
  },
  selectedPhotoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 16,
    padding: 28,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  modalButtonConfirm: {
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  modalButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default StaffTasks;
