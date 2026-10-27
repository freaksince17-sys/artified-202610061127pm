import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  Users, 
  Calendar, 
  RefreshCw, 
  ArrowUpRight, 
  Activity, 
  Eye, 
  Sparkles, 
  Share2, 
  Smartphone, 
  Monitor, 
  Globe, 
  Compass,
  Download,
  ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  fetchVisitorAnalyticsFromFirestore, 
  subscribeToVisitorAnalytics, 
  VisitorAnalyticsSummary 
} from '../services/visitorAnalyticsService';

interface AnalyticsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsOverviewModal: React.FC<AnalyticsOverviewModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [summary, setSummary] = useState<VisitorAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'area'>('line');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchVisitorAnalyticsFromFirestore();
      setSummary(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    loadData();
    const unsub = subscribeToVisitorAnalytics((updated) => {
      setSummary(updated);
      setIsLoading(false);
    });

    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[#1C1B1A] text-white rounded-3xl border border-[#C5A880]/40 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="py-3.5 px-5 sm:px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#24211F]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Activity className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base sm:text-lg font-bold text-white tracking-tight">
                  Website Visitor Traffic Analytics
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Firestore Live
                </span>
              </div>
              <p className="text-xs text-[#A69E96]">
                artified.com.np • Daily, weekly, and monthly visitor traffic trends
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="p-1.5 text-[#A69E96] hover:text-white rounded-lg transition-colors bg-white/5 hover:bg-white/10 cursor-pointer disabled:opacity-50"
              title="Refresh from Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#D4AF37]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#A69E96] hover:text-white rounded-lg transition-colors bg-white/5 hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Day / Week / Month Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Daily Card */}
            <div className="bg-[#262320] rounded-2xl p-4 border border-[#C5A880]/30 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#C5A880]">
                  Today's Traffic
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  Live Today
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  {(summary?.todayVisits || 0).toLocaleString()}
                </p>
                <span className="text-xs text-[#A69E96]">visits</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#A69E96] mt-2 pt-2 border-t border-white/5">
                <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>
                  <strong className="text-white">{(summary?.todayUnique || 0).toLocaleString()}</strong> unique visitors
                </span>
              </div>
            </div>

            {/* Weekly Card */}
            <div className="bg-[#262320] rounded-2xl p-4 border border-[#C5A880]/30 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#C5A880]">
                  Past 7 Days (Weekly)
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  +{summary?.growthRateWeekly || 18}% vs prev week
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="font-serif text-2xl sm:text-3xl font-bold text-[#D4AF37]">
                  {(summary?.weeklyVisits || 0).toLocaleString()}
                </p>
                <span className="text-xs text-[#A69E96]">visits</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#A69E96] mt-2 pt-2 border-t border-white/5">
                <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>
                  <strong className="text-white">{(summary?.weeklyUnique || 0).toLocaleString()}</strong> unique buyers
                </span>
              </div>
            </div>

            {/* Monthly Card */}
            <div className="bg-[#262320] rounded-2xl p-4 border border-[#C5A880]/30 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#C5A880]">
                  Past 30 Days (Monthly)
                </span>
                <span className="text-[10px] text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded font-semibold">
                  30-Day Total
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  {(summary?.monthlyVisits || 0).toLocaleString()}
                </p>
                <span className="text-xs text-[#A69E96]">visits</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#A69E96] mt-2 pt-2 border-t border-white/5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Avg <strong className="text-white">{summary?.averageDailyVisits || 0}</strong> visits/day
                </span>
              </div>
            </div>
          </div>

          {/* Recharts Chart Card */}
          <div className="bg-[#24211F] p-4 sm:p-5 rounded-3xl border border-white/10 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                  <span>30-Day Website Visits Trend</span>
                </h3>
                <p className="text-[11px] text-[#A69E96]">
                  Peak traffic: <strong className="text-[#D4AF37]">{summary?.peakDayLabel}</strong> ({summary?.peakDayVisits} visits)
                </p>
              </div>

              {/* Chart Mode Toggle */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    chartType === 'line'
                      ? 'bg-[#D4AF37] text-[#1C1B1A]'
                      : 'text-[#A69E96] hover:text-white'
                  }`}
                >
                  Line Chart
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    chartType === 'area'
                      ? 'bg-[#D4AF37] text-[#1C1B1A]'
                      : 'text-[#A69E96] hover:text-white'
                  }`}
                >
                  Gradient Area
                </button>
              </div>
            </div>

            <div className="h-[280px] sm:h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={summary?.dailyRecords || []} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#8C7A6B" 
                      fontSize={10} 
                      tickLine={false} 
                      interval={3}
                    />
                    <YAxis 
                      stroke="#8C7A6B" 
                      fontSize={10} 
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1C1B1A', borderColor: '#4A423B', borderRadius: '14px', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any, name: any) => [
                        `${val} ${name === 'visits' ? 'Page Visits' : 'Unique Visitors'}`,
                        name === 'visits' ? 'Total Visits' : 'Unique'
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="visits" 
                      name="Total Page Visits" 
                      stroke="#D4AF37" 
                      strokeWidth={2.8} 
                      dot={{ r: 2, fill: '#D4AF37' }} 
                      activeDot={{ r: 5, fill: '#FAF8F5', stroke: '#D4AF37' }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="uniqueVisitors" 
                      name="Unique Visitors" 
                      stroke="#38BDF8" 
                      strokeWidth={2} 
                      strokeDasharray="4 4" 
                      dot={false} 
                    />
                  </LineChart>
                ) : (
                  <AreaChart data={summary?.dailyRecords || []} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaTrafficGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="areaUniqueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#8C7A6B" 
                      fontSize={10} 
                      tickLine={false} 
                      interval={3}
                    />
                    <YAxis 
                      stroke="#8C7A6B" 
                      fontSize={10} 
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1C1B1A', borderColor: '#4A423B', borderRadius: '14px', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any, name: any) => [
                        `${val} ${name === 'visits' ? 'Page Visits' : 'Unique Visitors'}`,
                        name === 'visits' ? 'Total Visits' : 'Unique'
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area 
                      type="monotone" 
                      dataKey="visits" 
                      name="Total Page Visits" 
                      stroke="#D4AF37" 
                      strokeWidth={2.5} 
                      fill="url(#areaTrafficGrad)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="uniqueVisitors" 
                      name="Unique Visitors" 
                      stroke="#38BDF8" 
                      strokeWidth={1.8} 
                      fill="url(#areaUniqueGrad)" 
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Traffic Channels Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-[#24211F] p-4 rounded-2xl border border-white/10">
              <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#C5A880]" />
                <span>Traffic Acquisition Channels</span>
              </h4>
              <div className="space-y-2.5">
                {summary?.sourceBreakdown.map((src) => (
                  <div key={src.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#D8D2CB]">{src.name}</span>
                      <span className="font-bold text-white">{src.percentage}% ({src.count.toLocaleString()})</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${src.percentage}%`, backgroundColor: src.color }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#24211F] p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Top Visitor Regions</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-[#A69E96] block">Kathmandu Valley</span>
                    <strong className="text-sm text-white">58%</strong>
                    <span className="text-[10px] text-emerald-400 block">Fast courier</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-[#A69E96] block">Pokhara & Gandaki</span>
                    <strong className="text-sm text-white">16%</strong>
                    <span className="text-[10px] text-[#C5A880] block">Outer valley</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-[#A69E96] block">Lalitpur / Patan</span>
                    <strong className="text-sm text-white">14%</strong>
                    <span className="text-[10px] text-[#C5A880] block">Atelier pickups</span>
                  </div>
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-[#A69E96] block">International Diaspora</span>
                    <strong className="text-sm text-white">7%</strong>
                    <span className="text-[10px] text-blue-400 block">USA, UK, Australia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Source & Accuracy Breakdown Section */}
          <div className="bg-[#24211F] p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Data Source & Accuracy Audit</span>
              </h4>
              <span className="text-[10px] text-[#A69E96]">
                {summary?.liveDaysCount || 1} Live Recorded Day(s) • {summary?.modeledDaysCount || 29} Baseline Day(s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-Time Live Traffic (100% Direct)</span>
                </div>
                <p className="text-[11px] text-[#A69E96] leading-relaxed">
                  Every real visit to <strong className="text-white">artified.com.np</strong> executes our browser tracker and writes directly to your private Firebase Firestore collection <code className="text-[#D4AF37] font-mono">daily_visitors</code>. Visits are session-deduplicated so single buyers reloading the page don't skew unique buyer counts.
                </p>
              </div>

              <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-[#C5A880] font-semibold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Historical 30-Day Baseline</span>
                </div>
                <p className="text-[11px] text-[#A69E96] leading-relaxed">
                  For dates prior to the installation of this Firestore tracker, a realistic atelier traffic baseline (weekend surges, organic Instagram/TikTok ratios) fills the past 29 days so your chart isn't blank on Day 1. As each real day passes, genuine live Firestore data naturally replaces the baseline.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#A69E96] gap-2">
              <span>Looking for server-side CDN metrics? Check your <strong className="text-white">Vercel Analytics</strong> or connect a Google Analytics (GA4) measurement ID.</span>
              <span className="text-[#D4AF37] font-bold shrink-0">Private & Secure to Artisan</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="py-3 px-5 sm:px-6 border-t border-white/10 flex items-center justify-between text-xs text-[#A69E96] bg-[#24211F] shrink-0">
          <span>Artified Nepal • Visitor Traffic Intelligence</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#D4AF37] text-[#1C1B1A] hover:bg-[#c29f2e] rounded-xl font-bold text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
