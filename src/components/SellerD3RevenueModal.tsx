import React, { useState, useEffect, useRef } from 'react';
import { X, TrendingUp, Calendar, DollarSign, RefreshCw, BarChart2, ShieldCheck, Download } from 'lucide-react';
import * as d3 from 'd3';
import { useCart } from '../context/CartContext';
import { getLocalSalesHistory, SalesHistoryRecord } from '../services/productSalesService';

interface SellerD3RevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SellerD3RevenueModal: React.FC<SellerD3RevenueModalProps> = ({ isOpen, onClose }) => {
  const { isSellerMode, products } = useCart();
  const [activeView, setActiveView] = useState<'daily' | 'monthly'>('daily');
  const [salesRecords, setSalesRecords] = useState<SalesHistoryRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const dailySvgRef = useRef<SVGSVGElement | null>(null);
  const monthlySvgRef = useRef<SVGSVGElement | null>(null);

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

  // Aggregate Sales History into Daily & Monthly Trends
  const dailyData = React.useMemo(() => {
    const map = new Map<string, { dateStr: string; dateObj: Date; revenue: number; units: number }>();
    for (const rec of salesRecords) {
      if (!rec || !rec.timestamp) continue;
      const d = new Date(rec.timestamp);
      if (isNaN(d.getTime())) continue;
      const dateStr = d.toISOString().split('T')[0];
      const prod = products.find((p) => p.id === rec.productId);
      const qty = Math.max(1, Number(rec.quantity) || 1);
      const unitPrice = Number(rec.unitPrice) > 0 ? Number(rec.unitPrice) : prod?.price || 1500;
      const rev = qty * unitPrice;

      const existing = map.get(dateStr) || { dateStr, dateObj: new Date(dateStr), revenue: 0, units: 0 };
      existing.revenue += rev;
      existing.units += qty;
      map.set(dateStr, existing);
    }
    const arr = Array.from(map.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    if (arr.length === 1) {
      // Add padding date for better D3 line rendering if only 1 day exists
      const prevDate = new Date(arr[0].dateObj.getTime() - 86400000);
      const prevStr = prevDate.toISOString().split('T')[0];
      return [{ dateStr: prevStr, dateObj: prevDate, revenue: 0, units: 0 }, ...arr];
    }
    return arr;
  }, [salesRecords, products]);

  const monthlyData = React.useMemo(() => {
    const map = new Map<string, { monthKey: string; label: string; dateObj: Date; revenue: number; units: number }>();
    for (const rec of salesRecords) {
      if (!rec || !rec.timestamp) continue;
      const d = new Date(rec.timestamp);
      if (isNaN(d.getTime())) continue;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const prod = products.find((p) => p.id === rec.productId);
      const qty = Math.max(1, Number(rec.quantity) || 1);
      const unitPrice = Number(rec.unitPrice) > 0 ? Number(rec.unitPrice) : prod?.price || 1500;
      const rev = qty * unitPrice;

      const existing = map.get(monthKey) || { monthKey, label, dateObj: new Date(`${monthKey}-01`), revenue: 0, units: 0 };
      existing.revenue += rev;
      existing.units += qty;
      map.set(monthKey, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [salesRecords, products]);

  const totalStoreRevenue = React.useMemo(() => dailyData.reduce((s, d) => s + d.revenue, 0), [dailyData]);
  const totalStoreUnits = React.useMemo(() => dailyData.reduce((s, d) => s + d.units, 0), [dailyData]);

  // Render D3 SVG Charts
  useEffect(() => {
    if (!isOpen || !isSellerMode) return;

    // 1. Render Daily Revenue D3 Area & Line Chart
    if (dailySvgRef.current && dailyData.length > 0) {
      const svg = d3.select(dailySvgRef.current);
      svg.selectAll('*').remove();

      const width = 640;
      const height = 240;
      const margin = { top: 20, right: 30, bottom: 40, left: 60 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleTime()
        .domain(d3.extent(dailyData, (d) => d.dateObj) as [Date, Date])
        .range([0, innerW]);

      const maxRev = d3.max(dailyData, (d) => d.revenue) || 1000;
      const yScale = d3
        .scaleLinear()
        .domain([0, maxRev * 1.15])
        .range([innerH, 0]);

      // Gradient Fill
      const defs = svg.append('defs');
      const gradient = defs
        .append('linearGradient')
        .attr('id', 'daily-revenue-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      gradient.append('stop').attr('offset', '0%').attr('stop-color', '#D4AF37').attr('stop-opacity', 0.45);
      gradient.append('stop').attr('offset', '100%').attr('stop-color', '#D4AF37').attr('stop-opacity', 0.0);

      // Area Path
      const area = d3
        .area<{ dateObj: Date; revenue: number }>()
        .x((d) => xScale(d.dateObj))
        .y0(innerH)
        .y1((d) => yScale(d.revenue))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(dailyData)
        .attr('fill', 'url(#daily-revenue-gradient)')
        .attr('d', area);

      // Line Path
      const line = d3
        .line<{ dateObj: Date; revenue: number }>()
        .x((d) => xScale(d.dateObj))
        .y((d) => yScale(d.revenue))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(dailyData)
        .attr('fill', 'none')
        .attr('stroke', '#D4AF37')
        .attr('stroke-width', 3)
        .attr('d', line);

      // Data Circles
      g.selectAll('.dot')
        .data(dailyData)
        .enter()
        .append('circle')
        .attr('cx', (d) => xScale(d.dateObj))
        .attr('cy', (d) => yScale(d.revenue))
        .attr('r', 4.5)
        .attr('fill', '#1C1B1A')
        .attr('stroke', '#D4AF37')
        .attr('stroke-width', 2);

      // Value Labels on Top
      g.selectAll('.label')
        .data(dailyData.filter((d) => d.revenue > 0))
        .enter()
        .append('text')
        .attr('x', (d) => xScale(d.dateObj))
        .attr('y', (d) => yScale(d.revenue) - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#1C1B1A')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .text((d) => `NPR ${d.revenue.toLocaleString()}`);

      // Axes
      const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat((d: any) => d3.timeFormat('%b %d')(d));
      const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}`);

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(xAxis)
        .selectAll('text')
        .attr('font-size', '9px')
        .attr('fill', '#736C65');

      g.append('g')
        .call(yAxis)
        .selectAll('text')
        .attr('font-size', '9px')
        .attr('fill', '#736C65');
    }

    // 2. Render Monthly Revenue D3 Bar Chart
    if (monthlySvgRef.current && monthlyData.length > 0) {
      const svg = d3.select(monthlySvgRef.current);
      svg.selectAll('*').remove();

      const width = 640;
      const height = 240;
      const margin = { top: 20, right: 30, bottom: 40, left: 60 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleBand()
        .domain(monthlyData.map((d) => d.label))
        .range([0, innerW])
        .padding(0.35);

      const maxRev = d3.max(monthlyData, (d) => d.revenue) || 1000;
      const yScale = d3
        .scaleLinear()
        .domain([0, maxRev * 1.15])
        .range([innerH, 0]);

      // Bars
      g.selectAll('.bar')
        .data(monthlyData)
        .enter()
        .append('rect')
        .attr('x', (d) => xScale(d.label) || 0)
        .attr('y', (d) => yScale(d.revenue))
        .attr('width', xScale.bandwidth())
        .attr('height', (d) => innerH - yScale(d.revenue))
        .attr('fill', '#1C1B1A')
        .attr('rx', 6);

      // Value Labels on Bars
      g.selectAll('.bar-label')
        .data(monthlyData)
        .enter()
        .append('text')
        .attr('x', (d) => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
        .attr('y', (d) => yScale(d.revenue) - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', '#C5A880')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text((d) => `NPR ${d.revenue.toLocaleString()}`);

      // Axes
      const xAxis = d3.axisBottom(xScale);
      const yAxis = d3.axisLeft(yScale).ticks(5);

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(xAxis)
        .selectAll('text')
        .attr('font-size', '10px')
        .attr('fill', '#736C65');

      g.append('g')
        .call(yAxis)
        .selectAll('text')
        .attr('font-size', '9px')
        .attr('fill', '#736C65');
    }
  }, [isOpen, isSellerMode, activeView, dailyData, monthlyData]);

  if (!isSellerMode || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF8F5] border-2 border-[#C5A880] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#1C1B1A] text-white p-4 flex items-center justify-between border-b border-[#34312F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base sm:text-lg font-bold text-white tracking-wide">
                  Revenue Analytics Studio (D3 Visualization)
                </h2>
                <span className="text-[9px] bg-[#D4AF37] text-[#1C1B1A] font-bold px-1.5 py-0.2 rounded">
                  Seller Studio Only
                </span>
              </div>
              <p className="text-[10px] text-[#A69E96]">
                Visualizing <strong className="text-white">sales_history</strong> collection in Firestore & runtime ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-[#1C1B1A]">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-[#E8DFD8] shadow-2xs">
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block">
                Total Verified Sales
              </span>
              <p className="font-serif text-lg font-extrabold text-[#1C1B1A] mt-0.5">
                NPR {totalStoreRevenue.toLocaleString()}
              </p>
              <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded">
                Verified Orders
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-[#E8DFD8] shadow-2xs">
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block">
                Creations Sold
              </span>
              <p className="font-serif text-lg font-extrabold text-[#1C1B1A] mt-0.5">
                {totalStoreUnits} Pieces
              </p>
              <span className="text-[9px] text-[#C5A880] font-bold">
                From sales_history
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-[#E8DFD8] shadow-2xs">
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block">
                Active Tracking Period
              </span>
              <p className="font-serif text-base font-bold text-[#1C1B1A] mt-0.5">
                {dailyData.length} Active Days
              </p>
              <span className="text-[9px] text-[#736C65]">
                {monthlyData.length} Month{monthlyData.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-[#E8DFD8] shadow-2xs">
              <span className="text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider block">
                Average Daily Sales
              </span>
              <p className="font-serif text-lg font-extrabold text-[#1C1B1A] mt-0.5">
                NPR {Math.round(totalStoreRevenue / Math.max(1, dailyData.length)).toLocaleString()}
              </p>
              <span className="text-[9px] text-emerald-700 font-bold">
                Real-time Trend
              </span>
            </div>
          </div>

          {/* Toggle Tab Row */}
          <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-[#E8DFD8]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveView('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'daily'
                    ? 'bg-[#1C1B1A] text-[#D4AF37] shadow-2xs'
                    : 'bg-[#FAF8F5] text-[#736C65] hover:text-[#1C1B1A]'
                }`}
              >
                Daily Revenue Trend (D3 SVG Area)
              </button>

              <button
                type="button"
                onClick={() => setActiveView('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'monthly'
                    ? 'bg-[#1C1B1A] text-[#D4AF37] shadow-2xs'
                    : 'bg-[#FAF8F5] text-[#736C65] hover:text-[#1C1B1A]'
                }`}
              >
                Monthly Revenue Trend (D3 Bar)
              </button>
            </div>

            <span className="text-[10px] text-[#8C7A6B] font-mono hidden sm:inline">
              Built with D3.js v7.9
            </span>
          </div>

          {/* D3 SVG Canvas Container */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8DFD8] shadow-2xs flex flex-col items-center justify-center">
            {activeView === 'daily' ? (
              <div className="w-full overflow-x-auto">
                <svg
                  ref={dailySvgRef}
                  viewBox="0 0 640 240"
                  className="w-full max-w-2xl h-auto mx-auto"
                />
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <svg
                  ref={monthlySvgRef}
                  viewBox="0 0 640 240"
                  className="w-full max-w-2xl h-auto mx-auto"
                />
              </div>
            )}
          </div>

          {/* Breakdown List */}
          <div className="bg-white p-4 rounded-xl border border-[#E8DFD8] space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center justify-between">
              <span>{activeView === 'daily' ? 'Daily Revenue Log' : 'Monthly Summary Log'}</span>
              <span className="text-[10px] text-[#736C65] font-normal">
                Strictly invisible to customers
              </span>
            </h3>

            <div className="divide-y divide-[#F0EBE5] max-h-48 overflow-y-auto text-xs">
              {(activeView === 'daily' ? dailyData : monthlyData).map((item: any, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#1C1B1A]">
                      {activeView === 'daily' ? item.dateStr : item.label}
                    </span>
                    <span className="text-[10px] text-[#736C65] ml-2">
                      ({item.units} unit{item.units === 1 ? '' : 's'} sold)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#1C1B1A]">
                    NPR {item.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
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
            Close Analytics
          </button>
        </div>
      </div>
    </div>
  );
};
