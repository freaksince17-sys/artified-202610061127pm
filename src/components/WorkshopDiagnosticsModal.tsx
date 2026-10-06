import React, { useState, useEffect } from 'react';
import { 
  X, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Video, 
  Camera, 
  Flame, 
  ShieldCheck, 
  Zap, 
  FileText, 
  ExternalLink,
  Wrench,
  Copy,
  Check
} from 'lucide-react';
import { WorkshopMediaItem } from '../types';
import { runWorkshopMediaDiagnostic, refetchWorkshopMediaFromStorage, DiagnosticResult } from '../utils/workshopDiagnostics';

interface WorkshopDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: WorkshopMediaItem[];
  onMediaItemUpdated?: (updatedItem: WorkshopMediaItem) => void;
}

export const WorkshopDiagnosticsModal: React.FC<WorkshopDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  mediaItems,
  onMediaItemUpdated
}) => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'errors' | 'videos'>('all');
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [copiedLogs, setCopiedLogs] = useState(false);

  useEffect(() => {
    if (isOpen && mediaItems.length > 0) {
      runFullDiagnostic();
    }
  }, [isOpen]);

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);
    console.clear();
    console.info('🩺 Starting Full Workshop Masterclass Media Health & MIME Diagnostic Audit...');

    const tempResults: DiagnosticResult[] = [];

    for (const item of mediaItems) {
      const res = await runWorkshopMediaDiagnostic(item);
      tempResults.push(res);
      setResults([...tempResults]);
    }

    setIsRunning(false);
    console.info('🏁 Workshop Masterclass Diagnostic Audit Finished. Results:', tempResults);
  };

  const handleRepairItem = async (res: DiagnosticResult) => {
    setRepairingId(res.itemId);
    try {
      const originalItem = mediaItems.find((m) => m.id === res.itemId);
      if (!originalItem) return;

      const freshUrl = await refetchWorkshopMediaFromStorage(originalItem);
      const updatedItem: WorkshopMediaItem = {
        ...originalItem,
        url: freshUrl
      };

      if (onMediaItemUpdated) {
        onMediaItemUpdated(updatedItem);
      }

      // Re-run diagnostic on this specific item
      const retested = await runWorkshopMediaDiagnostic(updatedItem);
      setResults((prev) => prev.map((r) => (r.itemId === res.itemId ? retested : r)));
    } catch (e) {
      console.error('Failed to repair item:', e);
    } finally {
      setRepairingId(null);
    }
  };

  const copyDiagnosticSummary = () => {
    const text = JSON.stringify(results, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  if (!isOpen) return null;

  const healthyCount = results.filter((r) => r.status === 'healthy').length;
  const warningCount = results.filter((r) => r.status === 'warning').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  const filteredResults = results.filter((r) => {
    if (activeTab === 'errors') return r.status === 'error' || r.status === 'warning';
    if (activeTab === 'videos') return r.type === 'video';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#FAF8F5] dark:bg-[#181615] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#C5A880]/30 flex flex-col overflow-hidden text-[#1C1B1A] dark:text-[#F5F2EB]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8DFD8] dark:border-white/10 bg-white dark:bg-[#1E1C1A]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#C5A880]/15 text-[#C5A880]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold">
                Workshop Media Health & Storage Diagnostics
              </h2>
              <p className="text-xs text-[#7A746E] dark:text-[#A8A29D]">
                Verify Firebase Storage paths, video MIME headers, latency & cross-browser playback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runFullDiagnostic}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C5A880] hover:bg-[#B39366] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Auditing...' : 'Re-Run Audit'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#7A746E] hover:text-[#1C1B1A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F2EDE4] dark:bg-[#141312] border-b border-[#E8DFD8] dark:border-white/10">
          <div className="p-3 rounded-xl bg-white dark:bg-[#1E1C1A] border border-[#E8DFD8] dark:border-white/5 shadow-xs">
            <div className="text-[11px] font-medium text-[#7A746E] dark:text-[#A8A29D] uppercase tracking-wider">Total Scanned</div>
            <div className="text-xl font-bold font-serif mt-0.5">{results.length} / {mediaItems.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-[#1E1C1A] border border-emerald-500/20 shadow-xs">
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Healthy</span>
            </div>
            <div className="text-xl font-bold font-serif text-emerald-600 dark:text-emerald-400 mt-0.5">{healthyCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-[#1E1C1A] border border-amber-500/20 shadow-xs">
            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Warnings</span>
            </div>
            <div className="text-xl font-bold font-serif text-amber-600 dark:text-amber-400 mt-0.5">{warningCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-[#1E1C1A] border border-red-500/20 shadow-xs">
            <div className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
              <XCircle className="w-3.5 h-3.5" />
              <span>Errors</span>
            </div>
            <div className="text-xl font-bold font-serif text-red-600 dark:text-red-400 mt-0.5">{errorCount}</div>
          </div>
        </div>

        {/* Filter Tabs & Tools */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-white dark:bg-[#1E1C1A] border-b border-[#E8DFD8] dark:border-white/10 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'all' 
                  ? 'bg-[#C5A880] text-white shadow-xs' 
                  : 'text-[#7A746E] dark:text-[#A8A29D] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              All Items ({results.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('videos')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'videos' 
                  ? 'bg-[#C5A880] text-white shadow-xs' 
                  : 'text-[#7A746E] dark:text-[#A8A29D] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Videos Only
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('errors')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'errors' 
                  ? 'bg-red-600 text-white shadow-xs' 
                  : 'text-[#7A746E] dark:text-[#A8A29D] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Issues ({warningCount + errorCount})
            </button>
          </div>

          <button
            type="button"
            onClick={copyDiagnosticSummary}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[#E8DFD8] dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#7A746E] dark:text-[#A8A29D] transition-colors cursor-pointer"
          >
            {copiedLogs ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copiedLogs ? 'Copied JSON!' : 'Copy Telemetry'}</span>
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredResults.length === 0 ? (
            <div className="text-center py-12 text-[#7A746E] dark:text-[#A8A29D]">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium">No media issues found under this filter.</p>
            </div>
          ) : (
            filteredResults.map((res) => {
              const isHealthy = res.status === 'healthy';
              const isWarning = res.status === 'warning';
              const isError = res.status === 'error';

              return (
                <div 
                  key={res.itemId}
                  className={`p-3 rounded-xl border transition-all ${
                    isHealthy 
                      ? 'bg-white dark:bg-[#1E1C1A] border-[#E8DFD8] dark:border-white/5'
                      : isWarning
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-red-500/5 border-red-500/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isHealthy ? 'bg-emerald-500/15 text-emerald-600' : isWarning ? 'bg-amber-500/15 text-amber-600' : 'bg-red-500/15 text-red-600'
                      }`}>
                        {res.type === 'video' ? <Video className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-xs sm:text-sm truncate">
                            {res.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isHealthy ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' :
                            isWarning ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' :
                            'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                          }`}>
                            {res.status}
                          </span>
                          {res.firebaseStorageVerified && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-medium border border-amber-500/20">
                              <Flame className="w-2.5 h-2.5" />
                              <span>Firebase Storage</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#7A746E] dark:text-[#A8A29D] mt-1 font-mono truncate">
                          <span className="truncate">{res.url}</span>
                        </div>

                        {/* Metadata row */}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#7A746E] dark:text-[#A8A29D] flex-wrap">
                          <span>HTTP Status: <strong className="text-[#1C1B1A] dark:text-white">{res.httpStatus ?? 'Testing'}</strong></span>
                          <span>•</span>
                          <span>MIME Type: <strong className={res.isMimeCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{res.mimeType || 'Unknown'}</strong></span>
                          <span>•</span>
                          <span>Latency: <strong>{res.durationMs ? `${res.durationMs}ms` : '—'}</strong></span>
                          {res.contentLength && (
                            <>
                              <span>•</span>
                              <span>Size: <strong>{Math.round(res.contentLength / 1024)} KB</strong></span>
                            </>
                          )}
                        </div>

                        {res.errorMessage && (
                          <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{res.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRepairItem(res)}
                        disabled={repairingId === res.itemId}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#C5A880]/15 hover:bg-[#C5A880]/25 text-[#A38253] dark:text-[#E6CA9E] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${repairingId === res.itemId ? 'animate-spin' : ''}`} />
                        <span>{repairingId === res.itemId ? 'Repairing...' : 'Reload & Re-verify'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E8DFD8] dark:border-white/10 bg-white dark:bg-[#1E1C1A] flex items-center justify-between text-xs text-[#7A746E] dark:text-[#A8A29D]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Telemetry & auth logs streamed to developer console</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
