import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Share,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRequest } from '../api';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const PaymentHistory = ({ navigate }) => {
  const insets = useSafeAreaInsets();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const receiptRef = useRef(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getRequest('/payments');
      if (response.success) {
        setPayments(response.data || []);
      } else {
        setError(response.message || 'Failed to load payments');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return '#166534';
      case 'pending':
        return '#854d0e';
      case 'failed':
        return '#991b1b';
      default:
        return '#6b7280';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'paid':
        return '#dcfce7';
      case 'pending':
        return '#fef9c3';
      case 'failed':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const sdkVersion = Platform.Version;
      
      if (sdkVersion >= 33) {
        // Android 13+ uses READ_MEDIA_IMAGES
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Gallery Permission',
            message: 'App needs access to your gallery to save the receipt.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // Android 12 and below uses WRITE_EXTERNAL_STORAGE
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to your storage to save the receipt.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  };

  const saveReceiptToGallery = async () => {
    console.log('Starting saveReceiptToGallery...');
    
    if (!receiptRef.current) {
      console.error('receiptRef.current is null');
      Alert.alert('Error', 'Unable to capture receipt.');
      return;
    }

    try {
      setSavingReceipt(true);
      console.log('Requesting permissions...');

      // Request permissions first
      const hasPermission = await requestStoragePermission();
      console.log('Permission granted:', hasPermission);
      
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Please grant storage permission to save the receipt.');
        setSavingReceipt(false);
        return;
      }

      console.log('Capturing receipt view...');
      // Capture the receipt view as an image
      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      console.log('Captured URI:', uri);

      console.log('Saving to gallery...');
      // Save to gallery using RNFS
      const galleryPath = RNFS.PicturesDirectoryPath + `/receipt_${selectedPayment?.id}_${Date.now()}.png`;
      await RNFS.copyFile(uri, galleryPath);
      
      // On Android, we need to scan the file so it appears in the gallery
      if (Platform.OS === 'android') {
        await RNFS.scanFile(galleryPath);
      }

      console.log('Save successful');
      Alert.alert('Success', 'Receipt saved to Gallery successfully.');
    } catch (error) {
      console.error('Error saving receipt:', error);
      console.error('Error string:', String(error));
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      Alert.alert('Error', `Failed to save receipt: ${error?.message || 'Unknown error'}`);
    } finally {
      setSavingReceipt(false);
    }
  };

  const PaymentItem = ({ payment }) => (
    <TouchableOpacity 
      style={styles.paymentCard}
      onPress={() => {
        setSelectedPayment(payment);
        setModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.paymentHeader}>
        <View style={styles.paymentIdSection}>
          <Text style={styles.paymentLabel}>{payment.payment_type === 'manual' ? 'Manual Payment' : `Payment #${payment.id}`}</Text>
          <Text style={styles.paymentDate}>{formatDate(payment.created_at)}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusBgColor(payment.status) }
        ]}>
          <Text style={[
            styles.statusText,
            { color: getStatusColor(payment.status) }
          ]}>
            {payment.status || 'pending'}
          </Text>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>₱{Number(payment.amount).toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method</Text>
          <Text style={styles.detailValue}>{payment.payment_method === 'manual' ? 'Manual' : (payment.payment_method || 'N/A')}</Text>
        </View>
        {payment.payment_type === 'manual' && payment.receipt_number && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Receipt #</Text>
            <Text style={styles.detailValue}>{payment.receipt_number}</Text>
          </View>
        )}
        {payment.booking && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking ID</Text>
            <Text style={styles.detailValue}>#{payment.booking.id}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigate('home')} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment History</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPayments}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigate('home')} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment History</Text>
          <View style={styles.headerSpacer} />
        </View>

        {payments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Payments Yet</Text>
            <Text style={styles.emptyText}>You haven't made any payments yet.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => navigate('services')}>
              <Text style={styles.emptyButtonText}>Book a Service</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={payments}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <PaymentItem payment={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Receipt</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <MaterialCommunityIcons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              <View style={styles.receiptCard} ref={receiptRef} collapsable={false}>
                <View style={styles.receiptHeader}>
                  <MaterialCommunityIcons name="receipt" size={32} color="#1e40af" />
                  <Text style={styles.receiptTitle}>{selectedPayment?.payment_type === 'manual' ? 'Manual Payment Receipt' : 'Payment Receipt'}</Text>
                  <Text style={styles.receiptId}>{selectedPayment?.payment_type === 'manual' ? selectedPayment?.receipt_number : `#${selectedPayment?.id}`}</Text>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptSection}>
                  <Text style={styles.receiptSectionTitle}>Payment Details</Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Amount</Text>
                    <Text style={styles.receiptValue}>₱{Number(selectedPayment?.amount).toFixed(2)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Payment Method</Text>
                    <Text style={styles.receiptValue}>{selectedPayment?.payment_method === 'manual' ? 'Manual' : (selectedPayment?.payment_method?.toUpperCase() || 'N/A')}</Text>
                  </View>
                  {selectedPayment?.payment_type !== 'manual' && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Type</Text>
                      <Text style={styles.receiptValue}>{selectedPayment?.amount_type || 'N/A'}</Text>
                    </View>
                  )}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Status</Text>
                    <View style={[
                      styles.receiptStatusBadge,
                      { backgroundColor: getStatusBgColor(selectedPayment?.status) }
                    ]}>
                      <Text style={[
                        styles.receiptStatusText,
                        { color: getStatusColor(selectedPayment?.status) }
                      ]}>
                        {selectedPayment?.status || 'pending'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Date</Text>
                    <Text style={styles.receiptValue}>{formatDate(selectedPayment?.created_at)}</Text>
                  </View>
                  {selectedPayment?.payment_type === 'manual' && selectedPayment?.remarks && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Remarks</Text>
                      <Text style={styles.receiptValueSmall}>{selectedPayment.remarks}</Text>
                    </View>
                  )}
                </View>

                {selectedPayment?.payment_type !== 'manual' && (
                  <>
                    <View style={styles.receiptDivider} />

                    <View style={styles.receiptSection}>
                      <Text style={styles.receiptSectionTitle}>PayMongo Details</Text>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Source ID</Text>
                        <Text style={styles.receiptValueSmall}>{selectedPayment?.paymongo_source_id || 'N/A'}</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Source Status</Text>
                        <Text style={styles.receiptValue}>{selectedPayment?.paymongo_source_status || 'N/A'}</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Payment ID</Text>
                        <Text style={styles.receiptValueSmall}>{selectedPayment?.paymongo_payment_id || 'N/A'}</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Payment Status</Text>
                        <Text style={styles.receiptValue}>{selectedPayment?.paymongo_payment_status || 'N/A'}</Text>
                      </View>
                    </View>
                  </>
                )}

                <View style={styles.receiptDivider} />

                <View style={styles.receiptSection}>
                  <Text style={styles.receiptSectionTitle}>Booking Information</Text>
                  {selectedPayment?.booking && (
                    <>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Booking ID</Text>
                        <Text style={styles.receiptValue}>#{selectedPayment.booking.id}</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Booking Date</Text>
                        <Text style={styles.receiptValue}>{formatDate(selectedPayment.booking.date)}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.saveButton, savingReceipt && styles.saveButtonDisabled]}
                onPress={saveReceiptToGallery}
                disabled={savingReceipt}
              >
                {savingReceipt ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <MaterialCommunityIcons name="download" size={20} color="#ffffff" />
                )}
                <Text style={styles.saveButtonText}>
                  {savingReceipt ? 'Saving...' : 'Save Receipt'}
                </Text>
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    color: '#1f2937',
    fontSize: 20,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingBottom: 20,
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentIdSection: {
    flex: 1,
  },
  paymentLabel: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '700',
  },
  paymentDate: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  paymentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '800',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  receiptCard: {
    padding: 20,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  receiptTitle: {
    color: '#1f2937',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  receiptId: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 16,
  },
  receiptSection: {
    marginBottom: 16,
  },
  receiptSectionTitle: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  receiptValue: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '600',
  },
  receiptValueSmall: {
    color: '#1f2937',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  receiptStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receiptStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  saveButton: {
    backgroundColor: '#1e40af',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PaymentHistory;
