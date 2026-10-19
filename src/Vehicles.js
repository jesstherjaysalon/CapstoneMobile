import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRequest, postRequest, putRequest, deleteRequest } from '../api';
import TabBar from './TabBar';
import Loading from '../loading/loading';

const VehicleCard = ({ vehicle, onEdit, onDelete }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.vehicleIdentity}>
        <View style={styles.vehicleIcon}>
          <MaterialCommunityIcons name="car-outline" size={22} color="#2563EB" />
        </View>
        <View style={styles.vehicleHeading}>
          <Text style={styles.cardSubtitle}>{vehicle.brand} {vehicle.model}</Text>
          <Text style={styles.cardTitle}>{vehicle.plate_number}</Text>
        </View>
      </View>
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
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.contentWrapper}>
          <View style={styles.titleBar}>
            <View style={styles.titleCopy}>
              <View style={styles.eyebrowRow}>
                <MaterialCommunityIcons name="garage-variant" size={15} color="#C7D2FE" />
                <Text style={styles.eyebrow}>YOUR GARAGE</Text>
              </View>
              <Text style={styles.title}>My Vehicles</Text>
              <Text style={styles.subtitle}>Manage the vehicles you bring in for service.</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
              <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Vehicle</Text>
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
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={form.plate_number}
                onChangeText={(text) => setForm((prev) => ({ ...prev, plate_number: text }))}
              />
              <TextInput
                placeholder="Brand"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={form.brand}
                onChangeText={(text) => setForm((prev) => ({ ...prev, brand: text }))}
              />
              <TextInput
                placeholder="Model"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={form.model}
                onChangeText={(text) => setForm((prev) => ({ ...prev, model: text }))}
              />
              <TextInput
                placeholder="Year Model"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={form.year_model}
                keyboardType="numeric"
                onChangeText={(text) => setForm((prev) => ({ ...prev, year_model: text }))}
              />
              <TextInput
                placeholder="Color"
                placeholderTextColor="#94A3B8"
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
            <Loading message="Loading your vehicles" />
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
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#F5F7FB', width: '100%', maxWidth: 430, alignSelf: 'center' },
  contentWrapper: { flex: 1, paddingHorizontal: 20, paddingBottom: 0 },
  titleCopy: { flex: 1, paddingRight: 8 },
  titleBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: -20, marginTop: 0, marginBottom: 18, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 22, backgroundColor: '#4F46E5', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 9, gap: 6 },
  eyebrow: { color: '#E0E7FF', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontSize: 27, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: '#E0E7FF', marginTop: 6, fontSize: 12, maxWidth: '95%', fontWeight: '500', lineHeight: 18 },
  addButton: { backgroundColor: 'rgba(255,255,255,0.16)', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 13, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.32)', justifyContent: 'center', paddingHorizontal: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12, borderWidth: 1, borderColor: '#E8EDF5' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  modalSubtitle: { color: '#64748B', fontSize: 13, marginTop: 6, maxWidth: '70%', fontWeight: '500' },
  modalClose: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  modalCloseText: { color: '#64748B', fontSize: 16, fontWeight: '600' },
  input: { backgroundColor: '#F8FAFC', color: '#0F172A', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E3EAF4', fontSize: 15, fontWeight: '500' },
  saveButton: { backgroundColor: '#2563EB', paddingVertical: 15, alignItems: 'center', borderRadius: 14, marginTop: 8, shadowColor: '#2563EB', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 30 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#E4EAF4', shadowColor: '#1E293B', shadowOpacity: 0.055, shadowOffset: { width: 0, height: 5 }, shadowRadius: 15, elevation: 3 },
  cardHeader: { marginBottom: 10 },
  vehicleIdentity: { flexDirection: 'row', alignItems: 'center' },
  vehicleIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#E0E7FF' },
  vehicleHeading: { flex: 1 },
  cardTitle: { color: '#2563EB', fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginTop: 4 },
  cardSubtitle: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F4F8' },
  cardLabel: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  cardValue: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 8 },
  actionButton: { minWidth: 78, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#E0E7FF' },
  actionText: { color: '#475569', fontWeight: '700', fontSize: 12 },
  deleteButton: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  deleteText: { color: '#DC2626' },
  emptyState: { marginTop: 40, alignItems: 'center', paddingHorizontal: 20 },
  emptyText: { color: '#94A3B8', fontSize: 15, lineHeight: 22, textAlign: 'center', fontWeight: '500' },
});

export default Vehicles;
