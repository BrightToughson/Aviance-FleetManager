import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Modal, Switch, TouchableOpacity } from 'react-native';
import ResponsiveLineChart from '../../components/ResponsiveLineChart';
import ResponsiveBarChart from '../../components/ResponsiveBarChart';
import { useSearch } from '../../context/SearchContext';
import { Ionicons } from '@expo/vector-icons';

// Mock Data for Gifted Charts
const repairTrendsLine1 = [
  {value: 0, label: 'Dec'}, {value: 80, label: 'Jan'}, {value: 0, label: 'Feb'}, 
  {value: 85, label: 'Mar'}, {value: 80, label: 'Apr'}, {value: 50, label: 'May'}
];
const repairTrendsLine2 = [
  {value: 0}, {value: 90}, {value: 0}, {value: 90}, {value: 85}, {value: 55}
];
const repairTrendsLine3 = [
  {value: 0}, {value: 100}, {value: 0}, {value: 100}, {value: 100}, {value: 65}
];

const timeToResolveData = [
  {value: 15, label: 'Dec'}, {value: 12, label: 'Jan'}, {value: 11, label: 'Feb'},
  {value: 12, label: 'Mar'}, {value: 11, label: 'Apr'}, {value: 28, label: 'May'}
];

const fuelCostsData = [
  {value: 100, label: 'Jan'}, {value: 90, label: 'Feb'}, {value: 85, label: 'Mar'},
  {value: 95, label: 'Apr'}, {value: 105, label: 'May'}, {value: 110, label: 'Jun'}
];

const DashboardCard = ({ children, style }: any) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const { searchQuery } = useSearch();
  const [modalVisible, setModalVisible] = useState(false);
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  
  const isLarge = width >= 1366; 
  const isMedium = width >= 1024;
  const hasSidebar = width >= 768;
  
  const mainWidth = hasSidebar ? width - 280 : width;
  
  const singleColWidth = isLarge ? '31.5%' : isMedium ? '48%' : '100%';
  const doubleColWidth = isLarge ? '65%' : '100%';
  
  const largeChartWidth = isLarge ? (mainWidth * 0.65) - 80 : mainWidth - 80;
  const smallChartWidth = isLarge ? (mainWidth * 0.315) - 80 : isMedium ? (mainWidth * 0.48) - 80 : mainWidth - 80;

  // Define widgets in an array with categories
  const allWidgets = [
    {
      id: 'repair-trends',
      title: 'Repair Priority Class Trends',
      category: 'Maintenance Categorization',
      isLarge: true,
      content: (
        <ResponsiveLineChart
          data={repairTrendsLine1}
          width={largeChartWidth}
          height={280}
          color="#0EA5E9"
        />
      )
    },
    {
      id: 'service-reminders',
      title: 'Service Reminders',
      category: 'Service',
      isLarge: false,
      content: (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#EF4444' }]}>22</Text>
            <Text style={styles.metricLabel}>Overdue</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#F59E0B' }]}>1</Text>
            <Text style={styles.metricLabel}>Due Soon</Text>
          </View>
        </View>
      )
    },
    {
      id: 'time-to-resolve',
      title: 'Time to Resolve',
      category: 'Issues',
      isLarge: false,
      content: (
        <ResponsiveLineChart
          data={timeToResolveData}
          width={smallChartWidth}
          height={160}
          color="#0EA5E9"
        />
      )
    },
    {
      id: 'open-issues',
      title: 'Open Issues',
      category: 'Issues',
      isLarge: false,
      content: (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#F59E0B' }]}>33</Text>
            <Text style={styles.metricLabel}>Open</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#EF4444' }]}>1</Text>
            <Text style={styles.metricLabel}>Overdue</Text>
          </View>
        </View>
      )
    },
    {
      id: 'vehicle-renewal',
      title: 'Vehicle Renewal Reminders',
      category: 'Vehicles',
      isLarge: false,
      content: (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#EF4444' }]}>3</Text>
            <Text style={styles.metricLabel}>Overdue</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#F59E0B' }]}>5</Text>
            <Text style={styles.metricLabel}>Due Soon</Text>
          </View>
        </View>
      )
    },
    {
      id: 'active-work-orders',
      title: 'Active Work Orders',
      category: 'Service',
      isLarge: false,
      content: (
        <>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#0EA5E9' }]} />
              <Text style={styles.listText}>Open</Text>
            </View>
            <View style={styles.badge}><Text style={[styles.badgeText, { color: '#0EA5E9' }]}>26</Text></View>
          </View>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.listText}>Pending</Text>
            </View>
            <View style={styles.badge}><Text style={[styles.badgeText, { color: '#F59E0B' }]}>0</Text></View>
          </View>
        </>
      )
    },
    {
      id: 'contact-renewal',
      title: 'Contact Renewal Reminders',
      category: 'Contacts',
      isLarge: false,
      content: (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#EF4444' }]}>3</Text>
            <Text style={styles.metricLabel}>Overdue</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#F59E0B' }]}>5</Text>
            <Text style={styles.metricLabel}>Due Soon</Text>
          </View>
        </View>
      )
    },
    {
      id: 'vehicle-assignments',
      title: 'Vehicle Assignments',
      category: 'Vehicles',
      isLarge: false,
      content: (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>4</Text>
            <Text style={styles.metricLabel}>Assigned</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#F59E0B' }]}>201</Text>
            <Text style={styles.metricLabel}>Unassigned</Text>
          </View>
        </View>
      )
    },
    {
      id: 'vehicle-status',
      title: 'Vehicle Status',
      category: 'Vehicles',
      isLarge: false,
      content: (
        <>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.listText}>Active</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}><Text style={[styles.badgeText, { color: '#10B981' }]}>183</Text></View>
          </View>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.listText}>Inactive</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}><Text style={[styles.badgeText, { color: '#3B82F6' }]}>1</Text></View>
          </View>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.listText}>In Shop</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.badgeText, { color: '#F59E0B' }]}>3</Text></View>
          </View>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.listText}>Out of Service</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.badgeText, { color: '#EF4444' }]}>16</Text></View>
          </View>
        </>
      )
    },
    {
      id: 'equipment-status',
      title: 'Equipment Status',
      category: 'Equipment',
      isLarge: false,
      content: (
        <>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.listText}>In-Service</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}><Text style={[styles.badgeText, { color: '#10B981' }]}>54</Text></View>
          </View>
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.listText}>Out-of-Service</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.badgeText, { color: '#EF4444' }]}>13</Text></View>
          </View>
        </>
      )
    },
    {
      id: 'vehicle-locations',
      title: 'Vehicle Locations',
      category: 'Vehicles',
      isLarge: false,
      content: (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No Results</Text>
        </View>
      )
    },
    {
      id: 'critical-faults',
      title: 'Critical Faults',
      category: 'Issues',
      isLarge: false,
      content: (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No Results</Text>
        </View>
      )
    },
    {
      id: 'fuel-costs',
      title: 'Fuel Costs',
      category: 'Cost',
      isLarge: false,
      content: (
        <ResponsiveBarChart
          data={fuelCostsData}
          width={smallChartWidth}
          height={140}
          color="#10B981"
        />
      )
    }
  ];

  // Filter widgets based on hidden state and search query
  const filteredWidgets = allWidgets.filter(widget => 
    !hiddenWidgets.includes(widget.id) &&
    widget.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleWidget = (id: string) => {
    if (hiddenWidgets.includes(id)) {
      setHiddenWidgets(prev => prev.filter(wId => wId !== id));
    } else {
      setHiddenWidgets(prev => [...prev, id]);
    }
  };

  // Group widgets by category for the modal
  const groupedWidgets = allWidgets.reduce((acc: any, widget) => {
    if (!acc[widget.category]) acc[widget.category] = [];
    acc[widget.category].push(widget);
    return acc;
  }, {});

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Dashboard</Text>
        <TouchableOpacity style={styles.manageButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="grid-outline" size={16} color="#4B5563" style={{ marginRight: 6 }} />
          <Text style={styles.manageButtonText}>Manage Widgets</Text>
          <Ionicons name="chevron-down" size={16} color="#4B5563" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {filteredWidgets.length === 0 ? (
          <View style={[styles.emptyState, { width: '100%', marginTop: 40 }]}>
            <Text style={{ fontSize: 16, color: '#6B7280' }}>No widgets found matching "{searchQuery}"</Text>
          </View>
        ) : (
          filteredWidgets.map(widget => (
            <DashboardCard 
              key={widget.id} 
              style={{ 
                width: (widget.isLarge && filteredWidgets.length > 1) ? doubleColWidth : singleColWidth, 
                minHeight: widget.isLarge ? 350 : undefined 
              }}
            >
              <Text style={styles.cardTitle}>{widget.title}</Text>
              {widget.content}
            </DashboardCard>
          ))
        )}
      </View>
    </ScrollView>

    <Modal visible={modalVisible} transparent animationType="none">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.dropdownContent}>
          
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={true}>
            {Object.keys(groupedWidgets).map(category => (
              <View key={category} style={styles.categoryGroup}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {groupedWidgets[category].map((widget: any) => {
                  const isVisible = !hiddenWidgets.includes(widget.id);
                  return (
                    <TouchableOpacity 
                      key={widget.id} 
                      style={styles.modalItem}
                      onPress={() => toggleWidget(widget.id)}
                    >
                      <Ionicons 
                        name={isVisible ? "checkbox" : "square-outline"} 
                        size={20} 
                        color={isVisible ? "#0ea5e9" : "#D1D5DB"} 
                        style={{ marginRight: 10 }}
                      />
                      <Text style={styles.modalItemText}>{widget.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  manageButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  manageButtonText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 15 },
  chart: { marginTop: 10, alignSelf: 'center' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 10, paddingBottom: 10 },
  metricItem: { alignItems: 'center' },
  metricValue: { fontSize: 40, fontWeight: '300' },
  metricLabel: { fontSize: 13, color: '#6B7280', marginTop: 5 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  listLeft: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  listText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  badge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 100 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'transparent' },
  dropdownContent: { position: 'absolute', top: 60, right: 20, width: 320, backgroundColor: '#fff', borderRadius: 8, paddingVertical: 15, paddingHorizontal: 20, maxHeight: 500, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  modalList: { flexGrow: 1 },
  categoryGroup: { marginBottom: 15 },
  categoryTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  modalItemText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
});
