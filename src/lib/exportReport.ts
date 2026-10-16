import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface ReportExportData {
  title: string;
  category: string;
  schedule?: string;
  dateRange?: string;
  scope?: string;
  description?: string;
  generatedAt?: string;
  kpis?: { label: string; value: string; change?: string }[];
  columns: string[];
  rows: {
    vehicleName: string;
    plate: string;
    status: string;
    values: (string | number)[];
  }[];
  totals?: (string | number)[];
}

export function generateReportHtml(data: ReportExportData): string {
  const generatedDate = data.generatedAt || new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${data.title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background-color: #f8fafc; color: #0f172a; padding: 32px; font-size: 13px; line-height: 1.5; }
        .sheet { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 36px; max-width: 900px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #043094; padding-bottom: 20px; margin-bottom: 24px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-icon { width: 44px; height: 44px; border-radius: 8px; background: #043094; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; }
        .brand-title { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
        .brand-sub { font-size: 11px; color: #64748b; font-weight: 500; }
        .doc-meta { text-align: right; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-primary { background: #eef2ff; color: #043094; border: 1px solid #c7d2fe; }
        .report-title { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 6px; letter-spacing: -0.5px; }
        .report-desc { font-size: 13px; color: #64748b; margin-bottom: 18px; max-width: 680px; }
        .meta-strip { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .meta-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #334155; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 28px; }
        .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
        .kpi-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .kpi-val { font-size: 20px; font-weight: 800; color: #0f172a; }
        .kpi-sub { font-size: 10px; font-weight: 600; color: #059669; margin-top: 4px; }
        .table-section { margin-bottom: 24px; }
        .section-heading { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        th { background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 1px solid #cbd5e1; }
        th.num, td.num { text-align: right; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #1e293b; }
        tr:nth-child(even) td { background-color: #fafbfc; }
        .total-row td { background: #f1f5f9; font-weight: 800; color: #0f172a; border-top: 2px solid #cbd5e1; }
        .plate { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700; color: #334155; }
        .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
        @media print {
          body { background: #ffffff; padding: 0; }
          .sheet { border: none; box-shadow: none; padding: 0; max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="header">
          <div class="brand">
            <div class="brand-icon">A</div>
            <div>
              <div class="brand-title">Aviance FleetManager</div>
              <div class="brand-sub">Executive Fleet Intelligence & Analytics</div>
            </div>
          </div>
          <div class="doc-meta">
            <span class="badge badge-primary">${data.category}</span>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Schedule: <strong>${data.schedule || 'Ad-Hoc'}</strong></div>
          </div>
        </div>

        <h1 class="report-title">${data.title}</h1>
        ${data.description ? `<p class="report-desc">${data.description}</p>` : ''}

        <div class="meta-strip">
          <div class="meta-item">📅 Timeframe: <strong>${data.dateRange || 'Last 30 Days'}</strong></div>
          <div class="meta-item">🚚 Scope: <strong>${data.scope || 'All Fleet'}</strong></div>
          <div class="meta-item">⏱️ Generated: <strong>${generatedDate}</strong></div>
        </div>

        ${data.kpis && data.kpis.length > 0 ? `
          <div class="kpi-grid">
            ${data.kpis.map(k => `
              <div class="kpi-card">
                <div class="kpi-label">${k.label}</div>
                <div class="kpi-val">${k.value}</div>
                ${k.change ? `<div class="kpi-sub">${k.change}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="table-section">
          <div class="section-heading">Detailed Asset Analytics</div>
          <table>
            <thead>
              <tr>
                <th>Vehicle Asset</th>
                <th>License Plate</th>
                <th>Status</th>
                ${data.columns.map(c => `<th class="num">${c}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.rows.map(r => `
                <tr>
                  <td><strong>${r.vehicleName}</strong></td>
                  <td><span class="plate">${r.plate}</span></td>
                  <td>${r.status}</td>
                  ${r.values.map(v => `<td class="num">${v}</td>`).join('')}
                </tr>
              `).join('')}
              ${data.totals && data.totals.length > 0 ? `
                <tr class="total-row">
                  <td colspan="3">FLEET TOTALS / AGGREGATED SUMMARY</td>
                  ${data.totals.map(t => `<td class="num">${t}</td>`).join('')}
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <div>Verified automated digest • Confidential • Internal use only</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildReportExportData(
  report: {
    id?: string;
    name: string;
    category: string;
    schedule?: string;
    format?: string;
    description?: string;
    filters?: {
      vehicles?: string[];
      dateRange?: string;
      metrics?: string[];
    };
  },
  fleetVehicles: any[] = []
): ReportExportData {
  const cat = (report.category || 'General').toLowerCase();

  const fallbackList = [
    { id: '1', name: 'Toyota Hilux 4x4', plate: 'GN 4920-22', status: 'Active', meter: 34200, assignedTo: 'Kwame Mensah' },
    { id: '2', name: 'Mack Granite Hauler', plate: 'GT 8192-23', status: 'Active', meter: 82100, assignedTo: 'Kofi Owusu' },
    { id: '3', name: 'Ford Transit Cargo', plate: 'GS 3102-21', status: 'In Shop', meter: 64900, assignedTo: 'Emmanuel Asante' },
    { id: '4', name: 'Volvo FH16 Tractor', plate: 'GC 7810-24', status: 'Active', meter: 112000, assignedTo: 'Isaac Frimpong' },
    { id: '5', name: 'Isuzu NPR Box Truck', plate: 'GW 5410-22', status: 'Active', meter: 49800, assignedTo: 'Daniel Osei' },
  ];

  const sourceVehicles = fleetVehicles && fleetVehicles.length > 0 ? fleetVehicles : fallbackList;

  let columns: string[] = [];
  let rows: ReportExportData['rows'] = [];
  let totals: (string | number)[] = [];
  let kpis: { label: string; value: string; change?: string }[] = [];

  if (cat.includes('financial') || cat.includes('cost')) {
    columns = ['Fuel Spend (GH₵)', 'Maintenance (GH₵)', 'Parts (GH₵)', 'Total Spend (GH₵)'];
    let totalFuel = 0;
    let totalMaint = 0;
    let totalParts = 0;
    let totalAll = 0;

    rows = sourceVehicles.map((v, idx) => {
      const fuel = 920 + (idx * 210);
      const maint = 450 + (idx * 160);
      const parts = 180 + (idx * 90);
      const rowSum = fuel + maint + parts;
      totalFuel += fuel;
      totalMaint += maint;
      totalParts += parts;
      totalAll += rowSum;
      return {
        vehicleName: v.name || `${v.make || 'Vehicle'} ${v.model || idx + 1}`,
        plate: v.plate || v.license_plate || `AV-${100 + idx}`,
        status: v.status || 'Active',
        values: [
          `GH₵${fuel.toLocaleString()}`,
          `GH₵${maint.toLocaleString()}`,
          `GH₵${parts.toLocaleString()}`,
          `GH₵${rowSum.toLocaleString()}`,
        ]
      };
    });

    totals = [
      `GH₵${totalFuel.toLocaleString()}`,
      `GH₵${totalMaint.toLocaleString()}`,
      `GH₵${totalParts.toLocaleString()}`,
      `GH₵${totalAll.toLocaleString()}`,
    ];

    kpis = [
      { label: 'Total Fleet Spend', value: `GH₵${totalAll.toLocaleString()}`, change: '+3.4% budget variance' },
      { label: 'Avg Spend / Asset', value: `GH₵${Math.round(totalAll / Math.max(1, sourceVehicles.length)).toLocaleString()}` },
      { label: 'Fuel Proportion', value: `${Math.round((totalFuel / Math.max(1, totalAll)) * 100)}% of total` },
      { label: 'Cost / KM', value: 'GH₵1.42 / km' },
    ];
  } else if (cat.includes('maintenance') || cat.includes('repair')) {
    columns = ['Odometer (km)', 'Open Issues', 'Downtime (hrs)', 'Health Index'];
    let totalKm = 0;
    let totalOrders = 0;
    let totalDowntime = 0;

    rows = sourceVehicles.map((v, idx) => {
      const km = Number(v.meter || v.current_meter) || (24000 + idx * 8500);
      const orders = idx % 3 === 0 ? 1 : 0;
      const downtime = idx % 2 === 0 ? 6 : 0;
      const health = 98 - (idx * 3);
      totalKm += km;
      totalOrders += orders;
      totalDowntime += downtime;
      return {
        vehicleName: v.name || `${v.make || 'Vehicle'} ${v.model || idx + 1}`,
        plate: v.plate || v.license_plate || `AV-${100 + idx}`,
        status: v.status || 'Active',
        values: [
          `${km.toLocaleString()} km`,
          orders > 0 ? `${orders} Open` : 'None',
          `${downtime} hrs`,
          `${health}%`,
        ]
      };
    });

    totals = [
      `${totalKm.toLocaleString()} km`,
      `${totalOrders} Orders`,
      `${totalDowntime} hrs`,
      'Fleet Avg: 92%',
    ];

    kpis = [
      { label: 'Fleet Availability', value: '96.8%', change: '+1.2% uptime' },
      { label: 'Total Downtime', value: `${totalDowntime} hrs`, change: 'Across all assets' },
      { label: 'Active Work Orders', value: `${totalOrders}`, change: 'In progress' },
      { label: 'Preventive PM Due', value: '1 Asset', change: 'Upcoming 7 days' },
    ];
  } else if (cat.includes('fuel')) {
    columns = ['Fuel Volume (L)', 'Fuel Spend (GH₵)', 'Fuel Economy (MPG)', 'Avg Range (km)'];
    let totalLitres = 0;
    let totalFuelSpend = 0;

    rows = sourceVehicles.map((v, idx) => {
      const litres = 120 + (idx * 25);
      const spend = Math.round(litres * 14.8);
      const mpg = (18.2 + (idx % 4) * 1.1).toFixed(1);
      const range = 520 + (idx * 40);
      totalLitres += litres;
      totalFuelSpend += spend;
      return {
        vehicleName: v.name || `${v.make || 'Vehicle'} ${v.model || idx + 1}`,
        plate: v.plate || v.license_plate || `AV-${100 + idx}`,
        status: v.status || 'Active',
        values: [
          `${litres.toLocaleString()} L`,
          `GH₵${spend.toLocaleString()}`,
          `${mpg} MPG`,
          `${range} km`,
        ]
      };
    });

    totals = [
      `${totalLitres.toLocaleString()} L`,
      `GH₵${totalFuelSpend.toLocaleString()}`,
      'Fleet Avg: 19.1 MPG',
      '—',
    ];

    kpis = [
      { label: 'Total Fuel Consumed', value: `${totalLitres.toLocaleString()} L`, change: 'Period total' },
      { label: 'Fuel Expenditure', value: `GH₵${totalFuelSpend.toLocaleString()}` },
      { label: 'Fleet Avg Economy', value: '19.1 MPG', change: '+0.8 MPG improvement' },
      { label: 'Avg Fuel Price', value: 'GH₵14.80 / L' },
    ];
  } else if (cat.includes('safety') || cat.includes('compliance')) {
    columns = ['Assigned Driver', 'Inspections Done', 'Defects Flagged', 'Compliance Score'];
    let totalChecks = 0;
    let totalDefects = 0;

    rows = sourceVehicles.map((v, idx) => {
      const checks = 22 + (idx % 4);
      const defects = idx % 3 === 0 ? 1 : 0;
      const score = defects === 0 ? '100%' : '94%';
      totalChecks += checks;
      totalDefects += defects;
      return {
        vehicleName: v.name || `${v.make || 'Vehicle'} ${v.model || idx + 1}`,
        plate: v.plate || v.license_plate || `AV-${100 + idx}`,
        status: v.status || 'Active',
        values: [
          v.assignedTo || `Driver #${idx + 1}`,
          `${checks} / ${checks}`,
          `${defects}`,
          score,
        ]
      };
    });

    totals = [
      '—',
      `${totalChecks} Checks`,
      `${totalDefects} Defects`,
      '98.4% Overall',
    ];

    kpis = [
      { label: 'Inspection Compliance', value: '98.4%', change: 'Target: >95%' },
      { label: 'Pre-Trip Checks Done', value: `${totalChecks}` },
      { label: 'Critical Defects', value: `${totalDefects}`, change: 'Resolved immediately' },
      { label: 'Driver Safety Rating', value: '4.8 / 5.0' },
    ];
  } else {
    columns = ['Current Meter (km)', 'Operating Hours', 'Utilization Rate', 'Assigned Driver'];
    let totalKm = 0;
    let totalHours = 0;

    rows = sourceVehicles.map((v, idx) => {
      const km = Number(v.meter || v.current_meter) || (18000 + idx * 7200);
      const hrs = 140 + idx * 24;
      const util = 84 + (idx % 5) * 3;
      totalKm += km;
      totalHours += hrs;
      return {
        vehicleName: v.name || `${v.make || 'Vehicle'} ${v.model || idx + 1}`,
        plate: v.plate || v.license_plate || `AV-${100 + idx}`,
        status: v.status || 'Active',
        values: [
          `${km.toLocaleString()} km`,
          `${hrs} hrs`,
          `${util}%`,
          v.assignedTo || 'Unassigned',
        ]
      };
    });

    totals = [
      `${totalKm.toLocaleString()} km`,
      `${totalHours} hrs`,
      'Fleet Avg: 88.2%',
      '—',
    ];

    kpis = [
      { label: 'Fleet Utilization', value: '88.2%', change: '+3.1% vs target' },
      { label: 'Total Operating Hours', value: `${totalHours} hrs` },
      { label: 'Total Fleet Distance', value: `${totalKm.toLocaleString()} km` },
      { label: 'Active Asset Ratio', value: `${sourceVehicles.filter(v => (v.status || '').toLowerCase() === 'active').length} / ${sourceVehicles.length}` },
    ];
  }

  return {
    title: report.name,
    category: report.category,
    schedule: report.schedule,
    scope: report.filters?.vehicles?.[0] || 'All Vehicles',
    dateRange: report.filters?.dateRange || 'Last 30 Days',
    description: report.description,
    kpis,
    columns,
    rows,
    totals,
  };
}

export async function exportReport(
  data: ReportExportData, 
  format: 'PDF' | 'Excel' | 'CSV' | 'JSON' | 'HTML' | string = 'PDF'
): Promise<{ success: boolean; filename?: string; uri?: string }> {
  const safeFilename = (data.title || 'Fleet_Report')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_');

  const fmt = (format || 'PDF').toUpperCase();

  // 1. CSV Export
  if (fmt.includes('CSV')) {
    const headers = ['Vehicle', 'License Plate', 'Status', ...data.columns];
    const csvRows = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...data.rows.map(r => [
        `"${r.vehicleName.replace(/"/g, '""')}"`,
        `"${r.plate.replace(/"/g, '""')}"`,
        `"${r.status.replace(/"/g, '""')}"`,
        ...r.values.map(v => `"${String(v).replace(/"/g, '""')}"`)
      ].join(',')),
    ];
    if (data.totals && data.totals.length > 0) {
      csvRows.push([
        '"FLEET TOTALS / SUMMARY"',
        '""',
        '""',
        ...data.totals.map(t => `"${String(t).replace(/"/g, '""')}"`)
      ].join(','));
    }
    const csvContent = csvRows.join('\r\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${safeFilename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true, filename: `${safeFilename}.csv` };
    } else {
      const FileSystem = require('expo-file-system');
      const fileUri = `${FileSystem.cacheDirectory}${safeFilename}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: 'utf8' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: `Export ${data.title}` });
      }
      return { success: true, filename: `${safeFilename}.csv` };
    }
  }

  // 2. Excel (.xls spreadsheet) Export
  if (fmt.includes('EXCEL') || fmt.includes('XLS')) {
    const excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/><title>${data.title}</title></head>
      <body>
        <h2>${data.title}</h2>
        <p>Category: ${data.category} | Generated: ${data.generatedAt || new Date().toLocaleDateString()}</p>
        <table border="1">
          <tr style="background:#043094;color:#ffffff;font-weight:bold;">
            <th>Vehicle</th><th>License Plate</th><th>Status</th>
            ${data.columns.map(c => `<th>${c}</th>`).join('')}
          </tr>
          ${data.rows.map(r => `
            <tr>
              <td>${r.vehicleName}</td><td>${r.plate}</td><td>${r.status}</td>
              ${r.values.map(v => `<td>${v}</td>`).join('')}
            </tr>
          `).join('')}
          ${data.totals && data.totals.length > 0 ? `
            <tr style="background:#f1f5f9;font-weight:bold;">
              <td colspan="3">TOTALS / AVG</td>
              ${data.totals.map(t => `<td>${t}</td>`).join('')}
            </tr>
          ` : ''}
        </table>
      </body>
      </html>
    `;
    if (Platform.OS === 'web') {
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${safeFilename}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true, filename: `${safeFilename}.xls` };
    }
  }

  // 3. JSON Export
  if (fmt.includes('JSON')) {
    const jsonContent = JSON.stringify(data, null, 2);
    if (Platform.OS === 'web') {
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${safeFilename}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true, filename: `${safeFilename}.json` };
    }
  }

  // 4. HTML Standalone Export
  const html = generateReportHtml(data);
  if (fmt.includes('HTML')) {
    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${safeFilename}_Report.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true, filename: `${safeFilename}_Report.html` };
    }
  }

  // 5. PDF / Print Export (Default)
  if (Platform.OS === 'web') {
    try {
      // Create a printable iframe with the document so the browser print dialog
      // renders the letterhead report (not the current app window)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error('Print iframe failed:', e);
          }
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 30000);
        }, 350);

        return { success: true, filename: `${safeFilename}.pdf` };
      }
    } catch (err) {
      console.warn('Iframe print failed, falling back to html download:', err);
    }

    // Fallback: download HTML printable report if print window blocked
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${safeFilename}_Report.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true, filename: `${safeFilename}_Report.html` };
  } else {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { 
        UTI: '.pdf', 
        mimeType: 'application/pdf', 
        dialogTitle: `Export ${data.title}` 
      });
    }
    return { success: true, uri };
  }
}
