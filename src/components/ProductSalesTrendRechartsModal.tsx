import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  TrendingUp, 
  Calendar, 
  RefreshCw, 
  BarChart3, 
  Download, 
  ShieldCheck, 
  Filter, 
  Sparkles,
  Layers,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { useCart } from '../context/CartContext';
import { getLocalSalesHistory, SalesHistoryRecord } from '../services/productSalesService';

interface ProductSalesTrendRechartsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProductSalesTrendRechartsModal: React.FC<ProductSalesTrendRechartsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { isSellerMode, products } = useCart();
  const [salesRecords, setSalesRecords] = useState<SalesHistoryRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [timeGranularity, setTimeGranularity] = useState<'daily' | 'weekly'>('daily');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [reportDownloadNotice, setReportDownloadNotice] = useState(false);

  const reloadData = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/sales/history?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.salesHistory) && data.salesHistory.length > 0) {
          setSalesRecords(data.salesHistory);
          setIsSyncing(false);
          return;
        }
      }
    } catch {}
    setSalesRecords(getLocalSalesHistory(products));
    setIsSyncing(false);
  };

  useEffect(() => {
    if (isOpen && isSellerMode) {
      reloadData();
    }
  }, [isOpen, isSellerMode]);

  // Aggregate Sales History by Product & Granularity (Daily / Weekly)
  const filteredRecords = useMemo(() => {
    if (selectedProductId === 'all') return salesRecords;
    return salesRecords.filter((r) => r.productId === selectedProductId);
  }, [salesRecords, selectedProductId]);

  const trendData = useMemo(() => {
    const map = new Map<string, { label: string; rawDate: Date; units: number; revenue: number }>();

    for (const rec of filteredRecords) {
      if (!rec || !rec.timestamp) continue;
      const d = new Date(rec.timestamp);
      if (isNaN(d.getTime())) continue;

      let key = '';
      let label = '';

      if (timeGranularity === 'daily') {
        key = d.toISOString().split('T')[0];
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        // Weekly grouping (ISO week or start of week)
        const dayOfWeek = d.getDay(); // 0 is Sunday
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - dayOfWeek);
        key = startOfWeek.toISOString().split('T')[0];
        label = `Week of ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }

      const prod = products.find((p) => p.id === rec.productId);
      const qty = Math.max(1, Number(rec.quantity) || 1);
      const unitPrice = Number(rec.unitPrice) > 0 ? Number(rec.unitPrice) : prod?.price || 1500;
      const rev = qty * unitPrice;

      const existing = map.get(key) || { label, rawDate: d, units: 0, revenue: 0 };
      existing.units += qty;
      existing.revenue += rev;
      map.set(key, existing);
    }

    const result = Array.from(map.entries())
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => new Date(a.key).getTime() - new Date(b.key).getTime());

    if (result.length === 1 && timeGranularity === 'daily') {
      const singleDate = new Date(result[0].key);
      const prevDate = new Date(singleDate.getTime() - 86400000);
      const prevKey = prevDate.toISOString().split('T')[0];
      const prevLabel = prevDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return [{ key: prevKey, label: prevLabel, rawDate: prevDate, units: 0, revenue: 0 }, ...result];
    }

    return result;
  }, [filteredRecords, products, timeGranularity]);

  // Peak Interest Time calculation
  const peakTimePoint = useMemo(() => {
    if (trendData.length === 0) return null;
    let max = trendData[0];
    for (const item of trendData) {
      if (item.units > max.units || (item.units === max.units && item.revenue > max.revenue)) {
        max = item;
      }
    }
    return max.units > 0 ? max : null;
  }, [trendData]);

  // Current Month Aggregated Sales Report per Product
  const currentMonthReport = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const prodMap = new Map<string, {
      productId: string;
      title: string;
      category: string;
      unitsSold: number;
      totalRevenue: number;
      avgUnitPrice: number;
    }>();

    let monthTotalRev = 0;
    let monthTotalUnits = 0;

    for (const rec of salesRecords) {
      if (!rec || !rec.timestamp) continue;
      const d = new Date(rec.timestamp);
      if (isNaN(d.getTime())) continue;

      const recYearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (recYearMonth !== currentYearMonth) continue;

      const prod = products.find((p) => p.id === rec.productId);
      const title = prod?.title || rec.productTitle || rec.productId || 'Handcrafted Artisan Piece';
      const category = prod?.category || rec.category || 'Jewelry & Accessories';
      const qty = Math.max(1, Number(rec.quantity) || 1);
      const unitPrice = Number(rec.unitPrice) > 0 ? Number(rec.unitPrice) : prod?.price || 1500;
      const rev = qty * unitPrice;

      monthTotalRev += rev;
      monthTotalUnits += qty;

      const existing = prodMap.get(rec.productId) || {
        productId: rec.productId,
        title,
        category,
        unitsSold: 0,
        totalRevenue: 0,
        avgUnitPrice: unitPrice
      };

      existing.unitsSold += qty;
      existing.totalRevenue += rev;
      prodMap.set(rec.productId, existing);
    }

    const items = Array.from(prodMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      currentMonthName,
      monthTotalRev,
      monthTotalUnits,
      items
    };
  }, [salesRecords, products]);

  // Download CSV Sales Report for Current Month
  const handleDownloadReport = () => {
    const { currentMonthName, monthTotalRev, monthTotalUnits, items } = currentMonthReport;
    
    let csvContent = `Artified Workshop - Monthly Sales Report (${currentMonthName})\n`;
    csvContent += `Generated On,${new Date().toLocaleString()}\n`;
    csvContent += `Total Revenue (NPR),${monthTotalRev}\n`;
    csvContent += `Total Units Sold,${monthTotalUnits}\n\n`;
    csvContent += `Product ID,Product Title,Category,Units Sold,Unit Price (NPR),Total Revenue (NPR)\n`;

    for (const item of items) {
      const safeTitle = `"${item.title.replace(/"/g, '""')}"`;
      const safeCat = `"${item.category.replace(/"/g, '""')}"`;
      csvContent += `${item.productId},${safeTitle},${safeCat},${item.unitsSold},${item.avgUnitPrice},${item.totalRevenue}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `artified_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setReportDownloadNotice(true);
    setTimeout(() => setReportDownloadNotice(false), 3000);
  };

  if (!isSellerMode || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF8F5] border-2 border-[#C5A880] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1C1B1A] text-white p-4 flex items-center justify-between border-b border-[#34312F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base sm:text-lg font-bold text-white tracking-wide">
                  Product Sales Trends (Recharts Visualization)
                </h2>
                <span className="text-[9px] bg-[#D4AF37] text-[#1C1B1A] font-bold px-1.5 py-0.2 rounded">
                  Seller Studio Only
                </span>
              </div>
              <p className="text-[10px] text-[#A69E96]">
                Analyzing peak customer interest times & product performance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadReport}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] text-[#1C1B1A] hover:bg-[#c29f2e] font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Download CSV Sales Report for current month"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sales Report</span>
            </button>

            <button
              type="button"
              onClick={reloadData}
              disabled={isSyncing}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10 cursor-pointer"
              title="Refresh sales history"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#A69E96] hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Toast */}
        {reportDownloadNotice && (
          <div className="bg-emerald-900 text-emerald-100 text-xs px-4 py-2 flex items-center gap-2 font-medium">
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Sales Report downloaded! Monthly summary CSV saved to your downloads folder.</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-[#1C1B1A]">
          {/* Controls Bar: Granularity & Product Selector */}
          <div className="bg-white p-3 rounded-xl border border-[#E8DFD8] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
            {/* Product Dropdown */}
            <div className="flex items-center gap-2 flex-1">
              <Filter className="w-4 h-4 text-[#C5A880] shrink-0" />
              <label className="text-xs font-bold text-[#1C1B1A] shrink-0">Product Filter:</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 text-xs px-3 py-1.5 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] font-medium focus:outline-none focus:border-[#C5A880]"
              >
                <option value="all">★ All Store Products Combined</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Granularity Toggle */}
            <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-lg border border-[#E8DFD8]">
              <button
                type="button"
                onClick={() => setTimeGranularity('daily')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  timeGranularity === 'daily'
                    ? 'bg-[#1C1B1A] text-[#D4AF37] shadow-2xs'
                    : 'text-[#736C65] hover:text-[#1C1B1A]'
                }`}
              >
                Daily Trends
              </button>

              <button
                type="button"
                onClick={() => setTimeGranularity('weekly')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  timeGranularity === 'weekly'
                    ? 'bg-[#1C1B1A] text-[#D4AF37] shadow-2xs'
                    : 'text-[#736C65] hover:text-[#1C1B1A]'
                }`}
              >
                Weekly Trends
              </button>
            </div>
          </div>

          {/* Peak Interest Highlight Banner */}
          {peakTimePoint && (
            <div className="p-3.5 bg-gradient-to-r from-[#1C1B1A] to-[#2C2927] text-white rounded-xl border border-[#C5A880]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37]">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider block">
                    Peak Interest Discovery
                  </span>
                  <p className="text-xs sm:text-sm font-semibold">
                    Highest sales activity occurred on <strong className="text-[#E6C687] font-bold">{peakTimePoint.label}</strong> with <strong className="text-white">{peakTimePoint.units} unit{peakTimePoint.units === 1 ? '' : 's'} sold</strong> (NPR {peakTimePoint.revenue.toLocaleString()}).
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-stone-300 whitespace-nowrap font-mono">
                Recharts Peak Insight
              </span>
            </div>
          )}

          {/* Recharts Chart 1: Units Sold Trend Area Chart */}
          <div className="bg-white p-4 rounded-xl border border-[#E8DFD8] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Units Sold Trend ({timeGranularity === 'daily' ? 'Daily' : 'Weekly'})</span>
              </h3>
              <span className="text-[10px] text-[#736C65] font-mono">
                Interactive Recharts Area
              </span>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rechartsUnitsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C5A880" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#C5A880" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE5" />
                  <XAxis dataKey="label" stroke="#736C65" fontSize={10} tickLine={false} />
                  <YAxis stroke="#736C65" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1B1A', borderColor: '#C5A880', borderRadius: '8px', color: '#FFF' }}
                    itemStyle={{ color: '#E6C687', fontSize: '11px' }}
                    labelStyle={{ color: '#FFF', fontWeight: 'bold', fontSize: '12px' }}
                    formatter={(value: any) => [`${value} Units`, 'Units Sold']}
                  />
                  <Area
                    type="monotone"
                    dataKey="units"
                    stroke="#C5A880"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#rechartsUnitsGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recharts Chart 2: Revenue Bar Chart */}
          <div className="bg-white p-4 rounded-xl border border-[#E8DFD8] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Revenue Generated (NPR)</span>
              </h3>
              <span className="text-[10px] text-[#736C65] font-mono">
                Interactive Recharts Bars
              </span>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE5" />
                  <XAxis dataKey="label" stroke="#736C65" fontSize={10} tickLine={false} />
                  <YAxis stroke="#736C65" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1B1A', borderColor: '#C5A880', borderRadius: '8px', color: '#FFF' }}
                    itemStyle={{ color: '#D4AF37', fontSize: '11px' }}
                    labelStyle={{ color: '#FFF', fontWeight: 'bold', fontSize: '12px' }}
                    formatter={(value: any) => [`NPR ${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#1C1B1A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Current Month Sales Summary Table */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E8DFD8] space-y-3">
            <div className="flex items-center justify-between border-b border-[#F0EBE5] pb-2.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#C5A880]" />
                  <span>Current Month Summary ({currentMonthReport.currentMonthName})</span>
                </h3>
                <p className="text-[10px] text-[#736C65]">
                  Aggregated from sales_history collection in Firestore
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="px-3 py-1.5 bg-[#FAF8F5] border border-[#C5A880] text-[#1C1B1A] hover:bg-[#F4EFEB] font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Export CSV Report</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF8F5] text-[#8C7A6B] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-2">Product</th>
                    <th className="p-2">Category</th>
                    <th className="p-2 text-center">Units Sold</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE5]">
                  {currentMonthReport.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-[#736C65] italic">
                        No sales recorded yet for {currentMonthReport.currentMonthName}.
                      </td>
                    </tr>
                  ) : (
                    currentMonthReport.items.map((item) => (
                      <tr key={item.productId} className="hover:bg-[#FAF8F5]/80">
                        <td className="p-2 font-bold text-[#1C1B1A]">{item.title}</td>
                        <td className="p-2 text-[#736C65]">{item.category}</td>
                        <td className="p-2 text-center font-semibold text-[#1C1B1A]">{item.unitsSold}</td>
                        <td className="p-2 text-right font-mono text-[#736C65]">NPR {item.avgUnitPrice.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold text-[#1C1B1A]">NPR {item.totalRevenue.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-[#FAF8F5] font-bold text-[#1C1B1A] border-t-2 border-[#E8DFD8]">
                  <tr>
                    <td colSpan={2} className="p-2">Month Total Summary</td>
                    <td className="p-2 text-center text-[#D4AF37]">{currentMonthReport.monthTotalUnits} Units</td>
                    <td className="p-2"></td>
                    <td className="p-2 text-right font-mono text-emerald-800">NPR {currentMonthReport.monthTotalRev.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-4 py-3 border-t border-[#E8DFD8] flex items-center justify-between">
          <span className="text-[10px] text-[#736C65] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Protected Seller Analytics • Only rendered when isSellerMode is enabled</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1C1B1A] text-white text-xs font-bold rounded-lg hover:bg-black cursor-pointer"
          >
            Close Trends
          </button>
        </div>
      </div>
    </div>
  );
};
