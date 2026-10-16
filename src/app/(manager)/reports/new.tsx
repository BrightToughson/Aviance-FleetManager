import React, { useState, useContext, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Platform, 
  useWindowDimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useReports } from '../../../context/ReportsContext';
import { useVehicles } from '../../../context/VehicleContext';
import { useServices } from '../../../context/ServicesContext';
import { useIssues } from '../../../context/IssuesContext';
import { useInspections } from '../../../context/InspectionContext';
import { useParts } from '../../../context/PartsContext';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { exportReport, ReportExportData } from '../../../lib/exportReport';

type CategoryType = 'Financial' | 'Maintenance' | 'Fuel' | 'Safety' | 'Operations';
type ScheduleType = 'Ad-Hoc' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
type FormatType = 'PDF' | 'Excel' | 'CSV' | 'JSON';

interface MetricOption {
  id: string;
  label: string;
  category: CategoryType;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  unit: string;
}

const ALL_METRICS: MetricOption[] = [
  { id: 'Total Cost', label: 'Total Fleet Spend', category: 'Financial', icon: 'cash-outline', description: 'Combined fuel, maintenance, parts & operational expenses', unit: 'GH₵' },
  { id: 'Maintenance Cost', label: 'Maintenance Cost', category: 'Maintenance', icon: 'construct-outline', description: 'Repair bills, scheduled services & labor charges', unit: 'GH₵' },
  { id: 'Fuel Cost', label: 'Fuel Spend', category: 'Fuel', icon: 'water-outline', description: 'Fuel transactions, refills & pump receipts', unit: 'GH₵' },
  { id: 'Distance', label: 'Distance Traveled', category: 'Operations', icon: 'speedometer-outline', description: 'Odometer mileage recorded over the selected timeframe', unit: 'km' },
  { id: 'Fuel Efficiency', label: 'Avg Fuel Efficiency', category: 'Fuel', icon: 'leaf-outline', description: 'Kilometers or miles achieved per unit of fuel', unit: 'MPG' },
  { id: 'Downtime', label: 'Downtime Hours', category: 'Maintenance', icon: 'time-outline', description: 'Hours out of service due to repairs or inspections', unit: 'hrs' },
  { id: 'Completed Inspections', label: 'Completed Inspections', category: 'Safety', icon: 'shield-checkmark-outline', description: 'Daily pre-trip and post-trip inspections conducted', unit: 'checks' },
  { id: 'Reported Issues', label: 'Reported Issues', category: 'Safety', icon: 'alert-circle-outline', description: 'Open and resolved defects flagged by drivers', unit: 'issues' },
  { id: 'Cost Per Mile', label: 'Cost Per Mile / KM', category: 'Financial', icon: 'calculator-outline', description: 'Overall operating cost divided by total distance', unit: 'GH₵/km' },
  { id: 'Utilization Rate', label: 'Vehicle Utilization', category: 'Operations', icon: 'bar-chart-outline', description: 'Percentage of active operating hours vs idle time', unit: '%' },
];

const CATEGORIES: { id: CategoryType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[] = [
  { id: 'Financial', label: 'Financial & Costs', icon: 'wallet-outline', color: '#059669', bg: '#ECFDF5' },
  { id: 'Maintenance', label: 'Maintenance & Repairs', icon: 'construct-outline', color: '#D97706', bg: '#FFFBEB' },
  { id: 'Fuel', label: 'Fuel & Energy', icon: 'water-outline', color: '#0284C7', bg: '#F0F9FF' },
  { id: 'Safety', label: 'Safety & Compliance', icon: 'shield-checkmark-outline', color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'Operations', label: 'Fleet Operations', icon: 'car-sport-outline', color: '#043094', bg: '#EEF2FF' },
];

const SCHEDULES: { id: ScheduleType; label: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'Ad-Hoc', label: 'Ad-Hoc', subtitle: 'Run immediately once', icon: 'flash-outline' },
  { id: 'Daily', label: 'Daily', subtitle: 'Every morning at 06:00', icon: 'today-outline' },
  { id: 'Weekly', label: 'Weekly', subtitle: 'Every Monday', icon: 'calendar-outline' },
  { id: 'Monthly', label: 'Monthly', subtitle: '1st of every month', icon: 'file-tray-full-outline' },
  { id: 'Quarterly', label: 'Quarterly', subtitle: 'Every 90 days', icon: 'pie-chart-outline' },
];

const FORMATS: { id: FormatType; label: string; ext: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'PDF', label: 'PDF Report', ext: '.pdf', icon: 'document-text-outline', color: '#EF4444' },
  { id: 'Excel', label: 'Excel Sheet', ext: '.xlsx', icon: 'grid-outline', color: '#10B981' },
  { id: 'CSV', label: 'CSV Data', ext: '.csv', icon: 'list-outline', color: '#3B82F6' },
  { id: 'JSON', label: 'Raw JSON', ext: '.json', icon: 'code-slash-outline', color: '#8B5CF6' },
];

const DATE_RANGES = ['Last 7 Days', 'Last 30 Days', 'This Month', 'This Quarter', 'Year to Date', 'Custom'];

const SCOPE_OPTIONS: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'All Vehicles', label: 'All Fleet Vehicles', icon: 'car-sport-outline' },
  { id: 'Active Only', label: 'Active Status Only', icon: 'checkmark-circle-outline' },
  { id: 'Heavy Trucks', label: 'Heavy Trucks', icon: 'bus-outline' },
  { id: 'Delivery Vans', label: 'Vans & Shuttles', icon: 'cube-outline' },
  { id: 'In-Shop', label: 'In Maintenance Shop', icon: 'construct-outline' },
];

export default function CreateReportScreen() {
  const router = useRouter();
  const { addReport } = useReports();
  const { t } = useTranslation();
  
  // Real Fleet Contexts
  const { vehicles: rawVehicles = [] } = useVehicles() || {};
  const { services = [] } = useServices() || {};
  const { issues = [] } = useIssues() || {};
  const { inspections = [] } = useInspections() || {};
  const { parts = [] } = useParts() || {};
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);

  // Fetch fuel logs from Supabase
  React.useEffect(() => {
    let isMounted = true;
    const fetchFuel = async () => {
      const { data, error } = await supabase.from('fuel_logs').select('*');
      if (!error && data && isMounted) {
        setFuelLogs(data);
      }
    };
    fetchFuel();

    const channel = supabase.channel('report_builder_fuel_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_logs' }, () => {
        fetchFuel();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1180;

  // Tabs for mobile / tablet view
  const [activeTab, setActiveTab] = useState<'configure' | 'preview'>('configure');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryType>('Financial');
  const [schedule, setSchedule] = useState<ScheduleType>('Monthly');
  const [format, setFormat] = useState<FormatType>('PDF');
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [customStart, setCustomStart] = useState('2026-09-11');
  const [customEnd, setCustomEnd] = useState('2026-10-11');
  const [fleetScope, setFleetScope] = useState('All Vehicles');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'Total Cost',
    'Maintenance Cost',
    'Fuel Cost',
    'Distance',
    'Downtime'
  ]);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template Quick-picker
  const applyTemplate = (cat: CategoryType) => {
    setCategory(cat);
    if (cat === 'Financial') {
      setSelectedMetrics(['Total Cost', 'Maintenance Cost', 'Fuel Cost', 'Cost Per Mile']);
    } else if (cat === 'Maintenance') {
      setSelectedMetrics(['Maintenance Cost', 'Downtime', 'Reported Issues', 'Total Cost']);
    } else if (cat === 'Fuel') {
      setSelectedMetrics(['Fuel Cost', 'Fuel Efficiency', 'Distance', 'Total Cost']);
    } else if (cat === 'Safety') {
      setSelectedMetrics(['Completed Inspections', 'Reported Issues', 'Downtime']);
    } else if (cat === 'Operations') {
      setSelectedMetrics(['Distance', 'Utilization Rate', 'Downtime', 'Total Cost']);
    }
  };

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(m => m !== metricId);
      } else {
        return [...prev, metricId];
      }
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      if (Platform.OS === 'web') window.alert('Please enter a Report Name.');
      else Alert.alert('Validation Error', 'Please enter a Report Name.');
      return;
    }

    try {
      setIsSubmitting(true);
      await addReport({
        name: name.trim(),
        category,
        schedule,
        lastRun: 'Never',
        format,
        description,
        filters: {
          dateRange: dateRange === 'Custom' ? `${customStart} to ${customEnd}` : dateRange,
          vehicles: [fleetScope],
          metrics: selectedMetrics,
        }
      });

      if (Platform.OS === 'web') {
        window.alert('Custom report created and scheduled successfully!');
      } else {
        Alert.alert('Success', 'Custom report created and scheduled successfully!');
      }
      router.replace('/(manager)/reports' as any);
    } catch (err: any) {
      console.error('Error creating report:', err);
      if (Platform.OS === 'web') window.alert('Error creating report: ' + (err.message || String(err)));
      else Alert.alert('Error', 'Error creating report: ' + (err.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview data generation - Columns
  const activeMetricObjects = useMemo(() => {
    return ALL_METRICS.filter(m => selectedMetrics.includes(m.id));
  }, [selectedMetrics]);

  // Real entity relationship helpers
  const getVehicleServices = (v: any) => {
    return services.filter((s: any) => {
      if (s.vehicleId && v.id && s.vehicleId === v.id) return true;
      if (s.vehicle && v.name && s.vehicle.toLowerCase().includes(v.name.toLowerCase())) return true;
      if (s.vehicle && v.make && s.vehicle.toLowerCase().includes(v.make.toLowerCase())) return true;
      return false;
    });
  };

  const getVehicleFuelLogs = (v: any) => {
    return fuelLogs.filter((f: any) => f.vehicle_id && v.id && f.vehicle_id === v.id);
  };

  const getVehicleIssues = (v: any) => {
    return issues.filter((i: any) => {
      if (i.vehicleId && v.id && i.vehicleId === v.id) return true;
      if (i.vehicle && v.name && i.vehicle.toLowerCase() === v.name.toLowerCase()) return true;
      if (i.vehicle && v.make && i.vehicle.toLowerCase().includes(v.make.toLowerCase())) return true;
      return false;
    });
  };

  const getVehicleInspections = (v: any) => {
    return inspections.filter((ins: any) => {
      if (ins.vehicleId && v.id && ins.vehicleId === v.id) return true;
      if (ins.vehicle && v.name && ins.vehicle.toLowerCase().includes(v.name.toLowerCase())) return true;
      if (ins.vehicle && v.make && ins.vehicle.toLowerCase().includes(v.make.toLowerCase())) return true;
      return false;
    });
  };

  // Filter vehicles according to fleet scope
  const filteredVehicles = useMemo(() => {
    if (!rawVehicles || rawVehicles.length === 0) return [];
    return rawVehicles.filter((v: any) => {
      const statusLower = (v.status || '').toLowerCase();
      if (fleetScope === 'Active Only') return statusLower === 'active';
      if (fleetScope === 'In-Shop') return statusLower.includes('shop') || statusLower.includes('maintenance');
      if (fleetScope === 'Heavy Trucks') {
        const typeStr = `${v.type || ''} ${v.group || ''} ${v.make || ''} ${v.model || ''}`.toLowerCase();
        return typeStr.includes('truck') || typeStr.includes('heavy') || typeStr.includes('hauler') || typeStr.includes('tractor') || typeStr.includes('trailer');
      }
      if (fleetScope === 'Delivery Vans') {
        const typeStr = `${v.type || ''} ${v.group || ''} ${v.make || ''} ${v.model || ''}`.toLowerCase();
        return typeStr.includes('van') || typeStr.includes('shuttle') || typeStr.includes('cargo') || typeStr.includes('pickup');
      }
      return true;
    });
  }, [rawVehicles, fleetScope]);

  // Preview vehicles (purely real vehicles - no dummy mocks)
  const previewVehicles = useMemo(() => {
    return filteredVehicles.map((v: any, idx: number) => ({
      id: v.id || `veh-${idx}`,
      raw: v,
      name: v.name || `${v.make || 'Fleet Vehicle'} ${v.model || ''}`.trim(),
      plate: v.license_plate || v.plate || '--',
      type: v.type || v.group || 'Commercial Vehicle',
      status: v.status || 'Active',
      meter: parseFloat(String(v.meter || v.current_meter || '0').replace(/[^0-9.]/g, '')) || 0,
    }));
  }, [filteredVehicles]);

  // Calculate real metric values for an asset
  const getVehicleMetricValue = (metricId: string, veh: any): string => {
    const vServices = getVehicleServices(veh);
    const vFuel = getVehicleFuelLogs(veh);
    const vIssues = getVehicleIssues(veh);
    const vInspections = getVehicleInspections(veh);
    const meter = veh.meter || 0;

    const maintCost = vServices.reduce((sum: number, s: any) => {
      if (typeof s.rawCost === 'number') return sum + s.rawCost;
      const clean = String(s.cost || '').replace(/[^0-9.]/g, '');
      return sum + (parseFloat(clean) || 0);
    }, 0);

    const fuelCost = vFuel.reduce((sum: number, f: any) => sum + (Number(f.cost) || 0), 0);
    const totalCost = maintCost + fuelCost;

    switch (metricId) {
      case 'Total Cost':
        return `GH₵${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'Maintenance Cost':
        return `GH₵${maintCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'Fuel Cost':
        return `GH₵${fuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'Distance':
        return `${meter.toLocaleString()} km`;
      case 'Fuel Efficiency': {
        const totalGallons = vFuel.reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);
        if (totalGallons > 0 && meter > 0) {
          return `${(meter / (totalGallons * 1.609)).toFixed(1)} MPG`;
        }
        return totalGallons > 0 ? `${totalGallons.toFixed(1)} Gal` : '0.0 MPG';
      }
      case 'Downtime': {
        const isShop = (veh.status || '').toLowerCase().includes('shop') || (veh.status || '').toLowerCase().includes('service');
        const openIssues = vIssues.filter((i: any) => i.status !== 'Resolved').length;
        const hours = isShop ? (openIssues > 0 ? openIssues * 8 : 16) : (openIssues > 0 ? openIssues * 2 : 0);
        return `${hours} hrs`;
      }
      case 'Completed Inspections': {
        const passed = vInspections.filter((i: any) => i.status === 'Passed' || i.status === 'Certified').length;
        return `${passed} / ${vInspections.length || 0}`;
      }
      case 'Reported Issues': {
        const open = vIssues.filter((i: any) => i.status !== 'Resolved').length;
        return open > 0 ? `${open} Open` : `${vIssues.length} Logged`;
      }
      case 'Cost Per Mile': {
        const cpm = meter > 0 ? totalCost / meter : 0;
        return `GH₵${cpm.toFixed(2)}/km`;
      }
      case 'Utilization Rate': {
        const statusLower = (veh.status || '').toLowerCase();
        if (statusLower.includes('shop') || statusLower.includes('service')) return '0.0%';
        if (statusLower === 'active') {
          const openCount = vIssues.filter((i: any) => i.status !== 'Resolved').length;
          const rate = Math.max(70, 98.5 - openCount * 6);
          return `${rate.toFixed(1)}%`;
        }
        return '85.0%';
      }
      default:
        return '--';
    }
  };

  // Fleet Totals / Average across preview table
  const getFleetMetricAggregate = (metricId: string): string => {
    if (previewVehicles.length === 0) return '--';

    let totalMaint = 0;
    let totalFuel = 0;
    let totalMeter = 0;
    let totalGallons = 0;
    let totalDowntime = 0;
    let totalPassedInspections = 0;
    let totalInspectionsCount = 0;
    let totalOpenIssues = 0;
    let totalUtilRate = 0;

    previewVehicles.forEach((veh: any) => {
      const vServices = getVehicleServices(veh);
      const vFuel = getVehicleFuelLogs(veh);
      const vIssues = getVehicleIssues(veh);
      const vInspections = getVehicleInspections(veh);
      const meter = veh.meter || 0;

      const maintCost = vServices.reduce((sum: number, s: any) => {
        if (typeof s.rawCost === 'number') return sum + s.rawCost;
        const clean = String(s.cost || '').replace(/[^0-9.]/g, '');
        return sum + (parseFloat(clean) || 0);
      }, 0);
      const fuelCost = vFuel.reduce((sum: number, f: any) => sum + (Number(f.cost) || 0), 0);
      const gallons = vFuel.reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);

      totalMaint += maintCost;
      totalFuel += fuelCost;
      totalMeter += meter;
      totalGallons += gallons;

      const isShop = (veh.status || '').toLowerCase().includes('shop') || (veh.status || '').toLowerCase().includes('service');
      const openIssues = vIssues.filter((i: any) => i.status !== 'Resolved').length;
      totalDowntime += isShop ? (openIssues > 0 ? openIssues * 8 : 16) : (openIssues > 0 ? openIssues * 2 : 0);

      totalPassedInspections += vInspections.filter((i: any) => i.status === 'Passed' || i.status === 'Certified').length;
      totalInspectionsCount += vInspections.length;

      totalOpenIssues += openIssues;

      const statusLower = (veh.status || '').toLowerCase();
      if (statusLower.includes('shop') || statusLower.includes('service')) {
        totalUtilRate += 0;
      } else if (statusLower === 'active') {
        totalUtilRate += Math.max(70, 98.5 - openIssues * 6);
      } else {
        totalUtilRate += 85;
      }
    });

    const totalFleetCost = totalMaint + totalFuel;

    switch (metricId) {
      case 'Total Cost':
        return `GH₵${totalFleetCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'Maintenance Cost':
        return `GH₵${totalMaint.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'Fuel Cost':
        return `GH₵${totalFuel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'Distance':
        return `${totalMeter.toLocaleString()} km`;
      case 'Fuel Efficiency': {
        if (totalGallons > 0 && totalMeter > 0) {
          return `${(totalMeter / (totalGallons * 1.609)).toFixed(1)} MPG`;
        }
        return totalGallons > 0 ? `${totalGallons.toFixed(1)} Gal` : '0.0 MPG';
      }
      case 'Downtime':
        return `${totalDowntime} hrs`;
      case 'Completed Inspections':
        return `${totalPassedInspections} / ${totalInspectionsCount}`;
      case 'Reported Issues':
        return `${totalOpenIssues} Open`;
      case 'Cost Per Mile': {
        const cpm = totalMeter > 0 ? totalFleetCost / totalMeter : 0;
        return `GH₵${cpm.toFixed(2)}/km`;
      }
      case 'Utilization Rate': {
        const avg = totalUtilRate / previewVehicles.length;
        return `${avg.toFixed(1)}%`;
      }
      default:
        return 'Aggregated';
    }
  };

  // Executive KPI summary calculations directly connected to real records
  const kpiData: { label: string; val: string; icon: keyof typeof Ionicons.glyphMap; color: string; change: string }[] = useMemo(() => {
    // 1. Total Spend across fleet: fuel + maintenance + parts
    const fuelSum = fuelLogs.reduce((acc, f) => acc + (Number(f.cost) || 0), 0);
    const maintSum = services.reduce((acc, s: any) => {
      if (typeof s.rawCost === 'number') return acc + s.rawCost;
      const clean = String(s.cost || '').replace(/[^0-9.]/g, '');
      return acc + (parseFloat(clean) || 0);
    }, 0);
    const partsSum = parts.reduce((acc, p: any) => acc + ((p.unitCost || 0) * (p.qty || 0)), 0);
    const overallSpend = fuelSum + maintSum + partsSum;

    // 2. Avg Fuel Efficiency
    const totalGallons = fuelLogs.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
    const totalMileage = rawVehicles.reduce((acc: number, v: any) => {
      const m = parseFloat(String(v.meter || v.current_meter || '0').replace(/[^0-9.]/g, '')) || 0;
      return acc + m;
    }, 0);
    const mpgValue = (totalGallons > 0 && totalMileage > 0)
      ? `${(totalMileage / (totalGallons * 1.609)).toFixed(1)} MPG`
      : totalGallons > 0 ? `${totalGallons.toFixed(1)} Gal total` : '0.0 MPG';

    // 3. Distance & Active vehicles
    const activeCount = rawVehicles.filter((v: any) => (v.status || '').toLowerCase() === 'active').length;
    const distanceVal = `${totalMileage.toLocaleString()} km`;

    // 4. Operational Uptime
    const uptimeVal = rawVehicles.length > 0
      ? `${((activeCount / rawVehicles.length) * 100).toFixed(1)}%`
      : '100%';
    const inShopCount = rawVehicles.filter((v: any) => {
      const s = (v.status || '').toLowerCase();
      return s.includes('shop') || s.includes('maintenance');
    }).length;

    return [
      { 
        label: 'Total Fleet Spend', 
        val: `GH₵${overallSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
        icon: 'cash-outline', 
        color: '#059669', 
        change: overallSpend > 0 ? `${services.length} services • ${fuelLogs.length} fuel logs` : 'GH₵0.00 logged' 
      },
      { 
        label: 'Avg Fuel Efficiency', 
        val: mpgValue, 
        icon: 'leaf-outline', 
        color: '#0284C7', 
        change: totalGallons > 0 ? `${fuelLogs.length} fill-ups recorded` : '0 fill-ups logged' 
      },
      { 
        label: 'Total Distance', 
        val: distanceVal, 
        icon: 'speedometer-outline', 
        color: '#7C3AED', 
        change: `${activeCount} of ${rawVehicles.length} vehicles active` 
      },
      { 
        label: 'Operational Uptime', 
        val: uptimeVal, 
        icon: 'shield-checkmark-outline', 
        color: '#043094', 
        change: inShopCount > 0 ? `${inShopCount} in maintenance` : (rawVehicles.length > 0 ? 'All operational' : '0 vehicles registered') 
      },
    ];
  }, [fuelLogs, services, parts, rawVehicles]);

  const handleExportSimulated = async (exportFormat: string) => {
    try {
      const exportPayload: ReportExportData = {
        title: name || 'Custom Fleet Report',
        category,
        schedule,
        dateRange: dateRange === 'Custom' ? `${customStart} to ${customEnd}` : dateRange,
        scope: fleetScope,
        description,
        kpis: kpiData.map(k => ({ label: k.label, value: k.val, change: k.change })),
        columns: activeMetricObjects.map(m => m.label),
        rows: previewVehicles.map((v: any) => ({
          vehicleName: v.name,
          plate: v.plate,
          status: v.status || 'Active',
          values: activeMetricObjects.map(m => getVehicleMetricValue(m.id, v)),
        })),
      };
      await exportReport(exportPayload, exportFormat);
    } catch (err: any) {
      console.error('Export preview error:', err);
      if (Platform.OS === 'web') window.alert('Export failed: ' + (err.message || String(err)));
      else Alert.alert('Export Error', err.message || String(err));
    }
  };

  return (
    <View style={styles.screen}>
      {/* Top Header Banner */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderContent}>
          <View style={styles.breadcrumbRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={18} color="#043094" />
              <Text style={styles.backButtonText}>Reports</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbDivider}>/</Text>
            <Text style={styles.breadcrumbCurrent}>Build Custom Report</Text>
          </View>

          <View style={styles.headerTitleRow}>
            <View style={{ flex: 1, minWidth: 260 }}>
              <Text style={styles.headerTitle}>Build Custom Report</Text>
              <Text style={styles.headerSubtitle}>
                Assemble customized metrics, configure fleet filters, and preview live automated digests.
              </Text>
            </View>

            <View style={styles.headerActions}>
              {(name.length > 0 || description.length > 0) && (
                <TouchableOpacity 
                  style={styles.actionBtnClear} 
                  onPress={() => {
                    setName('');
                    setDescription('');
                  }}
                >
                  <Ionicons name="refresh-outline" size={16} color="#64748B" />
                  <Text style={styles.actionBtnClearText}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.actionBtnOutline} 
                onPress={() => handleExportSimulated(format)}
              >
                <Ionicons name="download-outline" size={18} color="#043094" />
                <Text style={styles.actionBtnOutlineText}>Export Preview</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtnPrimary, isSubmitting && { opacity: 0.7 }]} 
                onPress={handleSave}
                disabled={isSubmitting}
              >
                <Ionicons name="bookmark-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnPrimaryText}>
                  {isSubmitting ? 'Saving...' : 'Save & Schedule'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Responsive Tab Bar (Mobile / Tablet) */}
        {!isDesktop && (
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'configure' && styles.tabButtonActive]}
              onPress={() => setActiveTab('configure')}
            >
              <Ionicons 
                name="options-outline" 
                size={18} 
                color={activeTab === 'configure' ? '#043094' : '#6B7280'} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'configure' && styles.tabButtonTextActive]}>
                Configure Parameters
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'preview' && styles.tabButtonActive]}
              onPress={() => setActiveTab('preview')}
            >
              <Ionicons 
                name="eye-outline" 
                size={18} 
                color={activeTab === 'preview' ? '#043094' : '#6B7280'} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'preview' && styles.tabButtonTextActive]}>
                Live Preview ({selectedMetrics.length} Cols)
              </Text>
              <View style={styles.previewIndicatorDot} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Body */}
      <ScrollView 
        style={styles.mainScroll} 
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.layoutGrid, isDesktop ? styles.layoutDesktop : styles.layoutMobile]}>
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: CONFIGURATION CONTROLS                      */}
          {/* ======================================================== */}
          {(isDesktop || activeTab === 'configure') && (
            <View style={[styles.columnWrapper, isDesktop && { flex: 1 }]}>
              
              {/* Card 1: Report Title & Category Templates */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderIconWrap}>
                    <Ionicons name="document-text" size={20} color="#043094" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Report Identity</Text>
                    <Text style={styles.cardSubtitle}>Name, domain category and executive scope</Text>
                  </View>
                </View>

                {/* Report Name Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Report Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="create-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <TextInput 
                      style={styles.textInput} 
                      value={name} 
                      onChangeText={setName} 
                      placeholder="e.g. Monthly Maintenance & Fuel Audit" 
                      placeholderTextColor="#9CA3AF"
                    />
                    {name.length > 0 && (
                      <TouchableOpacity onPress={() => setName('')} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Description & Purpose (Modern Executive Memo Editor) */}
                <View style={styles.formGroup}>
                  <View style={styles.descEditorLabelRow}>
                    <View style={styles.descLabelWithIcon}>
                      <Ionicons name="document-text-outline" size={16} color="#043094" style={{ marginRight: 6 }} />
                      <Text style={styles.formLabel}>Description & Purpose</Text>
                    </View>
                    <View style={styles.descExecutivePill}>
                      <Ionicons name="sparkles" size={11} color="#043094" />
                      <Text style={styles.descExecutivePillText}>Executive Scope</Text>
                    </View>
                  </View>

                  <View style={styles.descEditorWrapper}>
                    {/* Top Executive Header Toolbar */}
                    <View style={styles.descEditorTopBar}>
                      <View style={styles.descEditorTitleGroup}>
                        <View style={styles.descEditorIconPill}>
                          <Ionicons name="shield-checkmark-outline" size={13} color="#043094" />
                        </View>
                        <Text style={styles.descEditorHeaderTitle}>EXECUTIVE AUDIT SCOPE & DIRECTIVES</Text>
                      </View>
                      <View style={styles.descEditorDatePill}>
                        <Ionicons name="calendar-outline" size={11} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.descEditorDateText}>
                          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>

                    {/* Editor Surface */}
                    <View style={styles.descEditorSurface}>
                      <TextInput 
                        style={styles.descEditorTextInput} 
                        value={description} 
                        onChangeText={setDescription} 
                        placeholder="Define executive audit objectives, specific scope boundaries, vehicle criteria, or management directives for this report..." 
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={7}
                      />
                    </View>

                    {/* Bottom Quick-Templates & Character Counter Bar */}
                    <View style={styles.descEditorBottomBar}>
                      <View style={styles.descTemplateChipsRow}>
                        <Text style={styles.descTemplatePrompt}>Templates:</Text>
                        <TouchableOpacity 
                          style={styles.descTemplateChip}
                          onPress={() => setDescription('Comprehensive operational review of vehicle uptime, service health, and driver task completion across all active commercial assets.')}
                        >
                          <Ionicons name="add" size={11} color="#043094" />
                          <Text style={styles.descTemplateChipText}>Fleet Audit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.descTemplateChip}
                          onPress={() => setDescription('Comprehensive analysis of operating expenditures, vehicle uptime, and fuel consumption across the commercial fleet.')}
                        >
                          <Ionicons name="add" size={11} color="#043094" />
                          <Text style={styles.descTemplateChipText}>Cost & Fuel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.descTemplateChip}
                          onPress={() => setDescription('Mandatory safety compliance, regulatory inspection status, and pending critical defect resolutions for commercial fleet licensing.')}
                        >
                          <Ionicons name="add" size={11} color="#043094" />
                          <Text style={styles.descTemplateChipText}>Compliance</Text>
                        </TouchableOpacity>
                        {description.length > 0 && (
                          <TouchableOpacity 
                            style={[styles.descTemplateChip, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                            onPress={() => setDescription('')}
                          >
                            <Ionicons name="close-circle" size={11} color="#EF4444" />
                            <Text style={[styles.descTemplateChipText, { color: '#DC2626' }]}>Clear</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.descCounterContainer}>
                        <Text style={styles.descCharCount}>{description.length} chars</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Category Preset Picker */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Report Domain / Category</Text>
                  <View style={styles.categoryGrid}>
                    {CATEGORIES.map(cat => {
                      const isSelected = category === cat.id;
                      return (
                        <TouchableOpacity 
                          key={cat.id}
                          style={[
                            styles.categoryChip, 
                            isSelected && { borderColor: cat.color, backgroundColor: cat.bg }
                          ]}
                          onPress={() => applyTemplate(cat.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name={cat.icon} 
                            size={18} 
                            color={isSelected ? cat.color : '#6B7280'} 
                          />
                          <Text style={[styles.categoryChipText, isSelected && { color: cat.color, fontWeight: '700' }]}>
                            {cat.label}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={16} color={cat.color} style={{ marginLeft: 'auto' }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Card 2: Scheduling & Format */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardHeaderIconWrap, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="calendar" size={20} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Automation & Output</Text>
                    <Text style={styles.cardSubtitle}>Delivery frequency and document export format</Text>
                  </View>
                </View>

                {/* Schedule Chips */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Delivery Frequency / Schedule</Text>
                  <View style={styles.scheduleRow}>
                    {SCHEDULES.map(sch => {
                      const isSelected = schedule === sch.id;
                      return (
                        <TouchableOpacity
                          key={sch.id}
                          style={[styles.scheduleCard, isSelected && styles.scheduleCardSelected]}
                          onPress={() => setSchedule(sch.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name={sch.icon} 
                            size={18} 
                            color={isSelected ? '#043094' : '#6B7280'} 
                          />
                          <Text style={[styles.scheduleCardTitle, isSelected && styles.scheduleCardTitleSelected]}>
                            {sch.label}
                          </Text>
                          <Text style={styles.scheduleCardSub}>{sch.subtitle}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Format Chips */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Primary Export Format</Text>
                  <View style={styles.formatRow}>
                    {FORMATS.map(fmt => {
                      const isSelected = format === fmt.id;
                      return (
                        <TouchableOpacity
                          key={fmt.id}
                          style={[
                            styles.formatBadge, 
                            isSelected && { borderColor: fmt.color, backgroundColor: '#fff', elevation: 2 }
                          ]}
                          onPress={() => setFormat(fmt.id)}
                        >
                          <Ionicons 
                            name={fmt.icon} 
                            size={18} 
                            color={isSelected ? fmt.color : '#6B7280'} 
                          />
                          <Text style={[styles.formatBadgeText, isSelected && { color: fmt.color, fontWeight: '700' }]}>
                            {fmt.label}
                          </Text>
                          <Text style={[styles.formatBadgeExt, isSelected && { color: fmt.color }]}>{fmt.ext}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Card 3: Scope & Filters */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardHeaderIconWrap, { backgroundColor: '#F5F3FF' }]}>
                    <Ionicons name="filter" size={20} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Timeframe & Fleet Scope</Text>
                    <Text style={styles.cardSubtitle}>Narrow down date intervals and included asset groups</Text>
                  </View>
                </View>

                {/* Date Range Presets */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Date Range Timeframe</Text>
                  <View style={styles.pillsWrap}>
                    {DATE_RANGES.map(range => {
                      const isSelected = dateRange === range;
                      return (
                        <TouchableOpacity
                          key={range}
                          style={[styles.pill, isSelected && styles.pillSelected]}
                          onPress={() => setDateRange(range)}
                        >
                          <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                            {range}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Custom Date Inputs if Custom is selected */}
                {dateRange === 'Custom' && (
                  <View style={styles.customDateRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formSubLabel}>Start Date</Text>
                      {Platform.OS === 'web' ? (
                        <input 
                          type="date" 
                          value={customStart} 
                          onChange={(e: any) => setCustomStart(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid #D1D5DB',
                            backgroundColor: '#F9FAFB',
                            fontSize: 14,
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <TextInput style={styles.textInput} value={customStart} onChangeText={setCustomStart} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formSubLabel}>End Date</Text>
                      {Platform.OS === 'web' ? (
                        <input 
                          type="date" 
                          value={customEnd} 
                          onChange={(e: any) => setCustomEnd(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid #D1D5DB',
                            backgroundColor: '#F9FAFB',
                            fontSize: 14,
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <TextInput style={styles.textInput} value={customEnd} onChangeText={setCustomEnd} />
                      )}
                    </View>
                  </View>
                )}

                {/* Fleet Scope */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Vehicles / Asset Groups to Include</Text>
                  <View style={styles.scopeGrid}>
                    {SCOPE_OPTIONS.map(opt => {
                      const isSelected = fleetScope === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.scopeChip, isSelected && styles.scopeChipSelected]}
                          onPress={() => setFleetScope(opt.id)}
                        >
                          <Ionicons 
                            name={opt.icon} 
                            size={16} 
                            color={isSelected ? '#043094' : '#6B7280'} 
                          />
                          <Text style={[styles.scopeChipText, isSelected && styles.scopeChipTextSelected]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Card 4: Metrics & Columns Selection */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardHeaderIconWrap, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="stats-chart" size={20} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.cardTitle}>Report Metrics & Columns</Text>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{selectedMetrics.length} Selected</Text>
                      </View>
                    </View>
                    <Text style={styles.cardSubtitle}>Choose the data points and columns to compile into the final sheet</Text>
                  </View>
                </View>

                {/* Quick actions for metrics */}
                <View style={styles.metricsHelperRow}>
                  <Text style={styles.metricsHelperText}>Toggle metrics to add or remove table columns:</Text>
                  <TouchableOpacity 
                    onPress={() => setSelectedMetrics(ALL_METRICS.map(m => m.id))}
                    style={styles.selectHelperBtn}
                  >
                    <Text style={styles.selectHelperBtnText}>Select All</Text>
                  </TouchableOpacity>
                </View>

                {/* Metrics Grid */}
                <View style={styles.metricsList}>
                  {ALL_METRICS.map(m => {
                    const isChecked = selectedMetrics.includes(m.id);
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.metricItem, isChecked && styles.metricItemSelected]}
                        onPress={() => toggleMetric(m.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                          {isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <View style={[styles.metricIconWrap, isChecked && { backgroundColor: '#EEF2FF' }]}>
                          <Ionicons name={m.icon} size={18} color={isChecked ? '#043094' : '#9CA3AF'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.metricLabel, isChecked && styles.metricLabelSelected]}>
                              {m.label}
                            </Text>
                            <Text style={styles.metricUnit}>({m.unit})</Text>
                          </View>
                          <Text style={styles.metricDesc} numberOfLines={1}>{m.description}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Visual Charts Toggle */}
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.toggleTitle}>Include Executive Charts & KPI Cards</Text>
                    <Text style={styles.toggleSub}>Embed high-level visual comparison cards above the data table</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.switchTrack, includeCharts && styles.switchTrackActive]}
                    onPress={() => setIncludeCharts(!includeCharts)}
                  >
                    <View style={[styles.switchThumb, includeCharts && styles.switchThumbActive]} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom Quick Switch for Mobile */}
              {!isDesktop && (
                <TouchableOpacity 
                  style={styles.floatingPreviewBanner}
                  onPress={() => setActiveTab('preview')}
                >
                  <Ionicons name="eye" size={20} color="#fff" />
                  <Text style={styles.floatingPreviewBannerText}>
                    View Live Generated Preview ({selectedMetrics.length} Columns)
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ======================================================== */}
          {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW                   */}
          {/* ======================================================== */}
          {(isDesktop || activeTab === 'preview') && (
            <View style={[styles.columnWrapper, isDesktop && { flex: 1.15, position: 'sticky', top: 20 }]}>
              <View style={styles.previewDocumentCard}>
                
                {/* Document Top Action Toolbar */}
                <View style={styles.documentToolbar}>
                  <View style={styles.liveBadge}>
                    <View style={styles.livePulse} />
                    <Text style={styles.liveBadgeText}>LIVE REPORT PREVIEW</Text>
                  </View>

                  <View style={styles.docActions}>
                    <TouchableOpacity 
                      style={styles.docActionBtn} 
                      onPress={() => handleExportSimulated('PDF')}
                    >
                      <Ionicons name="print-outline" size={16} color="#4B5563" />
                      <Text style={styles.docActionBtnText}>Print</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.docActionBtn} 
                      onPress={() => handleExportSimulated(format)}
                    >
                      <Ionicons name="download-outline" size={16} color="#043094" />
                      <Text style={[styles.docActionBtnText, { color: '#043094' }]}>Export {format}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Realistic Document Paper Container with Floating Elevation */}
                <View style={styles.paperSheetWrapper}>
                  <View style={styles.paperSheet}>
                    
                    {/* Corporate Letterhead */}
                    <View style={styles.sheetHeader}>
                      <View style={styles.companyBrand}>
                        <View style={styles.brandIconSquare}>
                          <Ionicons name="speedometer" size={20} color="#fff" />
                        </View>
                        <View>
                          <Text style={styles.brandTitle}>Aviance FleetManager</Text>
                          <Text style={styles.brandSub}>Corporate Asset Intelligence System</Text>
                        </View>
                      </View>

                      <View style={styles.docMetaBadge}>
                        <Text style={styles.docMetaLabel}>REPORT CLASSIFICATION</Text>
                        <Text style={styles.docMetaValue}>{category.toUpperCase()} • {schedule.toUpperCase()}</Text>
                      </View>
                    </View>

                    {/* Title & Metadata Ribbon */}
                    <View style={styles.sheetTitleBox}>
                      <Text style={styles.sheetReportTitle}>{name || 'Untitled Custom Report'}</Text>
                      {description ? (
                        <View style={styles.descNoteBox}>
                          <Text style={styles.sheetReportDesc}>{description}</Text>
                        </View>
                      ) : null}

                      <View style={styles.metadataRibbon}>
                        <View style={styles.metaChip}>
                          <Ionicons name="calendar-outline" size={13} color="#043094" />
                          <Text style={styles.metaChipText}>
                            {dateRange === 'Custom' ? `${customStart} to ${customEnd}` : dateRange}
                          </Text>
                        </View>
                        <View style={styles.metaChip}>
                          <Ionicons name="car-outline" size={13} color="#043094" />
                          <Text style={styles.metaChipText}>{fleetScope}</Text>
                        </View>
                        <View style={styles.metaChip}>
                          <Ionicons name="time-outline" size={13} color="#043094" />
                          <Text style={styles.metaChipText}>Generated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Top Executive KPI Cards - Spacious 2x2 Balanced Grid */}
                    {includeCharts && (
                      <View style={styles.kpiContainer}>
                        <View style={styles.kpiHeaderRow}>
                          <Text style={styles.sectionHeaderTitle}>EXECUTIVE SUMMARY METRICS</Text>
                          <Text style={styles.kpiSubNotice}>Aggregated across active scope</Text>
                        </View>
                        <View style={styles.kpiGrid}>
                          {kpiData.map((kpi, idx) => (
                            <View key={idx} style={[styles.kpiCard, { borderLeftColor: kpi.color }]}>
                              <View style={styles.kpiTopRow}>
                                <Text style={styles.kpiLabel} numberOfLines={1}>{kpi.label}</Text>
                                <View style={[styles.kpiIconBadge, { backgroundColor: `${kpi.color}18` }]}>
                                  <Ionicons name={kpi.icon as any} size={15} color={kpi.color} />
                                </View>
                              </View>
                              <Text style={styles.kpiValue}>{kpi.val}</Text>
                              <View style={[styles.kpiPillWrap, { backgroundColor: `${kpi.color}15` }]}>
                                <Text style={[styles.kpiSub, { color: kpi.color }]}>{kpi.change}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Data Table Section */}
                    <View style={styles.tableSection}>
                      <View style={styles.tableHeaderRowWrap}>
                        <Text style={styles.sectionHeaderTitle}>FLEET ASSET DETAILS BREAKDOWN</Text>
                        <Text style={styles.tableMetaCounter}>Showing {previewVehicles.length} of {rawVehicles.length} records</Text>
                      </View>

                      {/* Table Container */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                        <View style={styles.tableBlock}>
                          {/* Table Header */}
                          <View style={styles.tableHeadRow}>
                            <View style={[styles.thCell, { width: 190 }]}>
                              <Text style={styles.thText}>VEHICLE & MODEL</Text>
                            </View>
                            <View style={[styles.thCell, { width: 115 }]}>
                              <Text style={styles.thText}>LICENSE</Text>
                            </View>
                            {activeMetricObjects.map(m => (
                              <View key={m.id} style={[styles.thCell, { width: 140, alignItems: 'flex-end' }]}>
                                <Text style={styles.thText} numberOfLines={1}>{m.label.toUpperCase()}</Text>
                              </View>
                            ))}
                          </View>

                          {/* Empty State when no vehicles match scope */}
                          {previewVehicles.length === 0 ? (
                            <View style={styles.emptyTableState}>
                              <Ionicons name="car-outline" size={36} color="#94A3B8" />
                              <Text style={styles.emptyTableTitle}>No Fleet Assets in Selected Scope</Text>
                              <Text style={styles.emptyTableSubtitle}>
                                {rawVehicles.length === 0
                                  ? 'No vehicles are registered in the fleet system yet. Once vehicles are added, their live metrics will calculate here automatically.'
                                  : `No fleet vehicles currently match the "${fleetScope}" scope filter.`}
                              </Text>
                            </View>
                          ) : (
                            <>
                              {/* Table Rows */}
                              {previewVehicles.map((veh: any, rowIdx: number) => (
                                <View 
                                  key={veh.id} 
                                  style={[
                                    styles.tableBodyRow, 
                                    rowIdx % 2 === 1 && styles.tableBodyRowZebra
                                  ]}
                                >
                                  <View style={[styles.tdCell, { width: 190, flexDirection: 'row', alignItems: 'center' }]}>
                                    <View style={styles.vehIconBubble}>
                                      <Ionicons name="car-sport" size={14} color="#043094" />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                      <Text style={styles.tdVehName} numberOfLines={1}>{veh.name}</Text>
                                      <Text style={styles.tdVehType}>{veh.type}</Text>
                                    </View>
                                  </View>

                                  <View style={[styles.tdCell, { width: 115 }]}>
                                    <View style={styles.plateBadge}>
                                      <Text style={styles.plateBadgeText}>{veh.plate}</Text>
                                    </View>
                                  </View>

                                  {activeMetricObjects.map((m) => (
                                    <View key={m.id} style={[styles.tdCell, { width: 140, alignItems: 'flex-end' }]}>
                                      <Text style={[styles.tdValueText, m.category === 'Financial' && styles.tdValueMoney]}>
                                        {getVehicleMetricValue(m.id, veh)}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ))}

                              {/* Summary / Total Row */}
                              <View style={styles.tableTotalRow}>
                                <View style={[styles.tdCell, { width: 190 }]}>
                                  <Text style={styles.totalBoldText}>FLEET TOTALS / AVG</Text>
                                </View>
                                <View style={[styles.tdCell, { width: 115 }]}>
                                  <Text style={styles.totalMutedText}>
                                    {previewVehicles.length} Asset{previewVehicles.length === 1 ? '' : 's'}
                                  </Text>
                                </View>
                                {activeMetricObjects.map(m => (
                                  <View key={m.id} style={[styles.tdCell, { width: 140, alignItems: 'flex-end' }]}>
                                    <Text style={styles.totalValueText}>
                                      {getFleetMetricAggregate(m.id)}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </>
                          )}
                        </View>
                      </ScrollView>
                    </View>

                    {/* Document Footer Sign-off */}
                    <View style={styles.sheetFooter}>
                      <View style={styles.footerNoteWrap}>
                        <Ionicons name="shield-checkmark-outline" size={14} color="#059669" />
                        <Text style={styles.footerNoteText}>
                          Confidential & Proprietary • Certified automated digest compiled by Aviance FleetManager
                        </Text>
                      </View>
                      <Text style={styles.footerPageText}>Page 1 of 1</Text>
                    </View>

                  </View>
                </View>

                {/* Back to Configure Button on Mobile Preview */}
                {!isDesktop && (
                  <TouchableOpacity 
                    style={styles.mobileBackToConfigBtn}
                    onPress={() => setActiveTab('configure')}
                  >
                    <Ionicons name="arrow-back" size={16} color="#043094" />
                    <Text style={styles.mobileBackToConfigText}>Back to Filter & Column Settings</Text>
                  </TouchableOpacity>
                )}

              </View>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Floating Bottom Sticky Bar for Mobile / Tablet */}
      {!isDesktop && (
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.bottomBarCancel} 
            onPress={() => router.back()}
          >
            <Text style={styles.bottomBarCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.bottomBarSave, isSubmitting && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Ionicons name="bookmark" size={18} color="#fff" />
            <Text style={styles.bottomBarSaveText}>
              {isSubmitting ? 'Saving...' : 'Save & Schedule Report'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header Banner
  topHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  topHeaderContent: {
    maxWidth: 1600,
    marginHorizontal: 'auto',
    width: '100%',
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#043094',
  },
  breadcrumbDivider: {
    fontSize: 13,
    color: '#94A3B8',
  },
  breadcrumbCurrent: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtnClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  actionBtnClearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
  },
  actionBtnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#043094',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#043094',
    shadowColor: '#043094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Responsive Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginTop: 16,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: '#043094',
  },
  previewIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },

  // Scroll Container
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 24,
    paddingBottom: 100,
    maxWidth: 1600,
    marginHorizontal: 'auto',
    width: '100%',
  },
  layoutGrid: {
    gap: 24,
  },
  layoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  layoutMobile: {
    flexDirection: 'column',
  },
  columnWrapper: {
    gap: 20,
  },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
  },
  cardHeaderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },

  // Form Controls
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  formSubLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    minHeight: 70,
    textAlignVertical: 'top',
  },

  // Category Grid
  categoryGrid: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },

  // Schedules
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  scheduleCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  scheduleCardSelected: {
    borderColor: '#043094',
    backgroundColor: '#EEF2FF',
  },
  scheduleCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  scheduleCardTitleSelected: {
    color: '#043094',
    fontWeight: '700',
  },
  scheduleCardSub: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Formats
  formatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  formatBadge: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  formatBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  formatBadgeExt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginLeft: 'auto',
  },

  // Pills
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  pillSelected: {
    borderColor: '#043094',
    backgroundColor: '#EEF2FF',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  pillTextSelected: {
    fontWeight: '700',
    color: '#043094',
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
  },

  // Scope
  scopeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  scopeChipSelected: {
    borderColor: '#043094',
    backgroundColor: '#EEF2FF',
  },
  scopeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  scopeChipTextSelected: {
    color: '#043094',
    fontWeight: '700',
  },

  // Metrics Section
  countBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#043094',
  },
  metricsHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricsHelperText: {
    fontSize: 12,
    color: '#64748B',
  },
  selectHelperBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  selectHelperBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#043094',
  },
  metricsList: {
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  metricItemSelected: {
    borderColor: '#C7D2FE',
    backgroundColor: '#fff',
    shadowColor: '#043094',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#043094',
    borderColor: '#043094',
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  metricLabelSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  metricDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  toggleSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: '#043094',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },

  // Floating Banner on mobile
  floatingPreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#043094',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#043094',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingPreviewBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // ==========================================
  // ==========================================
  // DESCRIPTION & PURPOSE EXECUTIVE EDITOR STYLES
  // ==========================================
  descEditorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  descLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  descExecutivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  descExecutivePillText: {
    fontSize: 11,
    color: '#043094',
    fontWeight: '700',
  },
  descEditorWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#043094',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  descEditorTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  descEditorTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  descEditorIconPill: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  descEditorHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.6,
  },
  descEditorDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  descEditorDateText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  descEditorSurface: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 180,
  },
  descEditorTextInput: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 22,
    textAlignVertical: 'top',
    minHeight: 160,
  },
  descEditorBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  descTemplateChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  descTemplatePrompt: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 2,
  },
  descTemplateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  descTemplateChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#043094',
  },
  descCounterContainer: {
    marginLeft: 'auto',
  },
  descCharCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  // ==========================================
  // RIGHT COLUMN: LIVE REPORT PREVIEW (SPACIOUS & ELEGANT)
  // ==========================================
  previewDocumentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  documentToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  docActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  docActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  // Floating Paper Container
  paperSheetWrapper: {
    padding: 16,
  },
  paperSheet: {
    padding: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 18,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#043094',
  },
  companyBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#043094',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  brandSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  docMetaBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  docMetaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#043094',
    letterSpacing: 0.6,
  },
  docMetaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#043094',
    marginTop: 2,
  },

  // Title & Metadata
  sheetTitleBox: {
    marginBottom: 24,
  },
  sheetReportTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  descNoteBox: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#043094',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 6,
    marginVertical: 10,
  },
  sheetReportDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  metadataRibbon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  // KPI Section - Spacious 2x2 Layout
  kpiContainer: {
    marginBottom: 24,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  kpiSubNotice: {
    fontSize: 11,
    color: '#94A3B8',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: '48%',
    minWidth: 150,
    flexGrow: 1,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 3.5,
    borderRadius: 10,
    padding: 14,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
    paddingRight: 6,
  },
  kpiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 4,
    letterSpacing: -0.3,
  },
  kpiPillWrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Table Section
  tableSection: {
    marginBottom: 20,
  },
  tableHeaderRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tableMetaCounter: {
    fontSize: 11,
    color: '#94A3B8',
  },
  tableScroll: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  tableBlock: {
    minWidth: '100%',
  },
  tableHeadRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  thCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  thText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
  },
  tableBodyRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableBodyRowZebra: {
    backgroundColor: '#FAFBFD',
  },
  tdCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  vehIconBubble: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  tdVehName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  tdVehType: {
    fontSize: 11,
    color: '#64748B',
  },
  plateBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  plateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  tdValueText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  tdValueMoney: {
    fontWeight: '700',
    color: '#0F172A',
  },
  tableTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderTopColor: '#CBD5E1',
    alignItems: 'center',
  },
  totalBoldText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  totalMutedText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  totalValueText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#043094',
  },

  // Sheet Footer
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 14,
  },
  footerNoteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerNoteText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  footerPageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  mobileBackToConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#EEF2FF',
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
  },
  mobileBackToConfigText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#043094',
  },

  // Bottom Sticky Bar (Mobile / Tablet)
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomBarCancel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
  },
  bottomBarCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  bottomBarSave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#043094',
  },
  bottomBarSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  emptyTableState: {
    paddingVertical: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFBFD',
  },
  emptyTableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyTableSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 18,
  },
});
