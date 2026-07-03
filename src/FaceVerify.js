
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { postRequest } from '../api';

const FaceVerifyScreen = ({ user, onVerified, onCancel }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedAsset, setCapturedAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [pickerMissing, setPickerMissing] = useState(false);
  const [cameraPromptVisible, setCameraPromptVisible] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState('idle'); // idle, scanning, matched, failed

  const loadImagePicker = () => {
    try {
      return require('react-native-image-picker');
    } catch (error) {
      console.warn('react-native-image-picker is not installed.', error);
      setPickerMissing(true);
      return null;
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera permission',
            message: 'This app needs access to your camera for face verification.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Camera permission error:', err);
        return false;
      }
    }

    return true;
  };

  useEffect(() => {
    setMessage('Position your face in the center. Auto-capture will begin in 3 seconds.');
    setMessageType('info');
  }, []);

  const capturePhoto = async () => {
    if (pickerMissing) {
      setMessage('Camera module is not installed. Run npm install react-native-image-picker and rebuild the app.');
      setMessageType('error');
      return;
    }

    setCameraPromptVisible(true);
  };

  const confirmCapture = async () => {
    setCameraPromptVisible(false);
    setMessage('Opening the camera...');
    setMessageType('info');

    const permissionGranted = await requestCameraPermission();
    if (!permissionGranted) {
      setMessage('Camera permission denied. Please allow camera access in your device settings.');
      setMessageType('error');
      return;
    }

    const imagePicker = await loadImagePicker();
    if (!imagePicker) {
      setMessage('Camera module is not installed. Run npm install react-native-image-picker and rebuild the app.');
      setMessageType('error');
      return;
    }

    try {
      const result = await imagePicker.launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel) {
        setMessage('Camera cancelled.');
        setMessageType('error');
        return;
      }

      if (result.errorCode) {
        setMessage(result.errorMessage || 'Unable to open camera.');
        setMessageType('error');
        return;
      }

      const asset = result.assets?.[0];
      const previewUri = asset?.uri || asset?.originalPath;
      if (!previewUri) {
        setMessage('No photo captured. Please try again.');
        setMessageType('error');
        return;
      }

      setCapturedImage(previewUri);
      setCapturedAsset(asset);
      setMessage('Face captured. Ready to verify.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message || 'Unable to access your camera.');
      setMessageType('error');
    }
  };

  const verifyFace = async () => {
    if (!capturedImage || !capturedAsset) {
      setMessage('Capture your face first.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('Matching face...');
    setMessageType('info');
    setVerificationStatus('scanning');
    setConfidence(0);

    // Simulate confidence progression for visual effect
    const confidenceInterval = setInterval(() => {
      setConfidence(prev => {
        if (prev >= 85) {
          clearInterval(confidenceInterval);
          return prev;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 300);

    try {
      console.log('verifyFace - capturedAsset:', capturedAsset);

      // Normalize URI for Android. Prefer fileCopyUri, then uri, then originalPath.
      const rawUri = capturedAsset.fileCopyUri || capturedAsset.uri || capturedAsset.originalPath || '';
      const uri = Platform.OS === 'android'
        ? rawUri
        : rawUri.replace('file://', '');
      console.log('verifyFace - upload URI:', uri);
      if (!uri) {
        setMessage('Unable to resolve captured image path. Please retake your selfie.');
        setMessageType('error');
        return;
      }

      const formData = new FormData();
      formData.append('face_image', {
        uri,
        name: capturedAsset.fileName || 'face.jpg',
        type: capturedAsset.type || 'image/jpeg',
      });
      formData.append('user_id', user?.id);
      formData.append('expires_at', user?.face_verification_expires_at || new Date(Date.now() + 5 * 60 * 1000).toISOString());

      const response = await postRequest('/customer/face/verify', formData);

      clearInterval(confidenceInterval);
      
      const actualConfidence = response?.confidence ?? (response?.score ? response.score * 100 : 0) ?? 0;
      setConfidence(isNaN(actualConfidence) ? 0 : actualConfidence);

      if (response?.verified) {
        setVerificationStatus('matched');
        setMessage('Identity Verified');
        setMessageType('success');
        setConfidence(100); // Show 100% when verified
        
        // Auto-login after short delay
        setTimeout(() => {
          onVerified?.();
        }, 1500);
        return;
      } else {
        const backendMessage = response?.message?.trim();
        const statusCode = response?.status;

        if (statusCode === 401) {
          setMessage('Face verification failed: unauthorized. Please sign in again.');
        } else if (statusCode === 403) {
          setMessage('Face verification failed: access denied. Please contact support.');
        } else if (statusCode === 404) {
          setMessage('Face verification failed: endpoint not found. Please update the app or try later.');
        } else if (statusCode === 500) {
          setMessage('Face verification failed: server error. Please try again later.');
        } else if (backendMessage?.includes('blurry')) {
          setMessage('Captured image is too blurry. Please retake with a sharper photo.');
        } else if (backendMessage?.includes('No face detected')) {
          setMessage('No face detected. Please ensure your face is fully visible and try again.');
        } else if (backendMessage?.includes('Multiple faces detected')) {
          setMessage('Multiple faces detected. Please retake with only one person visible.');
        } else if (backendMessage?.includes('Face is too small')) {
          setMessage('Face is too small in the frame. Please move closer to the camera.');
        } else if (backendMessage?.includes('Face not recognized')) {
          setMessage('Face not recognized. Please try again with a clear, front-facing selfie.');
        } else {
          setMessage(backendMessage || 'Face verification failed. Please try again.');
        }

        setVerificationStatus('failed');
        setMessageType('error');
      }
    } catch (error) {
      clearInterval(confidenceInterval);
      setVerificationStatus('failed');
      const networkMessage = error?.message === 'Network request failed'
        ? 'Unable to connect to the verification server. Please check your internet connection.'
        : error?.message || 'Verification failed. Please check your connection and try again.';
      setMessage(networkMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundCircles}>
        <View style={styles.circleLarge} />
        <View style={styles.circleSmall} />
        <View style={styles.circleAccent} />
      </View>
      <View style={styles.container}>
        <Text style={styles.title}>Face Verification</Text>
        <Text style={styles.subtitle}>Secure your login using the same verification method as the web.</Text>

        <View style={styles.previewContainer}>
          {capturedImage ? (
            <>
              <Image source={{ uri: capturedImage }} style={styles.preview} />
              
              {/* Scanning overlay */}
              {verificationStatus === 'scanning' && (
                <View style={styles.overlay}>
                  <ActivityIndicator size="large" color="#2563EB" />
                </View>
              )}

              {/* Success overlay */}
              {verificationStatus === 'matched' && (
                <View style={[styles.overlay, styles.successOverlay]}>
                  <Text style={styles.overlayIcon}>✓</Text>
                </View>
              )}

              {/* Failure overlay */}
              {verificationStatus === 'failed' && (
                <View style={[styles.overlay, styles.failureOverlay]}>
                  <Text style={styles.overlayIcon}>✕</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>No face captured yet</Text>
            </View>
          )}
        </View>

        {message ? (
          <Text style={[
            styles.message, 
            verificationStatus === 'matched' ? styles.successText :
            verificationStatus === 'failed' ? styles.errorText :
            messageType === 'error' ? styles.errorText : styles.successText
          ]}>
            {message}
          </Text>
        ) : null}

        {/* Confidence Indicator */}
        {(verificationStatus === 'scanning' || verificationStatus === 'matched' || verificationStatus === 'failed') && (
          <View style={styles.confidenceContainer}>
            <View style={styles.confidenceHeader}>
              <Text style={styles.confidenceLabel}>Match Confidence</Text>
              <Text style={[
                styles.confidenceValue,
                confidence >= 50 ? styles.confidenceHigh :
                confidence >= 30 ? styles.confidenceMedium :
                styles.confidenceLow
              ]}>
                {Math.round(confidence)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  confidence >= 50 ? styles.progressGreen :
                  confidence >= 30 ? styles.progressYellow :
                  styles.progressRed
                ]}
                style={{ width: `${Math.min(confidence, 100)}%` }}
              />
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={styles.captureButton} 
          onPress={capturePhoto} 
          disabled={loading || verificationStatus === 'matched'}
        >
          <Text style={styles.buttonText}>{loading ? 'Scanning...' : 'Capture now'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.verifyButton} 
          onPress={verifyFace} 
          disabled={loading || !capturedImage || verificationStatus === 'matched'}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify face</Text>}
        </TouchableOpacity>

        <Modal
          visible={cameraPromptVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCameraPromptVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Allow Camera Access</Text>
              <Text style={styles.modalBody}>
                This app needs permission to use your camera for face verification. Tap Allow to continue.
              </Text>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalButtonCancel} onPress={() => setCameraPromptVisible(false)}>
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalButtonAllow} onPress={confirmCapture}>
                  <Text style={styles.modalButtonAllowText}>Allow</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={onCancel} 
          disabled={loading || verificationStatus === 'matched'}
        >
          <Text style={styles.cancelText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backgroundCircles: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 0,
  },
  circleLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    top: -80,
    right: -70,
  },
  circleSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    top: 100,
    left: -60,
  },
  circleAccent: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(37, 99, 235, 0.04)',
    bottom: -60,
    right: -50,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    zIndex: 2,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 18,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 420,
  },
  previewContainer: {
    width: '100%',
    maxWidth: 420,
    height: 320,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#2563eb',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 4,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#6B7280',
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successOverlay: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  failureOverlay: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  overlayIcon: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  confidenceContainer: {
    width: '100%',
    maxWidth: 420,
    marginBottom: 18,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  confidenceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  confidenceHigh: {
    color: '#16A34A',
  },
  confidenceMedium: {
    color: '#CA8A04',
  },
  confidenceLow: {
    color: '#DC2626',
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressGreen: {
    backgroundColor: '#22C55E',
  },
  progressYellow: {
    backgroundColor: '#EAB308',
  },
  progressRed: {
    backgroundColor: '#EF4444',
  },
  message: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
    maxWidth: 420,
  },
  successText: {
    color: '#15803D',
  },
  errorText: {
    color: '#B91C1C',
  },
  captureButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#2563eb',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 6,
  },
  verifyButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 5,
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 14,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 18,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 10,
  },
  modalButtonCancelText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonAllow: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  modalButtonAllowText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FaceVerifyScreen;
