import React, { useMemo, useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Platform, 
  useWindowDimensions, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useReports } from '../../../context/ReportsContext';
import { VehicleContext } from '../../../context/VehicleContext';
import { exportReport, buildReportExportData } from '../../../lib/exportReport';

export default function ReportDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { reports, deleteReport, updateLastRun } = useReports();
  const vehicleContext = useContext(VehicleContext);
  const vehicles = vehicleContext?.vehicles || [];

  const report = useMemo(() => reports.find(r => r.id === id), [reports, id]);

  const [isExporting, setIsExporting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const exportData = useMemo(() => {
    if (!report) return null;
    return buildReportExportData(report, vehicles);
  }, [report, vehicles]);

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Report configuration not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    const confirmDelete = () => {
      deleteReport(report.id);
      if (Platform.OS === 'web') window.alert('Report configuration deleted');
      router.replace('/(manager)/reports' as any);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this report configuration?')) confirmDelete();
    } else {
      Alert.alert('Delete Report', 'Are you sure you want to delete this report configuration?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
    }
  };

  const handleExport = async (formatOverride?: string) => {
    if (!exportData) return;
    const targetFmt = formatOverride || report.format || 'PDF';

    try {
      setIsExporting(true);
      const res = await exportReport(exportData, targetFmt);
      await updateLastRun(report.id);

      const msg = targetFmt.toUpperCase() === 'PDF'
        ? 'Print & Save-as-PDF dialog opened.'
        : `Successfully downloaded ${res.filename || targetFmt + ' file'}.`;
      
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err: any) {
      console.error('Export error:', err);
      const errMsg = 'Export failed: ' + (err.message || String(err));
      if (Platform.OS === 'web') window.alert(errMsg);
      else Alert.alert('Export Error', errMsg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRunNow = async () => {
    try {
      setIsRunning(true);
      await updateLastRun(report.id);
      setStatusMessage('Report data refreshed and executed successfully.');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      console.error('Error refreshing report:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Status banner */}
      {statusMessage && (
        <View style={styles.statusBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#059669" />
          <Text style={styles.statusBannerText}>{statusMessage}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 260 }}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>{report.name}</Text>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{report.category}</Text>
              <Text style={styles.scheduleText}>• {report.schedule} Schedule</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={17} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete Config</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.downloadBtn, isExporting && { opacity: 0.8 }]} 
            onPress={() => handleExport()}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="download" size={18} color="#fff" />
            )}
            <Text style={styles.downloadBtnText}>
              {isExporting ? 'Exporting...' : `Export ${report.format || 'PDF'}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Format Actions Bar */}
      <View style={styles.formatBar}>
        <Text style={styles.formatBarLabel}>Quick Export Formats:</Text>
        <View style={styles.formatOptions}>
          <TouchableOpacity 
            style={[styles.formatChip, { borderColor: '#EF4444' }]} 
            onPress={() => handleExport('PDF')}
            disabled={isExporting}
          >
            <Ionicons name="document-text" size={15} color="#EF4444" />
            <Text style={[styles.formatChipText, { color: '#B91C1C' }]}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.formatChip, { borderColor: '#10B981' }]} 
            onPress={() => handleExport('Excel')}
            disabled={isExporting}
          >
            <Ionicons name="grid" size={15} color="#10B981" />
            <Text style={[styles.formatChipText, { color: '#047857' }]}>Excel (.xls)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.formatChip, { borderColor: '#3B82F6' }]} 
            onPress={() => handleExport('CSV')}
            disabled={isExporting}
          >
            <Ionicons name="list" size={15} color="#3B82F6" />
            <Text style={[styles.formatChipText, { color: '#1D4ED8' }]}>CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.formatChip, { borderColor: '#8B5CF6' }]} 
            onPress={() => handleExport('JSON')}
            disabled={isExporting}
          >
            <Ionicons name="code-slash" size={15} color="#8B5CF6" />
            <Text style={[styles.formatChipText, { color: '#6D28D9' }]}>JSON</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main 2-Column Layout */}
      <View style={[styles.mainGrid, isMobile && styles.mainGridMobile]}>
        
        {/* Left Column: Report Details & Config */}
        <View style={styles.leftCol}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Report Configuration</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>Schedule</Text>
              <Text style={styles.value}>{report.schedule}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Last Run</Text>
              <Text style={[styles.value, report.lastRun !== 'Never' && { color: '#059669' }]}>
                {report.lastRun}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.label}>Default Format</Text>
              <Text style={styles.value}>{report.format}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Scope</Text>
              <Text style={styles.value}>{exportData?.scope || 'All Fleet'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Timeframe</Text>
              <Text style={styles.value}>{exportData?.dateRange || 'Last 30 Days'}</Text>
            </View>

            {report.description ? (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.notesText}>{report.description}</Text>
              </View>
            ) : null}

            {report.filters?.metrics && report.filters.metrics.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Included Metrics</Text>
                <View style={styles.metricTagsWrap}>
                  {report.filters.metrics.map((m, idx) => (
                    <View key={idx} style={styles.metricTag}>
                      <Ionicons name="checkmark-circle" size={13} color="#043094" />
                      <Text style={styles.metricTagText}>{m}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={styles.divider} />
            <TouchableOpacity 
              style={styles.fullExportBtn} 
              onPress={() => handleExport(report.format)}
              disabled={isExporting}
            >
              <Ionicons name="print-outline" size={18} color="#043094" />
              <Text style={styles.fullExportBtnText}>Generate Official Letterhead Report</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Column: Live Data View */}
        <View style={[styles.rightCol, { flex: 2 }]}>
          <View style={[styles.card, { flex: 1 }]}>
            
            <View style={styles.cardHeaderRow}>
              <div>
                <Text style={styles.sectionTitle}>Latest Fleet Data View</Text>
                <Text style={styles.sectionSub}>Live audit data computed across active fleet assets</Text>
              </div>

              <TouchableOpacity 
                style={[styles.refreshBtn, isRunning && { opacity: 0.6 }]} 
                onPress={handleRunNow}
                disabled={isRunning}
              >
                {isRunning ? (
                  <ActivityIndicator size="small" color="#043094" style={{ marginRight: 4 }} />
                ) : (
                  <Ionicons name="refresh" size={16} color="#043094" />
                )}
                <Text style={styles.refreshBtnText}>{isRunning ? 'Running...' : 'Run Now'}</Text>
              </TouchableOpacity>
            </View>

            {/* KPI Cards Strip */}
            {exportData?.kpis && exportData.kpis.length > 0 && (
              <View style={styles.kpiGrid}>
                {exportData.kpis.map((kpi, idx) => (
                  <View key={idx} style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>{kpi.label}</Text>
                    <Text style={styles.kpiValue}>{kpi.value}</Text>
                    {kpi.change && <Text style={styles.kpiChange}>{kpi.change}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Data Table */}
            <View style={styles.tableCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={{ minWidth: 620 }}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { width: 170 }]}>Vehicle Asset</Text>
                    <Text style={[styles.th, { width: 110 }]}>Plate</Text>
                    <Text style={[styles.th, { width: 95 }]}>Status</Text>
                    {exportData?.columns.map((col, idx) => (
                      <Text key={idx} style={[styles.th, styles.thRight, { width: 135 }]}>{col}</Text>
                    ))}
                  </View>

                  {exportData?.rows.map((row, idx) => (
                    <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                      <View style={{ width: 170, paddingRight: 8 }}>
                        <Text style={styles.vehicleName} numberOfLines={1}>{row.vehicleName}</Text>
                      </View>
                      <View style={{ width: 110 }}>
                        <View style={styles.plateBadge}>
                          <Text style={styles.plateText}>{row.plate}</Text>
                        </View>
                      </View>
                      <View style={{ width: 95 }}>
                        <View style={[
                          styles.statusBadge, 
                          row.status.toLowerCase().includes('in shop') 
                            ? styles.statusInShop 
                            : row.status.toLowerCase().includes('out') 
                            ? styles.statusOut 
                            : styles.statusActive
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            row.status.toLowerCase().includes('in shop') 
                              ? { color: '#B45309' } 
                              : row.status.toLowerCase().includes('out') 
                              ? { color: '#DC2626' } 
                              : { color: '#047857' }
                          ]}>{row.status}</Text>
                        </View>
                      </View>
                      {row.values.map((val, vIdx) => (
                        <Text key={vIdx} style={[styles.td, styles.tdRight, { width: 135 }]}>
                          {val}
                        </Text>
                      ))}
                    </View>
                  ))}

                  {/* Totals Row */}
                  {exportData?.totals && exportData.totals.length > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { width: 375 }]}>
                        FLEET TOTALS / SUMMARY
                      </Text>
                      {exportData.totals.map((t, tIdx) => (
                        <Text key={tIdx} style={[styles.totalsVal, styles.tdRight, { width: 135 }]}>
                          {t}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={styles.tableFooter}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#059669" />
                <Text style={styles.tableFooterText}>
                  Displaying {exportData?.rows.length || 0} active fleet assets. Export report to generate full PDF/Spreadsheet with official Aviance letterhead.
                </Text>
              </View>
            </View>

          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 18, color: '#EF4444', marginBottom: 16, fontWeight: '600' },
  backBtn: { paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#E5E7EB', borderRadius: 8 },
  backBtnText: { color: '#374151', fontWeight: '600' },
  
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { padding: 24, maxWidth: 1280, marginHorizontal: 'auto', width: '100%' },
  
  statusBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ECFDF5', 
    borderWidth: 1, 
    borderColor: '#A7F3D0', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 8, 
    marginBottom: 20, 
    gap: 10 
  },
  statusBannerText: { color: '#065F46', fontSize: 14, fontWeight: '600' },

  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16, 
    flexWrap: 'wrap', 
    gap: 16 
  },
  headerBackBtn: { 
    marginRight: 14, 
    padding: 8, 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  categoryPillText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#043094', 
    backgroundColor: '#EEF2FF', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 6 
  },
  scheduleText: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  deleteBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    paddingVertical: 9, 
    backgroundColor: '#FEF2F2', 
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    gap: 6
  },
  deleteBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
  downloadBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingVertical: 9, 
    backgroundColor: '#043094', 
    borderRadius: 8,
    shadowColor: '#043094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    gap: 6
  },
  downloadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  formatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  formatBarLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  formatOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FAFAFA',
    gap: 5,
  },
  formatChipText: { fontSize: 12, fontWeight: '700' },

  mainGrid: { flexDirection: 'row', gap: 20 },
  mainGridMobile: { flexDirection: 'column' },
  leftCol: { flex: 1, gap: 20 },
  rightCol: { flex: 1, gap: 20 },

  card: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 22, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 3, 
    elevation: 1 
  },
  cardHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  sectionSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  value: { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  notesText: { color: '#334155', lineHeight: 20, marginTop: 4, fontSize: 13 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 14 },

  metricTagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  metricTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  metricTagText: { fontSize: 11, fontWeight: '600', color: '#043094' },

  fullExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 8,
  },
  fullExportBtnText: { color: '#043094', fontWeight: '700', fontSize: 13 },

  refreshBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#EEF2FF', 
    paddingHorizontal: 12, 
    paddingVertical: 7, 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 4
  },
  refreshBtnText: { color: '#043094', fontWeight: '700', fontSize: 12 },

  kpiGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  kpiCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
  },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  kpiValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  kpiChange: { fontSize: 10, fontWeight: '600', color: '#059669', marginTop: 2 },

  tableCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  th: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  thRight: { textAlign: 'right' },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableRowAlt: { backgroundColor: '#F8FAFC' },
  vehicleName: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  plateBadge: { 
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9', 
    borderWidth: 1, 
    borderColor: '#CBD5E1', 
    borderRadius: 4, 
    paddingHorizontal: 6, 
    paddingVertical: 2 
  },
  plateText: { fontSize: 11, fontWeight: '700', color: '#334155' },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: { backgroundColor: '#ECFDF5' },
  statusInShop: { backgroundColor: '#FEF3C7' },
  statusOut: { backgroundColor: '#FEE2E2' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  td: { fontSize: 13, color: '#334155', fontWeight: '500' },
  tdRight: { textAlign: 'right' },

  totalsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderTopColor: '#CBD5E1',
    alignItems: 'center',
  },
  totalsLabel: { fontSize: 11, fontWeight: '800', color: '#0F172A', letterSpacing: 0.5 },
  totalsVal: { fontSize: 12, fontWeight: '800', color: '#0F172A' },

  tableFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  tableFooterText: { fontSize: 11, color: '#64748B', fontStyle: 'italic', flex: 1 },
});
