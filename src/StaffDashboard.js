import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRequest } from '../api';
import Loading from '../loading/loading';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const StaffDashboard = ({ navigate }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [staffData, setStaffData] = useState(null);
  const [taskStats, setTaskStats] = useState({ pending: 0, inProgress: 0, completed: 0 });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getCurrentDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  useEffect(() => {
    let mounted = true;
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await getRequest('/staff/dashboard');

        if (!response || response.success === false) {
          const message = response?.message || 'Unable to load dashboard';
          throw new Error(message);
        }

        if (mounted) {
          setStaffData(response.data);
          // Simulate task stats (in real app, this would come from API)
          setTaskStats({
            pending: 3,
            inProgress: 2,
            completed: 15,
          });
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || 'Failed to load dashboard');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar hidden={false} barStyle="light-content" backgroundColor="#6366F1" translucent={false} />
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Loading message="Loading dashboard" />
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
              onPress={() => navigate('staffDashboard')}
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
          <View style={styles.headerGlow} />

          <View style={styles.headerContent}>
            <View style={styles.profileContainer}>
              <View style={styles.profileAvatar}>
                <Icon name="person" size={34} color="#FFFFFF" />
              </View>
              <View style={styles.profileText}>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.userName}>
                  {staffData?.staff?.first_name || 'Staff'} {staffData?.staff?.last_name || 'Member'}
                </Text>
                <Text style={styles.roleLabel}>Operations dashboard</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.logoutHeaderButton}
              onPress={() => navigate('login')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <Icon name="logout" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerTop}>
            <View style={styles.dateContainer}>
              <Icon name="calendar-today" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.dateText}>{getCurrentDate()}</Text>
            </View>
          </View>

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrapper}>
              <View style={styles.infoIconBackground}>
                <Icon name="dashboard" size={30} color="#4F46E5" />
              </View>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Staff dashboard</Text>
              <Text style={styles.infoDescription}>
                Manage assigned jobs, monitor progress, request materials, upload completion photos, and review your service history from a single place.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigate('staffTasks')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, styles.blueIcon]}>
                <Icon name="assignment" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionTitle}>My Tasks</Text>
              <Text style={styles.quickActionSubtitle}>Manage assignments</Text>
              <View style={styles.quickActionArrow}>
                <Icon name="arrow-forward" size={18} color="#4F46E5" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigate('staffServiceAssignments')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, styles.greenIcon]}>
                <Icon name="history" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionTitle}>History</Text>
              <Text style={styles.quickActionSubtitle}>View completed</Text>
              <View style={styles.quickActionArrow}>
                <Icon name="arrow-forward" size={18} color="#10B981" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workflow Steps</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>View tasks</Text>
                <Text style={styles.stepDescription}>Check assigned job orders and their live status</Text>
              </View>
              <View style={styles.stepIcon}>
                <Icon name="visibility" size={22} color="#4F46E5" />
              </View>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Request products</Text>
                <Text style={styles.stepDescription}>Submit material requests before the job starts</Text>
              </View>
              <View style={styles.stepIcon}>
                <Icon name="inventory" size={22} color="#3B82F6" />
              </View>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Upload evidence</Text>
                <Text style={styles.stepDescription}>Add completion photos before closing the task</Text>
              </View>
              <View style={styles.stepIcon}>
                <Icon name="photo-camera" size={22} color="#10B981" />
              </View>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Complete task</Text>
                <Text style={styles.stepDescription}>Mark the job complete and keep the service record updated</Text>
              </View>
              <View style={styles.stepIcon}>
                <Icon name="check-circle" size={22} color="#10B981" />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority Notes</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tipItem}>
              <View style={[styles.tipIcon, styles.tipIcon1]}>
                <Icon name="lightbulb" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.tipText}>Always upload a completion photo before marking work as complete.</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipIcon, styles.tipIcon2]}>
                <Icon name="lightbulb" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.tipText}>Return all returnable items before closing the assigned task.</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipIcon, styles.tipIcon3]}>
                <Icon name="lightbulb" size={18} color="#10B981" />
              </View>
              <Text style={styles.tipText}>Track product usage carefully in the history section for accurate reporting.</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F6FF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F6FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F6FF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F3F6FF',
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
    backgroundColor: '#4F46E5',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 28,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 16,
    elevation: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#4F46E5',
    paddingTop: 28,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 12,
    position: 'relative',
  },
  headerGlow: {
    position: 'absolute',
    top: -30,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTop: {
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
    zIndex: 2,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.38)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  profileText: {
    flex: 1,
  },
  greeting: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  roleLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  logoutHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCardBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginHorizontal: 4,
  },
  statCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingIcon: {
    backgroundColor: '#FEF3C7',
  },
  progressIcon: {
    backgroundColor: '#DBEAFE',
  },
  completedIcon: {
    backgroundColor: '#D1FAE5',
  },
  statCardNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginHorizontal: 4,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  blueIcon: {
    backgroundColor: '#4F46E5',
  },
  greenIcon: {
    backgroundColor: '#10B981',
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  quickActionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 12.5,
    color: '#6B7280',
    lineHeight: 18,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  stepConnector: {
    height: 28,
    marginLeft: 21,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityIcon1: {
    backgroundColor: '#D1FAE5',
  },
  activityIcon2: {
    backgroundColor: '#DBEAFE',
  },
  activityIcon3: {
    backgroundColor: '#EDE9FE',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  activityDivider: {
    height: 1,
    backgroundColor: '#EEF2F7',
    marginVertical: 14,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipIcon1: {
    backgroundColor: '#FEF3C7',
  },
  tipIcon2: {
    backgroundColor: '#DBEAFE',
  },
  tipIcon3: {
    backgroundColor: '#D1FAE5',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  infoIconWrapper: {
    marginRight: 18,
  },
  infoIconBackground: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  infoDescription: {
    fontSize: 13.5,
    color: '#6B7280',
    lineHeight: 21,
  },
});

export default StaffDashboard;
