import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView,
  Dimensions,
  Modal,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getToken } from '../api';
import { BASE_URL } from '../api';
import { captureRef } from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const PaymentScreen = ({ navigate, routeParams }) => {
  const insets = useSafeAreaInsets();
  const selectedServices = routeParams?.services || [];
  const selectedDate = routeParams?.date || null;
  const selectedTime = routeParams?.time || null;
  const total = Number(routeParams?.total || 0);

  const [paymentAmountType, setPaymentAmountType] = useState('full');
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [cashBookingData, setCashBookingData] = useState(null);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const receiptRef = useRef(null);

  const amountToPay = Number(
    paymentMethod === 'cash' ? total : (paymentAmountType === 'half' ? (total / 2).toFixed(2) : total.toFixed(2)),
  );

  const handlePayment = async () => {
    if (!paymentMethod) {
      setMessage('Please choose a payment method.');
      return;
    }
    if (!selectedDate || !selectedTime || !selectedServices.length) {
      setMessage('Booking details are missing. Please go back and fill in all details.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const token = await getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Handle cash payment differently
      if (paymentMethod === 'cash') {
        const response = await fetch(`${BASE_URL}/bookings/cash`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            services: selectedServices.map((s) => s.id),
            vehicle_id: routeParams?.vehicle_id ?? null,
            date: selectedDate,
            time: selectedTime,
            total,
            amount: amountToPay,
          }),
        });

        const json = await response.json();
        console.log('cash booking response', json);
        if (!response.ok) {
          const errorMsg = json.message || 'Unable to create cash booking.';
          throw new Error(errorMsg);
        }

        setCashBookingData(json.data);
        setReceiptModalVisible(true);
        setMessage('Cash booking created. Please save the receipt and present it to the cashier.');
      } else {
        // Handle online payments (GCash, Maya)
        const response = await fetch(`${BASE_URL}/payments/paymongo`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            services: selectedServices.map((s) => s.id),
            vehicle_id: routeParams?.vehicle_id ?? null,
            date: selectedDate,
            time: selectedTime,
            total,
            amount: amountToPay,
            payment_method: paymentMethod,
            payment_amount_type: paymentAmountType,
          }),
        });

        const json = await response.json();
        console.log('paymongo init response', json);
        if (!response.ok) {
          const errorMsg = json.message || 'Unable to initialize payment.';
          const errorDetail = json.errors?.[0]?.detail || '';
          throw new Error(errorDetail ? `${errorMsg}: ${errorDetail}` : errorMsg);
        }

        const url = json.data?.source?.attributes?.redirect?.checkout_url
          ?? json.data?.attributes?.redirect?.checkout_url;
        if (!url) {
          throw new Error('Payment link not returned by server.');
        }

        setCheckoutUrl(url);
        setMessage('Payment initialized. Open the checkout link to complete payment.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setMessage(error.message || 'Payment request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckout = async () => {
    if (!checkoutUrl) return;
    try {
      const supported = await Linking.canOpenURL(checkoutUrl);
      if (supported) {
        await Linking.openURL(checkoutUrl);
        return;
      }
    } catch (err) {
      console.warn('canOpenURL failed:', err, checkoutUrl);
    }

    try {
      await Linking.openURL(checkoutUrl);
    } catch (error) {
      console.warn('openURL failed:', error, checkoutUrl);
      Alert.alert(
        'Unable to open link',
        'Your device could not open the payment link. Please copy the URL and open it in your browser.',
      );
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const sdkVersion = Platform.Version;

      if (sdkVersion >= 33) {
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
    if (!receiptRef.current) {
      Alert.alert('Error', 'Unable to capture receipt.');
      return;
    }

    try {
      setSavingReceipt(true);

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Please grant storage permission to save the receipt.');
        setSavingReceipt(false);
        return;
      }

      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      const galleryPath = RNFS.PicturesDirectoryPath + `/cash_receipt_${cashBookingData?.booking?.id}_${Date.now()}.png`;
      await RNFS.copyFile(uri, galleryPath);

      if (Platform.OS === 'android') {
        await RNFS.scanFile(galleryPath);
      }

      Alert.alert('Success', 'Receipt saved to Gallery successfully.');
    } catch (error) {
      console.error('Error saving receipt:', error);
      Alert.alert('Error', `Failed to save receipt: ${error?.message || 'Unknown error'}`);
    } finally {
      setSavingReceipt(false);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.title}>Payment</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate && navigate('booking', routeParams)}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Selected Services</Text>
          <Text style={styles.value}>{selectedServices.map((s) => s.name).join(', ') || 'None selected'}</Text>
          <Text style={styles.label}>Booking Date</Text>
          <Text style={styles.value}>{selectedDate || 'N/A'}</Text>
          <Text style={styles.label}>Time Slot</Text>
          <Text style={styles.value}>{selectedTime || 'N/A'}</Text>
        </View>

        {paymentMethod !== 'cash' && (
          <View style={styles.card}>
            <Text style={styles.label}>Payment Amount</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, paymentAmountType === 'full' && styles.toggleButtonActive]}
                onPress={() => setPaymentAmountType('full')}
              >
                <Text style={[styles.toggleText, paymentAmountType === 'full' && styles.toggleTextActive]}>Pay Full</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, paymentAmountType === 'half' && styles.toggleButtonActive]}
                onPress={() => setPaymentAmountType('half')}
              >
                <Text style={[styles.toggleText, paymentAmountType === 'half' && styles.toggleTextActive]}>Pay 50%</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.amountText}>₱{amountToPay.toFixed(2)}</Text>
          </View>
        )}

        {paymentMethod === 'cash' && (
          <View style={styles.card}>
            <Text style={styles.label}>Payment Amount</Text>
            <Text style={styles.amountText}>₱{amountToPay.toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[styles.methodButton, paymentMethod === 'gcash' && styles.methodButtonSelected]}
              onPress={() => setPaymentMethod('gcash')}
            >
              <Text style={[styles.methodText, paymentMethod === 'gcash' && styles.methodTextSelected]}>GCash</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodButton, paymentMethod === 'maya' && styles.methodButtonSelected]}
              onPress={() => setPaymentMethod('maya')}
            >
              <Text style={[styles.methodText, paymentMethod === 'maya' && styles.methodTextSelected]}>Maya</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodButton, paymentMethod === 'cash' && styles.methodButtonSelected]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Text style={[styles.methodText, paymentMethod === 'cash' && styles.methodTextSelected]}>Cash</Text>
            </TouchableOpacity>
          </View>
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.payButton, (!paymentMethod || submitting) && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={!paymentMethod || submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Start Payment</Text>}
          </TouchableOpacity>

          {checkoutUrl ? (
            <TouchableOpacity style={styles.openButton} onPress={openCheckout}>
              <Text style={styles.openButtonText}>Open Payment Link</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>Note</Text>
          <Text style={styles.noteText}>
            {paymentMethod === 'cash'
              ? 'For cash payments, save the receipt and present it to the cashier to complete your booking.'
              : 'After opening the payment link, complete the payment in your wallet. Your booking will remain pending until payment is processed.'}
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={receiptModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cash Payment Receipt</Text>
              <TouchableOpacity onPress={() => setReceiptModalVisible(false)} style={styles.modalClose}>
                <MaterialCommunityIcons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.receiptCard} ref={receiptRef} collapsable={false}>
                <View style={styles.receiptHeader}>
                  <MaterialCommunityIcons name="receipt" size={32} color="#1e40af" />
                  <Text style={styles.receiptTitle}>Cash Payment Receipt</Text>
                  <Text style={styles.receiptId}>Booking #{cashBookingData?.booking?.id}</Text>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptSection}>
                  <Text style={styles.receiptSectionTitle}>Booking Details</Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Booking ID</Text>
                    <Text style={styles.receiptValue}>#{cashBookingData?.booking?.id}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Date</Text>
                    <Text style={styles.receiptValue}>{formatDate(cashBookingData?.booking?.date)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Time</Text>
                    <Text style={styles.receiptValue}>{selectedTime || 'N/A'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Status</Text>
                    <View style={[styles.receiptStatusBadge, { backgroundColor: '#fef9c3' }]}>
                      <Text style={[styles.receiptStatusText, { color: '#854d0e' }]}>Pending</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptSection}>
                  <Text style={styles.receiptSectionTitle}>Services</Text>
                  {selectedServices.map((service, index) => (
                    <View key={index} style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{service.name}</Text>
                      <Text style={styles.receiptValue}>₱{Number(service.price).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptSection}>
                  <Text style={styles.receiptSectionTitle}>Payment Details</Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Payment Method</Text>
                    <Text style={styles.receiptValue}>Cash</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Total Amount</Text>
                    <Text style={styles.receiptValue}>₱{total.toFixed(2)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Amount to Pay</Text>
                    <Text style={[styles.receiptValue, styles.receiptValueHighlight]}>₱{amountToPay.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptSection}>
                  <Text style={styles.receiptSectionTitle}>Instructions</Text>
                  <Text style={styles.receiptInstructions}>
                    Please present this receipt to the cashier to complete your payment. Your booking will be confirmed after payment is received.
                  </Text>
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
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => {
                  setReceiptModalVisible(false);
                  navigate && navigate('home');
                }}
              >
                <Text style={styles.doneButtonText}>Done</Text>
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
    backgroundColor: '#ebe2d7',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#f6f1ea',
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    minHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#dfcdb3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#2a241f' },
  backButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#efe6dc', borderRadius: 12, borderWidth: 1, borderColor: '#dcc8b0' },
  backText: { color: '#54473d', fontWeight: '700' },
  card: { backgroundColor: '#fffdfb', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e9dcc5', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 5, elevation: 2 },
  label: { color: '#5a4639', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  value: { color: '#2a241f', fontSize: 15, fontWeight: '600', lineHeight: 22 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleButton: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e1d2b9', alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#2d261f', borderColor: '#2d261f', shadowColor: '#2d261f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { color: '#5a4639', fontWeight: '700', fontSize: 14 },
  toggleTextActive: { color: '#ffffff' },
  amountText: { marginTop: 16, fontSize: 26, fontWeight: '800', color: '#2a241f' },
  methodRow: { flexDirection: 'row', gap: 12 },
  methodButton: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e1d2b9', alignItems: 'center' },
  methodButtonSelected: { backgroundColor: '#4d7b5c', borderColor: '#4d7b5c', shadowColor: '#4d7b5c', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  methodText: { color: '#3d3029', fontSize: 15, fontWeight: '700' },
  methodTextSelected: { color: '#ffffff' },
  messageBox: { padding: 16, backgroundColor: '#f2ecff', borderRadius: 16, marginBottom: 18, borderLeftWidth: 4, borderLeftColor: '#8b5cf6' },
  messageText: { color: '#4c1d95', fontSize: 14, fontWeight: '600' },
  actions: { gap: 12 },
  payButton: { backgroundColor: '#2d261f', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#2d261f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  payButtonDisabled: { opacity: 0.5 },
  payButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  openButton: { backgroundColor: '#6d8a6d', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#6d8a6d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  openButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  noteCard: { marginTop: 24, padding: 16, borderRadius: 16, backgroundColor: '#f1e9df', borderLeftWidth: 4, borderLeftColor: '#c59a69' },
  noteLabel: { color: '#2a241f', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  noteText: { color: '#4b5563', fontSize: 14, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { color: '#1f2937', fontSize: 18, fontWeight: '800' },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  modalScroll: { flex: 1 },
  receiptCard: { padding: 20 },
  receiptHeader: { alignItems: 'center', marginBottom: 20 },
  receiptTitle: { color: '#1f2937', fontSize: 20, fontWeight: '800', marginTop: 12 },
  receiptId: { color: '#6b7280', fontSize: 14, marginTop: 4 },
  receiptDivider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 16 },
  receiptSection: { marginBottom: 16 },
  receiptSectionTitle: { color: '#1f2937', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  receiptLabel: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  receiptValue: { color: '#1f2937', fontSize: 14, fontWeight: '600' },
  receiptValueHighlight: { color: '#1e40af', fontSize: 16, fontWeight: '800' },
  receiptStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  receiptStatusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  receiptInstructions: { color: '#4b5563', fontSize: 13, lineHeight: 18 },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 12 },
  saveButton: { backgroundColor: '#1e40af', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  doneButton: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  doneButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});

export default PaymentScreen;
