import { Drawer , DrawerContentScrollView, DrawerItemList, DrawerItem } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text, useWindowDimensions, TouchableOpacity, Image, TextInput, LogBox, Platform, Alert, Animated, Pressable } from 'react-native';
import { LanguageSelector } from '../../components/LanguageSelector';
import { supabase } from '../../lib/supabase';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSearch } from '../../context/SearchContext';
import { useAlerts } from '../../context/AlertsContext';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useServices } from '../../context/ServicesContext';
import { useIssues } from '../../context/IssuesContext';
import { useInspections } from '../../context/InspectionContext';
import { useAssignments } from '../../context/AssignmentsContext';
import { useParts } from '../../context/PartsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

LogBox.ignoreLogs(['Unknown event handler property `onPressIn`', 'Unknown event handler property `onPressOut`']);

interface DrawerNavItem {
  name: string;
  route: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface DrawerNavGroup {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: DrawerNavItem[];
}

const AccordionNavGroupItem = ({
  group,
  isOpen,
  onToggle,
  hasActiveChild,
  groupBadgeCount,
  renderSingleItem,
}: {
  group: DrawerNavGroup;
  isOpen: boolean;
  onToggle: () => void;
  hasActiveChild: boolean;
  groupBadgeCount: number;
  renderSingleItem: (item: DrawerNavItem, isChild?: boolean) => React.ReactNode;
}) => {
  const animatedController = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedController, {
      duration: 200,
      toValue: isOpen ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isOpen]);

  const arrowAngle = animatedController.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.groupContainer}>
      <Pressable
        onPress={onToggle}
        style={({ hovered }: any) => [
          styles.drawerTopRow,
          hasActiveChild && styles.groupHeaderActiveChild,
          hovered && !hasActiveChild && styles.drawerRowHovered,
          hovered && hasActiveChild && styles.groupHeaderActiveChildHovered,
          Platform.OS === 'web' && ({
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: hovered ? [{ translateX: 2 }] : [{ translateX: 0 }],
            outline: 'none',
          } as any),
        ]}
      >
        {({ hovered }: any) => {
          const isHighlighted = hasActiveChild;
          const iconColor = isHighlighted ? '#043094' : hovered ? '#0F172A' : '#64748B';
          const chevronColor = isHighlighted ? '#043094' : hovered ? '#0F172A' : '#94A3B8';

          return (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.topIconBox}>
                  <Ionicons
                    name={group.icon}
                    size={20}
                    color={iconColor}
                  />
                </View>
                <Text
                  style={[
                    styles.drawerTopText,
                    isHighlighted && styles.drawerTopTextActiveGroup,
                    hovered && !isHighlighted && { color: '#0F172A' },
                  ]}
                  numberOfLines={1}
                >
                  {group.label}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {groupBadgeCount > 0 && !isOpen && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>
                      {groupBadgeCount > 99 ? '99+' : groupBadgeCount}
                    </Text>
                  </View>
                )}
                <Animated.View style={{ transform: [{ rotate: arrowAngle }] }}>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={chevronColor}
                  />
                </Animated.View>
              </View>
            </>
          );
        }}
      </Pressable>

      {isOpen && (
        <View style={styles.groupItemsWrapper}>
          {group.items.map((item: any) => renderSingleItem(item, true))}
        </View>
      )}
    </View>
  );
};

function CustomDrawerContent(props: any) {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const t = props.t || ((_k: string, fb: string) => fb);
  const counts = props.counts || {};

  const profileName = user?.fullName || 'Manager';
  const profileImage = user?.imageUrl;

  const cleanPath = (pathname || '').replace(/^\/?(\(manager\)\/)?/, '').split('/')[0] || '';

  const drawerRef = useRef<View>(null);

  // Helper to determine which dropdown group contains a given route
  const getGroupForRoute = (route: string): string | null => {
    if (['vehicles', 'drivers', 'equipments', 'assignments'].includes(route)) {
      return 'fleet';
    }
    if (['fuel', 'inspections', 'requests'].includes(route)) {
      return 'driverLogs';
    }
    if (['services', 'issues', 'maintenance', 'maintenance-details', 'parts', 'vendors'].includes(route)) {
      return 'maintenance';
    }
    if (['schedules', 'reminders', 'forms'].includes(route)) {
      return 'planning';
    }
    if (['documents', 'contacts'].includes(route)) {
      return 'resources';
    }
    return null; // Not in any dropdown group (e.g. 'home', 'dashboard', 'reports', 'messages', 'alerts', 'profile')
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const activeKey = getGroupForRoute(cleanPath);
    return {
      fleet: activeKey === 'fleet',
      driverLogs: activeKey === 'driverLogs',
      maintenance: activeKey === 'maintenance',
      planning: activeKey === 'planning',
      resources: activeKey === 'resources',
    };
  });

  // Automatically keep only the dropdown containing the active route open;
  // If the active tab is not in any dropdown (e.g. Home, Dashboard, Reports), close all dropdowns automatically.
  useEffect(() => {
    const activeGroupKey = getGroupForRoute(cleanPath);
    setOpenGroups({
      fleet: activeGroupKey === 'fleet',
      driverLogs: activeGroupKey === 'driverLogs',
      maintenance: activeGroupKey === 'maintenance',
      planning: activeGroupKey === 'planning',
      resources: activeGroupKey === 'resources',
    });
  }, [cleanPath]);

  // When a dropdown is temporarily opened while on another tab and the user clicks outside the drawer on web, close it automatically
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!drawerRef.current) return;
      const domNode = drawerRef.current as unknown as HTMLElement;
      if (domNode && !domNode.contains(e.target as Node)) {
        const activeGroupKey = getGroupForRoute(cleanPath);
        setOpenGroups({
          fleet: activeGroupKey === 'fleet',
          driverLogs: activeGroupKey === 'driverLogs',
          maintenance: activeGroupKey === 'maintenance',
          planning: activeGroupKey === 'planning',
          resources: activeGroupKey === 'resources',
        });
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [cleanPath]);

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const willBeOpen = !prev[key];
      return {
        fleet: key === 'fleet' ? willBeOpen : false,
        driverLogs: key === 'driverLogs' ? willBeOpen : false,
        maintenance: key === 'maintenance' ? willBeOpen : false,
        planning: key === 'planning' ? willBeOpen : false,
        resources: key === 'resources' ? willBeOpen : false,
      };
    });
  };

  const handleNavigate = (route: string) => {
    if (route === 'assignments' && props.markAsSeen && props.pendingAssignments) {
      props.markAsSeen('assignments', props.pendingAssignments.map((a: any) => a.id));
    } else if (route === 'inspections' && props.markAsSeen && props.flaggedInspections) {
      props.markAsSeen('inspections', props.flaggedInspections.map((i: any) => i.id));
    } else if (route === 'services' && props.markAsSeen && props.pendingServices) {
      props.markAsSeen('services', props.pendingServices.map((s: any) => s.id));
    } else if (route === 'issues' && props.markAsSeen && props.openIssues) {
      props.markAsSeen('issues', props.openIssues.map((i: any) => i.id));
    } else if (route === 'parts' && props.markAsSeen && props.lowStockParts) {
      props.markAsSeen('parts', props.lowStockParts.map((p: any) => p.id));
    }

    // Immediately keep only the target route's group open; close all if standalone tab
    const targetGroupKey = getGroupForRoute(route);
    setOpenGroups({
      fleet: targetGroupKey === 'fleet',
      driverLogs: targetGroupKey === 'driverLogs',
      maintenance: targetGroupKey === 'maintenance',
      planning: targetGroupKey === 'planning',
      resources: targetGroupKey === 'resources',
    });

    router.replace(`/(manager)/${route}` as any);
    if (width < 768) {
      props.navigation?.closeDrawer();
    }
  };

  const isRouteActive = (route: string) => cleanPath === route;

  // Navigation definition
  const standaloneTop: DrawerNavItem[] = [
    { name: 'home', route: 'home', label: t('nav_home', 'Home'), icon: 'home-outline' },
    { name: 'dashboard', route: 'dashboard', label: t('nav_dashboard', 'Dashboard'), icon: 'speedometer-outline' },
  ];

  const groups: DrawerNavGroup[] = [
    {
      key: 'fleet',
      label: t('nav_grp_fleet', 'Fleet & Assets'),
      icon: 'car-outline',
      items: [
        { name: 'vehicles', route: 'vehicles', label: t('nav_vehicles', 'Vehicles'), icon: 'car-outline' },
        { name: 'drivers', route: 'drivers', label: t('nav_drivers', 'Drivers'), icon: 'people-outline' },
        { name: 'equipments', route: 'equipments', label: t('nav_equipments', 'Equipments'), icon: 'construct-outline' },
        { name: 'assignments', route: 'assignments', label: t('nav_assignments', 'Assignments'), icon: 'map-outline', badge: counts.pendingAssignmentsCount },
      ],
    },
    {
      key: 'driverLogs',
      label: t('nav_grp_driver_logs', 'Driver Logs'),
      icon: 'clipboard-outline',
      items: [
        { name: 'fuel', route: 'fuel', label: t('nav_fuel', 'Fuel Logs'), icon: 'water-outline' },
        { name: 'inspections', route: 'inspections', label: t('nav_inspections', 'Inspections (DVIR)'), icon: 'clipboard-outline', badge: counts.flaggedInspectionsCount },
        { name: 'requests', route: 'requests', label: t('nav_requests', 'Driver Requests'), icon: 'mail-unread-outline' },
      ],
    },
    {
      key: 'maintenance',
      label: t('nav_grp_maintenance', 'Maintenance'),
      icon: 'build-outline',
      items: [
        { name: 'services', route: 'services', label: t('nav_services', 'Services'), icon: 'build-outline', badge: counts.pendingServicesCount },
        { name: 'issues', route: 'issues', label: t('nav_issues', 'Issues'), icon: 'warning-outline', badge: counts.openIssuesCount },
        { name: 'maintenance', route: 'maintenance', label: t('nav_maintenance', 'Maintenance'), icon: 'hammer-outline' },
        { name: 'parts', route: 'parts', label: t('nav_parts', 'Parts & Inventory'), icon: 'cube-outline', badge: counts.lowStockPartsCount },
        { name: 'vendors', route: 'vendors', label: t('nav_vendors', 'Vendors'), icon: 'storefront-outline' },
      ],
    },
    {
      key: 'planning',
      label: t('nav_grp_planning', 'Planning & Forms'),
      icon: 'calendar-outline',
      items: [
        { name: 'schedules', route: 'schedules', label: t('nav_schedules', 'Schedules'), icon: 'calendar-outline' },
        { name: 'reminders', route: 'reminders', label: t('nav_reminders', 'Reminders'), icon: 'alarm-outline' },
        { name: 'forms', route: 'forms', label: t('nav_forms', 'Custom Forms'), icon: 'document-text-outline' },
      ],
    },
    {
      key: 'resources',
      label: t('nav_grp_resources', 'Docs & Contacts'),
      icon: 'folder-open-outline',
      items: [
        { name: 'documents', route: 'documents', label: t('nav_documents', 'Documents'), icon: 'document-text-outline' },
        { name: 'contacts', route: 'contacts', label: t('nav_contacts', 'Contacts'), icon: 'call-outline' },
      ],
    },
  ];

  const standaloneBottom: DrawerNavItem[] = [
    { name: 'reports', route: 'reports', label: t('nav_reports', 'Reports'), icon: 'bar-chart-outline' },
    { name: 'messages', route: 'messages', label: t('nav_messages', 'Messages'), icon: 'chatbubbles-outline', badge: counts.unreadMessages },
    { name: 'alerts', route: 'alerts', label: t('nav_alerts', 'Alerts'), icon: 'notifications-outline' },
    { name: 'profile', route: 'profile', label: t('nav_profile', 'Profile'), icon: 'person-outline' },
  ];

  const renderSingleItem = (item: DrawerNavItem, isChild = false) => {
    const active = isRouteActive(item.route);

    return (
      <Pressable
        key={item.route}
        onPress={() => handleNavigate(item.route)}
        style={({ hovered }: any) => [
          isChild ? styles.drawerChildRow : styles.drawerTopRow,
          active && (isChild ? styles.drawerChildActive : styles.drawerTopActive),
          hovered && !active && (isChild ? styles.drawerChildHovered : styles.drawerRowHovered),
          Platform.OS === 'web' && ({
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            transform: hovered && !active ? [{ translateX: 2 }] : [{ translateX: 0 }],
            outline: 'none',
          } as any),
        ]}
      >
        {({ hovered }: any) => {
          const iconColor = active
            ? '#FFFFFF'
            : hovered
            ? (isChild ? '#043094' : '#0F172A')
            : (isChild ? '#64748B' : '#64748B');

          return (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={isChild ? styles.childIconBox : styles.topIconBox}>
                  <Ionicons
                    name={item.icon}
                    size={isChild ? 16 : 20}
                    color={iconColor}
                  />
                </View>
                <Text
                  style={[
                    isChild ? styles.drawerChildText : styles.drawerTopText,
                    active && (isChild ? styles.drawerChildTextActive : styles.drawerTopTextActive),
                    hovered && !active && { color: isChild ? '#043094' : '#0F172A' },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>

              {typeof item.badge === 'number' && item.badge > 0 && (
                <View style={[styles.badgePill, active && { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.badgePillText, active && { color: '#043094' }]}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </Text>
                </View>
              )}
            </>
          );
        }}
      </Pressable>
    );
  };

  const renderGroup = (group: DrawerNavGroup) => {
    const isOpen = !!openGroups[group.key];
    const groupBadgeCount = group.items.reduce((acc, curr) => acc + (curr.badge || 0), 0);
    const hasActiveChild = group.items.some(item => isRouteActive(item.route));

    return (
      <AccordionNavGroupItem
        key={group.key}
        group={group}
        isOpen={isOpen}
        onToggle={() => toggleGroup(group.key)}
        hasActiveChild={hasActiveChild}
        groupBadgeCount={groupBadgeCount}
        renderSingleItem={renderSingleItem}
      />
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
      <View ref={drawerRef} style={{ flexGrow: 1 }}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(manager)/profile')}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileCircle} />
            ) : (
              <View style={styles.profileCircle}>
                <Text style={styles.profileText}>
                  {profileName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.emailText} numberOfLines={1}>
            {profileName}
          </Text>
        </View>

        {/* Accordion Navigation Body */}
        <View style={{ flex: 1, paddingHorizontal: 6 }}>
          {/* Top Standalone (Home, Dashboard) */}
          {standaloneTop.map(item => renderSingleItem(item))}

          <View style={styles.menuDivider} />

          {/* Collapsible Groups */}
          {groups.map(group => renderGroup(group))}

          <View style={styles.menuDivider} />

          {/* Bottom Standalone (Reports, Messages, Alerts, Profile) */}
          {standaloneBottom.map(item => renderSingleItem(item))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <LanguageSelector />
          <DrawerItem
            label={props.t ? props.t('sign_out') : 'Sign Out'}
            icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color={color} />}
            onPress={async () => {
              try {
                await signOut();
              } catch (e) {
                console.warn('Sign out error:', e);
              }
              router.replace('/(auth)/sign-in');
            }}
            labelStyle={{ color: '#ef4444' }}
          />
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

const CustomHeader = ({ navigation }: any) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const isMobile = width < 768;
  const isCompactSearch = width < 1024;
  const { searchQuery, setSearchQuery } = useSearch();
  const { unreadCount } = useAlerts();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleHelpPress = () => {
    if (Platform.OS === 'web') {
      window.alert('Help & Support\n\nContact us at support@aviancefleet.com or call 1-800-AVIANCE for assistance.');
    } else {
      Alert.alert('Help & Support', 'Contact us at support@aviancefleet.com or call 1-800-AVIANCE for assistance.');
    }
  };

  return (
    <View style={[styles.customHeaderContainer, { height: 70 }]}>
      {(!isCompactSearch || !showMobileSearch) && (
        <View style={styles.headerLeftArea}>
          {!isLargeScreen && (
            <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={{ marginRight: 15 }}>
              <Ionicons name="menu" size={28} color="#333" />
            </TouchableOpacity>
          )}
          <Image 
            source={require('../../../assets/images/logo/logo.png')} 
            style={{ width: isMobile ? 110 : 140, height: 35, resizeMode: 'contain' }} 
          />
        </View>
      )}

      {(!isCompactSearch || showMobileSearch) && (
        <View style={[styles.searchContainer, isCompactSearch && { marginHorizontal: 0, flex: 1 }]}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput 
            placeholder="Search widgets..." 
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={isCompactSearch && showMobileSearch}
          />
          {isCompactSearch && showMobileSearch && (
            <TouchableOpacity onPress={() => { setShowMobileSearch(false); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {(!isCompactSearch || !showMobileSearch) && (
        <View style={styles.headerRightArea}>
          {isCompactSearch && (
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowMobileSearch(true)}>
              <Ionicons name="search" size={24} color="#4B5563" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(manager)/alerts')}>
            <Ionicons name="notifications-outline" size={24} color="#4B5563" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {!isMobile && (
            <TouchableOpacity style={styles.iconButton} onPress={handleHelpPress}>
              <Ionicons name="help-circle-outline" size={24} color="#4B5563" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(manager)/assignments/new')}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const ToastManager = () => {
  const router = useRouter();
  const { alerts, markAsRead } = useAlerts();
  const [toastMessage, setToastMessage] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const latestTimestampRef = useRef<number>(Date.now());

  useEffect(() => {
    if (alerts && alerts.length > 0) {
      const latestAlert = alerts[0];
      if (latestAlert.timestamp && latestAlert.timestamp.getTime() > latestTimestampRef.current) {
        setToastMessage(latestAlert);
        Animated.sequence([
          Animated.timing(slideAnim, {
            toValue: 40,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.delay(4000),
          Animated.timing(slideAnim, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true
          })
        ]).start();
        latestTimestampRef.current = latestAlert.timestamp.getTime();
      }
    }
  }, [alerts]);

  const handleToastPress = () => {
    if (toastMessage) {
      markAsRead(toastMessage.id);
      
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 200,
        useNativeDriver: true
      }).start();

      switch (toastMessage.type) {
        case 'reminder':
          router.push('/(manager)/reminders');
          break;
        case 'schedule':
          router.push('/(manager)/schedules');
          break;
        case 'assignment':
          router.push('/(manager)/assignments');
          break;
        case 'request':
          router.push('/(manager)/requests');
          break;
        case 'checklist':
          router.push('/(manager)/inspections');
          break;
        case 'system':
          router.push('/(manager)/maintenance');
          break;
        default:
          router.push('/(manager)/alerts');
          break;
      }
    }
  };

  return (
    <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={handleToastPress} activeOpacity={0.8}>
        <View style={styles.toastIcon}>
          <Ionicons name="notifications" size={24} color="#fff" />
        </View>
        <View style={styles.toastContent}>
          <Text style={styles.toastTitle}>{toastMessage?.title}</Text>
          <Text style={styles.toastBody} numberOfLines={2}>{toastMessage?.body}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ManagerLayout() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useUser();

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (user?.id) {
      const fetchUnread = async () => {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);
        setUnreadMessages(count || 0);
      };
      
      fetchUnread();

      const channel = supabase
        .channel('public:messages:badge')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`
          }, () => {
            fetchUnread();
          })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);
  const { services } = useServices();
  const pendingServices = services.filter(s => s.status === 'Pending Approval');

  const { issues } = useIssues();
  const openIssues = issues.filter(i => i.status === 'Open');

  const { inspections } = useInspections();
  const flaggedInspections = inspections.filter(i => i.status === 'Flagged' || i.status === 'Failed');

  const { assignments } = useAssignments();
  const pendingAssignments = assignments.filter(a => a.status === 'Pending');

  const { parts } = useParts();
  const lowStockParts = parts.filter(p => p.qty <= p.reorder);

  const [seenIds, setSeenIds] = useState<{ services: string[], issues: string[], inspections: string[], assignments: string[], parts: string[] }>({
    services: [],
    issues: [],
    inspections: [],
    assignments: [],
    parts: []
  });

  useEffect(() => {
    AsyncStorage.getItem('manager_seen_ids').then(data => {
      if (data) {
        try {
          setSeenIds(JSON.parse(data));
        } catch (e) {}
      }
    });
  }, []);

  const markAsSeen = (category: 'services' | 'issues' | 'inspections' | 'assignments' | 'parts', ids: string[]) => {
    setSeenIds(prev => {
      const newIds = ids.filter(id => !prev[category].includes(id));
      if (newIds.length === 0) return prev;
      const newState = { ...prev, [category]: [...prev[category], ...newIds] };
      AsyncStorage.setItem('manager_seen_ids', JSON.stringify(newState)).catch(() => {});
      return newState;
    });
  };

  const pendingServicesCount = pendingServices.filter(s => !seenIds.services.includes(s.id)).length;
  const openIssuesCount = openIssues.filter(i => !seenIds.issues.includes(i.id)).length;
  const flaggedInspectionsCount = flaggedInspections.filter(i => !seenIds.inspections.includes(i.id)).length;
  const pendingAssignmentsCount = pendingAssignments.filter(a => !seenIds.assignments.includes(a.id)).length;
  const lowStockPartsCount = lowStockParts.filter(p => !seenIds.parts.includes(p.id)).length;

  const DrawerIconWithBadge = ({ iconName, size, color, count }: { iconName: any, size: number, color: any, count: number }) => (
    <View style={{ width: size, height: size }}>
      <Ionicons name={iconName} size={size} color={color} />
      {count > 0 && (
        <View style={{
          position: 'absolute',
          top: -4,
          right: -8,
          backgroundColor: '#EF4444',
          borderRadius: 10,
          minWidth: 16,
          height: 16,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 4,
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </View>
  );

  return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer
          backBehavior="history"
          drawerContent={(props) => (
            <CustomDrawerContent
              {...props}
              t={t}
              counts={{
                pendingServicesCount,
                openIssuesCount,
                flaggedInspectionsCount,
                pendingAssignmentsCount,
                lowStockPartsCount,
                unreadMessages,
              }}
              markAsSeen={markAsSeen}
              flaggedInspections={flaggedInspections}
              pendingServices={pendingServices}
              openIssues={openIssues}
              pendingAssignments={pendingAssignments}
              lowStockParts={lowStockParts}
            />
          )}
        screenOptions={({ navigation }) => ({
          drawerType: isLargeScreen ? 'permanent' : 'front',
          drawerStyle: isLargeScreen ? { width: 280 } : undefined,
          drawerActiveBackgroundColor: '#043094',
          drawerActiveTintColor: '#fff',
          drawerInactiveTintColor: '#333',
          header: (props) => <CustomHeader {...props} />
        })}
      >
        <Drawer.Screen
          name="home"
          options={{
            drawerLabel: t('nav_home', 'Home'),
            title: t('nav_home', 'Home'),
            drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="dashboard"
          options={{
            drawerLabel: t('nav_dashboard', 'Dashboard'),
            title: t('nav_dashboard', 'Dashboard'),
            drawerIcon: ({ color, size }) => <Ionicons name="speedometer-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="vehicles"
          options={{
            drawerLabel: t('nav_vehicles', 'Vehicles'),
            title: t('nav_vehicles', 'Vehicles'),
            drawerIcon: ({ color, size }) => <Ionicons name="car-outline" size={size} color={color} />,
          }}
          listeners={{
            drawerItemPress: (e) => {
              e.preventDefault();
              router.replace('/(manager)/vehicles' as any);
            }
          }}
        />
        <Drawer.Screen
          name="drivers"
          options={{
            drawerLabel: t('nav_drivers', 'Drivers'),
            title: t('nav_drivers', 'Drivers'),
            drawerIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="assignments"
          options={{
            drawerLabel: t('nav_assignments', 'Assignments'),
            title: t('nav_assignments', 'Assignments'),
            drawerIcon: ({ color, size }) => <DrawerIconWithBadge iconName="map-outline" size={size} color={color} count={pendingAssignmentsCount} />,
          }}
          listeners={{
            drawerItemPress: (e) => {
              e.preventDefault();
              markAsSeen('assignments', pendingAssignments.map(a => a.id));
              router.replace('/(manager)/assignments' as any);
            }
          }}
        />
        <Drawer.Screen
          name="equipments"
          options={{
            drawerLabel: t('nav_equipments', 'Equipments'),
            title: t('nav_equipments', 'Equipments'),
            drawerIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="inspections"
          options={{
            drawerLabel: t('nav_inspections', 'Inspections'),
            title: t('nav_inspections', 'Inspections'),
            drawerIcon: ({ color, size }) => <DrawerIconWithBadge iconName="clipboard-outline" size={size} color={color} count={flaggedInspectionsCount} />,
          }}
          listeners={{
            focus: () => markAsSeen('inspections', flaggedInspections.map(i => i.id))
          }}
        />
        <Drawer.Screen
          name="fuel"
          options={{
            drawerLabel: t('nav_fuel', 'Fuel Logs'),
            title: t('nav_fuel', 'Fuel Logs'),
            drawerIcon: ({ color, size }) => <Ionicons name="water-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="services"
          options={{
            drawerLabel: t('nav_services', 'Services'),
            title: t('nav_services', 'Services'),
            drawerIcon: ({ color, size }) => <DrawerIconWithBadge iconName="build-outline" size={size} color={color} count={pendingServicesCount} />,
          }}
          listeners={{
            focus: () => markAsSeen('services', pendingServices.map(s => s.id))
          }}
        />
        <Drawer.Screen
          name="issues"
          options={{
            drawerLabel: t('nav_issues', 'Issues'),
            title: t('nav_issues', 'Issues'),
            drawerIcon: ({ color, size }) => <DrawerIconWithBadge iconName="warning-outline" size={size} color={color} count={openIssuesCount} />,
          }}
          listeners={{
            focus: () => markAsSeen('issues', openIssues.map(i => i.id))
          }}
        />
        <Drawer.Screen
          name="maintenance"
          options={{
            drawerLabel: t('nav_maintenance', 'Maintenance'),
            title: t('nav_maintenance', 'Maintenance'),
            drawerIcon: ({ color, size }) => <Ionicons name="build-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="reminders"
          options={{
            drawerLabel: t('nav_reminders', 'Reminders'),
            title: t('nav_reminders', 'Reminders'),
            drawerIcon: ({ color, size }) => <Ionicons name="alarm-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="requests"
          options={{
            drawerLabel: t('nav_requests', 'Driver Requests'),
            title: t('nav_requests', 'Driver Requests'),
            drawerIcon: ({ color, size }) => <Ionicons name="mail-unread-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="schedules"
          options={{
            drawerLabel: t('nav_schedules', 'Schedules'),
            title: t('nav_schedules', 'Schedules'),
            drawerIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="parts"
          options={{
            drawerLabel: t('nav_parts', 'Parts & Inventory'),
            title: t('nav_parts', 'Parts & Inventory'),
            drawerIcon: ({ color, size }) => <DrawerIconWithBadge iconName="cube-outline" size={size} color={color} count={lowStockPartsCount} />,
          }}
          listeners={{
            focus: () => markAsSeen('parts', lowStockParts.map(p => p.id))
          }}
        />
        <Drawer.Screen
          name="vendors"
          options={{
            drawerLabel: t('nav_vendors', 'Vendors'),
            title: t('nav_vendors', 'Vendors'),
            drawerIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="documents"
          options={{
            drawerLabel: t('nav_documents', 'Documents'),
            title: t('nav_documents', 'Documents'),
            drawerIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="contacts"
          options={{
            drawerLabel: t('nav_contacts', 'Contacts'),
            title: t('nav_contacts', 'Contacts'),
            drawerIcon: ({ color, size }) => <Ionicons name="call-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="alerts"
          options={{
            drawerLabel: t('nav_alerts', 'Alerts'),
            title: t('nav_alerts', 'Alerts'),
            drawerIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="reports"
          options={{
            drawerLabel: t('nav_reports', 'Reports'),
            title: t('nav_reports', 'Reports'),
            drawerIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: t('nav_profile', 'Profile'),
            title: t('nav_profile', 'Profile'),
            drawerIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="messages"
          options={{
            drawerLabel: ({ color }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, marginRight: -16 }}>
                <Text style={{ color, fontWeight: '500' }}>{t('nav_messages', 'Messages')}</Text>
                {unreadMessages > 0 && (
                  <View style={{ backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 22, alignItems: 'center', marginRight: 16 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{unreadMessages}</Text>
                  </View>
                )}
              </View>
            ),
            title: t('nav_messages', 'Messages'),
            drawerIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="forms"
          options={{
            drawerLabel: t('nav_forms', 'Custom Forms'),
            title: t('nav_forms', 'Custom Forms'),
            drawerIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="maintenance-details"
          options={{
            drawerItemStyle: { display: 'none' },
            headerShown: false
          }}
        />
        <Drawer.Screen
          name="messages/[id]"
          options={{
            drawerItemStyle: { display: 'none' },
            headerShown: false
          }}
        />
      </Drawer>
      <ToastManager />
      </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
    alignItems: 'center',
  },
  profileCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#043094',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  emailText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  footer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  customHeaderContainer: {
    height: 70,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeftArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    flex: 1,
    marginHorizontal: 20,
    maxWidth: 600,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#111827',
    outlineStyle: 'none',
  } as any,
  headerRightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconButton: {
    marginLeft: 20,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  addButton: {
    marginLeft: 20,
    backgroundColor: '#043094',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -175,
    width: 350,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 9999,
  },
  toastIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#043094',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  toastBody: {
    fontSize: 14,
    color: '#4B5563',
  },
  // Top-level Navigation Rows (Unified for direct items & dropdown headers)
  drawerTopRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 1.5,
  },
  drawerTopActive: {
    backgroundColor: '#043094',
    shadowColor: '#043094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  drawerRowHovered: {
    backgroundColor: '#F1F5F9',
  },
  topIconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'transparent',
  },
  drawerTopText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: -0.1,
  },
  drawerTopTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  drawerTopTextActiveGroup: {
    color: '#043094',
    fontWeight: '600',
  },
  groupContainer: {
    marginVertical: 1.5,
  },
  groupHeaderActiveChild: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  groupHeaderActiveChildHovered: {
    backgroundColor: '#E0E7FF',
  },

  // Sub-items (Child rows nested inside open dropdowns)
  groupItemsWrapper: {
    marginLeft: 23,
    paddingLeft: 10,
    borderLeftWidth: 1.5,
    borderLeftColor: '#E2E8F0',
    marginTop: 2,
    marginBottom: 4,
  },
  drawerChildRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginVertical: 1,
  },
  drawerChildActive: {
    backgroundColor: '#043094',
  },
  drawerChildHovered: {
    backgroundColor: '#F1F5F9',
  },
  childIconBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  drawerChildText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: -0.1,
  },
  drawerChildTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Badges & Dividers
  badgePill: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
    marginHorizontal: 8,
  },
});
