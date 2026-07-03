import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRequest, postRequest, putRequest, deleteRequest } from '../api';
import TabBar from './TabBar';

const VehicleCard = ({ vehicle, onEdit, onDelete }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{vehicle.plate_number}</Text>
      <Text style={styles.cardSubtitle}>{vehicle.brand} {vehicle.model}</Text>
    </View>
    <View style={styles.cardRow}>
      <Text style={styles.cardLabel}>Year</Text>
      <Text style={styles.cardValue}>{vehicle.year_model}</Text>
    </View>
    <View style={styles.cardRow}>
      <Text style={styles.cardLabel}>Color</Text>
      <Text style={styles.cardValue}>{vehicle.color}</Text>
    </View>
    <View style={styles.cardActions}>
      <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(vehicle)}>
        <Text style={styles.actionText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(vehicle)}>
        <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const Vehicles = ({ navigate }) => {
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    plate_number: '',
    brand: '',
    model: '',
    year_model: '',
    color: '',
  });
  const [editingVehicle, setEditingVehicle] = useState(null);

  const clearForm = () => {
    setForm({
      plate_number: '',
      brand: '',
      model: '',
      year_model: '',
      color: '',
    });
    setEditingVehicle(null);
  };

  const openModal = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setForm({
        plate_number: vehicle.plate_number,
        brand: vehicle.brand,
        model: vehicle.model,
        year_model: vehicle.year_model,
        color: vehicle.color,
      });
    } else {
      clearForm();
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    clearForm();
  };

  const loadVehicles = async () => {
    setLoading(true);
    const response = await getRequest('/vehicles');
    if (response.success) {
      setVehicles(response.data || []);
    } else {
      Alert.alert('Error', response.message || 'Could not load vehicles');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleSave = async () => {
    if (!form.plate_number || !form.brand || !form.model || !form.year_model || !form.color) {
      Alert.alert('Validation', 'Please fill all fields.');
      return;
    }

    setSaving(true);
    const payload = {
      plate_number: form.plate_number,
      brand: form.brand,
      model: form.model,
      year_model: form.year_model,
      color: form.color,
    };

    let response;
    if (editingVehicle) {
      response = await putRequest(`/vehicles/${editingVehicle.id}`, payload);
    } else {
      response = await postRequest('/vehicles', payload);
    }

    setSaving(false);

    if (response.success) {
      loadVehicles();
      setForm({ plate_number: '', brand: '', model: '', year_model: '', color: '' });
      setEditingVehicle(null);
      Alert.alert('Success', response.message || 'Vehicle saved successfully');
    } else {
      Alert.alert('Error', response.message || 'Unable to save vehicle');
    }
  };

  const handleDelete = (vehicle) => {
    Alert.alert(
      'Delete Vehicle',
      `Delete ${vehicle.plate_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const response = await deleteRequest(`/vehicles/${vehicle.id}`);
            if (response.success) {
              loadVehicles();
            } else {
              Alert.alert('Error', response.message || 'Could not delete vehicle');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (vehicle) => {
    openModal(vehicle);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.contentWrapper, { paddingTop: insets.top + 16 }]}>
          <View style={styles.titleBar}>
            <View>
              <Text style={styles.title}>My Vehicles</Text>
              <Text style={styles.subtitle}>Keep your fleet details clean and updated.</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
              <Text style={styles.addButtonText}>+ Add Vehicle</Text>
            </TouchableOpacity>
          </View>

          <Modal
            visible={modalVisible}
            animationType="slide"
            transparent
            onRequestClose={closeModal}
          >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}</Text>
                  <Text style={styles.modalSubtitle}>Enter vehicle details to keep things current.</Text>
                </View>
                <Pressable style={styles.modalClose} onPress={closeModal}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              <TextInput
                placeholder="Plate Number"
                placeholderTextColor="#d1d5db"
                style={styles.input}
                value={form.plate_number}
                onChangeText={(text) => setForm((prev) => ({ ...prev, plate_number: text }))}
              />
              <TextInput
                placeholder="Brand"
                placeholderTextColor="#d1d5db"
                style={styles.input}
                value={form.brand}
                onChangeText={(text) => setForm((prev) => ({ ...prev, brand: text }))}
              />
              <TextInput
                placeholder="Model"
                placeholderTextColor="#d1d5db"
                style={styles.input}
                value={form.model}
                onChangeText={(text) => setForm((prev) => ({ ...prev, model: text }))}
              />
              <TextInput
                placeholder="Year Model"
                placeholderTextColor="#d1d5db"
                style={styles.input}
                value={form.year_model}
                keyboardType="numeric"
                onChangeText={(text) => setForm((prev) => ({ ...prev, year_model: text }))}
              />
              <TextInput
                placeholder="Color"
                placeholderTextColor="#d1d5db"
                style={styles.input}
                value={form.color}
                onChangeText={(text) => setForm((prev) => ({ ...prev, color: text }))}
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveText}>{saving ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1f2937" />
          </View>
        ) : (
          <FlatList
            data={vehicles}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <VehicleCard vehicle={item} onEdit={handleEdit} onDelete={handleDelete} />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No vehicles added yet. Tap “Add Vehicle” to get started.</Text>
              </View>
            )}
          />
        )}
      </View>
      </View>

      <TabBar activeTab="Car" navigate={navigate} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, backgroundColor: '#ffffff' },
  contentWrapper: { flex: 1, paddingHorizontal: 16, paddingBottom: 90 },
  titleBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { color: '#1f2937', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: '#6b7280', marginTop: 6, fontSize: 14, maxWidth: '65%', fontWeight: '500' },
  addButton: { backgroundColor: '#1e40af', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, shadowColor: '#1e40af', shadowOpacity: 0.24, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 7 },
  addButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', paddingHorizontal: 16 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, shadowColor: '#1e40af', shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#1f2937', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  modalSubtitle: { color: '#6b7280', fontSize: 13, marginTop: 6, maxWidth: '70%', fontWeight: '500' },
  modalClose: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { color: '#1f2937', fontSize: 16, fontWeight: '600' },
  input: { backgroundColor: '#f9fafb', color: '#1f2937', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(30, 64, 175, 0.12)', fontSize: 15, fontWeight: '500' },
  saveButton: { backgroundColor: '#1e40af', paddingVertical: 14, alignItems: 'center', borderRadius: 12, marginTop: 8 },
  saveText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 30 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(30, 64, 175, 0.08)', shadowColor: '#1e40af', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 8 },
  cardHeader: { marginBottom: 10 },
  cardTitle: { color: '#1f2937', fontSize: 16, fontWeight: '700' },
  cardSubtitle: { color: '#6b7280', marginTop: 4, fontSize: 13, fontWeight: '500' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  cardLabel: { color: '#6b7280', fontSize: 13, fontWeight: '500' },
  cardValue: { color: '#1f2937', fontSize: 14, fontWeight: '700' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 8 },
  actionButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: 'rgba(30, 64, 175, 0.12)' },
  actionText: { color: '#1e40af', fontWeight: '700', fontSize: 12 },
  deleteButton: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  deleteText: { color: '#dc2626' },
  emptyState: { marginTop: 40, alignItems: 'center', paddingHorizontal: 20 },
  emptyText: { color: '#9ca3af', fontSize: 15, lineHeight: 22, textAlign: 'center', fontWeight: '500' },
});

export default Vehicles;
