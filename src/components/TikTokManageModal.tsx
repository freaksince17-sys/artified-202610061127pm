import React, { useState, useEffect } from 'react';
import { 
  X, 
  Video, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Check, 
  Sparkles, 
  Link as LinkIcon, 
  RefreshCw, 
  AlertCircle, 
  Upload, 
  Image as ImageIcon,
  Eye,
  Heart,
  Sliders,
  Download
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { TikTokReel } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { getReelCoverImage } from './TikTokShowcase';
import { InstagramReelDownloaderSection } from './InstagramReelDownloaderSection';

export const TikTokManageModal: React.FC = () => {
  const { 
    isTikTokManagerOpen, 
    setIsTikTokManagerOpen, 
    reels, 
    updateReel, 
    addReel, 
    deleteReel, 
    products,
    editingReel,
    setEditingReel
  } = useCart();

  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'downloader'>('list');
  const [reelId, setReelId] = useState('');
  const [title, setTitle] = useState('');
  const [handle, setHandle] = useState('@artified_np');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCaption, setVideoCaption] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [featuredProductId, setFeaturedProductId] = useState('');
  
  // Display settings: Views and Likes toggles per video
  const [views, setViews] = useState('1.2k');
  const [likes, setLikes] = useState('240');
  const [showViews, setShowViews] = useState(false);
  const [showLikes, setShowLikes] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingTikTok, setIsFetchingTikTok] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetchSuccessMessage, setFetchSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Inline delete confirmation states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeletingEditorReel, setIsDeletingEditorReel] = useState(false);

  // When opening for edit
  useEffect(() => {
    if (editingReel) {
      setReelId(editingReel.id);
      setTitle(editingReel.title);
      setHandle(editingReel.handle || '@artified_np');
      setVideoUrl(editingReel.videoUrl || '');
      setVideoCaption(editingReel.videoCaption || '');
      setThumbnail(editingReel.thumbnail || '');
      setFeaturedProductId(editingReel.featuredProductId || '');
      setViews(editingReel.views || '1.2k');
      setLikes(editingReel.likes || '240');
      setShowViews(Boolean(editingReel.showViews));
      setShowLikes(Boolean(editingReel.showLikes));
      setActiveTab('editor');
    } else {
      resetForm();
    }
  }, [editingReel, isTikTokManagerOpen, products]);

  const resetForm = () => {
    setReelId('');
    setTitle('');
    setHandle('@artified_np');
    setVideoUrl('');
    setVideoCaption('');
    setThumbnail('');
    setFeaturedProductId('');
    setViews('1.2k');
    setLikes('240');
    setShowViews(false);
    setShowLikes(false);
    setErrorMessage('');
    setFetchSuccessMessage('');
    setIsDeletingEditorReel(false);
  };

  if (!isTikTokManagerOpen) return null;

  const handleCreateNew = () => {
    setEditingReel(null);
    resetForm();
    setActiveTab('editor');
  };

  const handleEditClick = (reel: TikTokReel) => {
    setEditingReel(reel);
    setActiveTab('editor');
  };

  // Custom photo upload
  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      try {
        const compressed = await compressImage(rawBase64, 800, 1200, 0.82);
        setThumbnail(compressed);
      } catch {
        setThumbnail(rawBase64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Auto-sync video title, handle & cover photo directly from TikTok
  const fetchTikTokDetails = async (targetUrl?: string) => {
    const urlToFetch = (targetUrl || videoUrl || '').trim();
    if (!urlToFetch) {
      setErrorMessage('Please enter a TikTok video URL first (e.g. https://www.tiktok.com/@artified_np/video/...)');
      return;
    }

    setIsFetchingTikTok(true);
    setErrorMessage('');
    setFetchSuccessMessage('');

    try {
      const res = await fetch(`/api/tiktok-info?url=${encodeURIComponent(urlToFetch)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not fetch TikTok data. Please verify the URL.');
      }

      if (data.title) {
        setTitle(data.title.slice(0, 120));
        setVideoCaption(data.title);
      }
      if (data.author_unique_id) {
        setHandle(`@${data.author_unique_id}`);
      } else if (data.author_name) {
        setHandle(`@${data.author_name}`);
      }
      if (data.thumbnail_url) {
        setThumbnail(data.thumbnail_url);
      }

      setFetchSuccessMessage('✓ Automatically filled information from TikTok! You can edit any details below.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync from TikTok.');
    } finally {
      setIsFetchingTikTok(false);
    }
  };

  // Automatically trigger when URL is pasted
  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && pasted.includes('tiktok.com')) {
      setVideoUrl(pasted);
      fetchTikTokDetails(pasted);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter a video title.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Find linked product name if any
      const matchedProd = products.find((p) => p.id === featuredProductId);

      const payload: TikTokReel = {
        id: reelId || `reel_${Date.now()}`,
        title: title.trim(),
        handle: handle.trim() || '@artified_np',
        videoUrl: videoUrl.trim(),
        videoCaption: videoCaption.trim(),
        thumbnail: thumbnail.trim(),
        views: views.trim() || '1.2k',
        likes: likes.trim() || '240',
        showViews,
        showLikes,
        featuredProductId: featuredProductId || '',
        featuredProductName: matchedProd ? matchedProd.title : '',
      };

      if (reelId) {
        await updateReel(payload);
      } else {
        await addReel(payload);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTab('list');
        setEditingReel(null);
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save reel');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Immediate delete without window.confirm
  const handleConfirmDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteReel(id);
      setDeleteConfirmId(null);
      if (editingReel?.id === id || reelId === id) {
        setEditingReel(null);
        setActiveTab('list');
      }
    } catch (err: any) {
      setErrorMessage('Failed to delete: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF8F5] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#E8DFD8] flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8DFD8] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1C1B1A] flex items-center justify-center text-white shadow-xs">
              <Video className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-semibold text-[#1C1B1A]">
                  TikTok Videos Manager
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F4EFEB] text-[#8C7A6B] px-2 py-0.5 rounded-full border border-[#E8DFD8]">
                  Seller Studio
                </span>
              </div>
              <p className="text-xs text-[#736C65]">
                Link TikTok videos from @artified_np, customize view/like display, and attach products.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsTikTokManagerOpen(false);
              setEditingReel(null);
            }}
            className="p-1.5 text-[#8C7A6B] hover:text-[#1C1B1A] rounded-lg hover:bg-[#F4EFEB] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#E8DFD8] bg-[#F4EFEB]/50 px-4 sm:px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === 'list'
                ? 'bg-white text-[#1C1B1A] border-t-2 border-[#1C1B1A] shadow-xs'
                : 'text-[#8C7A6B] hover:text-[#1C1B1A]'
            }`}
          >
            Your Active Videos ({reels.length})
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'list') handleCreateNew();
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'editor'
                ? 'bg-white text-[#1C1B1A] border-t-2 border-[#1C1B1A] shadow-xs'
                : 'text-[#8C7A6B] hover:text-[#1C1B1A]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingReel ? 'Edit Video Details' : 'Add New TikTok Video'}</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('downloader')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'downloader'
                ? 'bg-white text-[#1C1B1A] border-t-2 border-[#1C1B1A] shadow-xs'
                : 'text-[#8C7A6B] hover:text-[#1C1B1A]'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Reel Downloader</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#736C65]">
                  Manage your videos shown under "As Seen On TikTok". Tap any card to edit, or use the trash icon to delete.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1B1A] text-white rounded-lg text-xs font-semibold hover:bg-[#34312F] shadow-xs shrink-0 ml-2"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Add TikTok Video</span>
                </button>
              </div>

              {reels.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-[#D5C7BC] rounded-2xl bg-white/50 p-6">
                  <div className="w-12 h-12 rounded-full bg-[#FAF8F5] flex items-center justify-center mx-auto mb-3 text-[#8C7A6B]">
                    <Video className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                  <h4 className="font-serif text-sm font-semibold text-[#1C1B1A]">No TikTok Videos Added Yet</h4>
                  <p className="text-xs text-[#736C65] max-w-sm mx-auto mt-1 mb-4">
                    Link your videos from TikTok. Simply paste your link and all details will fill automatically!
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1C1B1A] text-white rounded-lg text-xs font-semibold hover:bg-[#34312F]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Your First TikTok Video</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {reels.map((reel) => {
                    const isConfirming = deleteConfirmId === reel.id;

                    return (
                      <div
                        key={reel.id}
                        className="bg-white border border-[#E8DFD8] rounded-xl p-3 flex gap-3 shadow-xs hover:border-[#8C7A6B] transition-all group relative cursor-pointer"
                        onClick={() => handleEditClick(reel)}
                      >
                        {/* Thumbnail */}
                        <div className="w-20 h-28 rounded-lg overflow-hidden bg-black shrink-0 relative flex items-center justify-center">
                          {reel.thumbnail?.trim() ? (
                            <img
                              src={reel.thumbnail.trim()}
                              alt={reel.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/og-image.jpg';
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white p-1 text-center">
                              <Video className="w-5 h-5 text-[#D4AF37] mb-1" />
                              <span className="text-[8px] text-zinc-400">No Photo</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <Video className="w-4 h-4 text-white drop-shadow-md" />
                          </div>

                          {/* Metric indicator badge */}
                          {(reel.showViews || reel.showLikes) && (
                            <div className="absolute bottom-1 left-1 flex gap-0.5 z-10">
                              {reel.showViews && (
                                <span className="bg-black/80 text-[8px] text-[#D4AF37] px-1 rounded flex items-center gap-0.5">
                                  <Eye className="w-2 h-2" />
                                </span>
                              )}
                              {reel.showLikes && (
                                <span className="bg-black/80 text-[8px] text-rose-400 px-1 rounded flex items-center gap-0.5">
                                  <Heart className="w-2 h-2 fill-current" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-[10px] font-semibold text-[#8C7A6B] truncate">
                                {reel.handle || '@artified_np'}
                              </span>
                              
                              {/* Inline Delete Button */}
                              <div onClick={(e) => e.stopPropagation()}>
                                {isConfirming ? (
                                  <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 p-1 rounded">
                                    <button
                                      type="button"
                                      onClick={(e) => handleConfirmDelete(reel.id, e)}
                                      className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded hover:bg-rose-700"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="text-[10px] text-zinc-600 hover:text-black px-1"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(reel.id)}
                                    className="text-zinc-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                    title="Delete video"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <h4 className="text-xs font-semibold text-[#1C1B1A] line-clamp-2 mt-1 leading-snug">
                              {reel.title}
                            </h4>
                          </div>

                          <div className="mt-2 pt-2 border-t border-[#F4EFEB] flex items-center justify-between text-[10px]">
                            <span className="text-[#554E48] truncate pr-2">
                              {reel.featuredProductId && reel.featuredProductName ? (
                                <>🛍️ {reel.featuredProductName}</>
                              ) : (
                                <span className="text-[#A39990] italic">None (No product)</span>
                              )}
                            </span>
                            <span className="font-semibold text-[#8C7A6B] group-hover:text-[#1C1B1A] flex items-center gap-0.5 shrink-0">
                              Edit <Edit3 className="w-2.5 h-2.5 ml-0.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'editor' && (
            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Instructions banner */}
              <div className="p-3 bg-[#EAE0D5]/50 border border-[#D5C7BC] rounded-xl flex items-start gap-2.5 text-xs text-[#4A423B]">
                <Sparkles className="w-4 h-4 text-[#8C7A6B] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1C1B1A]">Automatic Fill on Paste:</p>
                  <p className="text-[11px] text-[#554E48] mt-0.5 leading-relaxed">
                    Paste your TikTok link below — the title, author handle, and cover photo will <strong>fill automatically</strong>! You can customize display settings, metrics, and linked products below.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {fetchSuccessMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{fetchSuccessMessage}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Saved to Cloud Firestore and live across all devices!</span>
                </div>
              )}

              {/* Video URL with Auto-Fetch Button */}
              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  TikTok Video URL (Paste link from TikTok) *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8C7A6B]">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="url"
                      required
                      value={videoUrl}
                      onPaste={handleUrlPaste}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="Paste: https://www.tiktok.com/@artified_np/video/..."
                      className="w-full pl-9 pr-24 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                    />
                    {videoUrl && (
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#8C7A6B] hover:text-[#1C1B1A] bg-[#F4EFEB] px-2 py-1 rounded flex items-center gap-1"
                      >
                        <span>Test</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchTikTokDetails()}
                    disabled={isFetchingTikTok || !videoUrl}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#FAF8F5] hover:bg-white text-[#1C1B1A] border border-[#D5C7BC] rounded-lg text-xs font-semibold shadow-xs disabled:opacity-40 transition-colors shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${isFetchingTikTok ? 'animate-spin' : ''}`} />
                    <span>{isFetchingTikTok ? 'Fetching...' : '⚡ Auto-Sync Details'}</span>
                  </button>
                </div>
              </div>

              {/* Title & Handle (Fully Editable) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Video Title / Headline (Editable) *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Video title from TikTok..."
                    className="w-full px-3 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    TikTok Handle (Editable)
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@artified_np"
                    className="w-full px-3 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                  />
                </div>
              </div>

              {/* Caption (Fully Editable) */}
              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Video Caption / Description (Editable)
                </label>
                <textarea
                  rows={2}
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                  placeholder="Caption and hashtags from TikTok..."
                  className="w-full px-3 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                />
              </div>

              {/* TOGGLE DISPLAY SETTINGS: VIEW & LIKE COUNTS */}
              <div className="p-3.5 bg-white border border-[#E8DFD8] rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#D4AF37]" />
                  <div>
                    <h4 className="text-xs font-bold text-[#1C1B1A]">
                      Display Settings (Views & Likes Badges)
                    </h4>
                    <p className="text-[11px] text-[#736C65]">
                      Choose whether to show view count and like count badges on this video.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  
                  {/* View Count Toggle & Input */}
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E8DFD8] space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-[#8C7A6B]" />
                        <span className="text-xs font-semibold text-[#1C1B1A]">Show View Count</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showViews}
                        onChange={(e) => setShowViews(e.target.checked)}
                        className="w-4 h-4 text-[#1C1B1A] accent-[#1C1B1A] rounded cursor-pointer"
                      />
                    </label>

                    {showViews ? (
                      <div>
                        <input
                          type="text"
                          value={views}
                          onChange={(e) => setViews(e.target.value)}
                          placeholder="e.g. 14.5k or 2.1k"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#D5C7BC] rounded text-xs text-[#1C1B1A]"
                        />
                        <p className="text-[10px] text-[#8C7A6B] mt-1">Badge will display: 👁️ {views || '0'}</p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#A39990] italic">
                        View count badge is hidden for this video.
                      </p>
                    )}
                  </div>

                  {/* Like Count Toggle & Input */}
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E8DFD8] space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-xs font-semibold text-[#1C1B1A]">Show Like Count</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showLikes}
                        onChange={(e) => setShowLikes(e.target.checked)}
                        className="w-4 h-4 text-[#1C1B1A] accent-[#1C1B1A] rounded cursor-pointer"
                      />
                    </label>

                    {showLikes ? (
                      <div>
                        <input
                          type="text"
                          value={likes}
                          onChange={(e) => setLikes(e.target.value)}
                          placeholder="e.g. 1.8k or 320"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#D5C7BC] rounded text-xs text-[#1C1B1A]"
                        />
                        <p className="text-[10px] text-[#8C7A6B] mt-1">Badge will display: ❤️ {likes || '0'}</p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#A39990] italic">
                        Like count badge is hidden for this video.
                      </p>
                    )}
                  </div>

                </div>
              </div>

              {/* Cover Photo Section with Delete Button */}
              <div className="p-3 bg-white border border-[#E8DFD8] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#1C1B1A]">
                    Video Cover Photo
                  </label>
                  {thumbnail && (
                    <button
                      type="button"
                      onClick={() => setThumbnail('')}
                      className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-semibold transition-colors px-1.5 py-0.5 rounded hover:bg-rose-50"
                      title="Delete this photo"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete Photo</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Photo Preview Thumbnail */}
                  <div className="w-16 h-22 rounded-lg bg-[#FAF8F5] border border-[#D5C7BC] overflow-hidden shrink-0 relative flex items-center justify-center">
                    {thumbnail?.trim() ? (
                      <>
                        <img 
                          src={thumbnail.trim()} 
                          alt="Cover preview" 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/og-image.jpg';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setThumbnail('')}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-full shadow-xs transition-colors"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-1">
                        <ImageIcon className="w-4 h-4 text-[#8C7A6B] mx-auto opacity-50" />
                        <span className="text-[8px] text-[#8C7A6B] block mt-0.5 leading-tight">No Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      placeholder="Photo URL (auto-filled from TikTok or custom link)"
                      className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg text-xs text-[#1C1B1A]"
                    />
                    
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#D5C7BC] rounded-md text-[11px] font-medium text-[#1C1B1A] cursor-pointer hover:bg-[#FAF8F5] transition-colors shadow-xs">
                        <Upload className="w-3 h-3 text-[#8C7A6B]" />
                        <span>Upload Custom Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCustomPhotoUpload}
                          className="hidden"
                        />
                      </label>

                      {thumbnail && (
                        <button
                          type="button"
                          onClick={() => setThumbnail('')}
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-medium underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Featured Product Selection with Explicit 'None' Option */}
              <div className="p-3 bg-white border border-[#E8DFD8] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#1C1B1A]">
                    🛍️ Link to Handcrafted Product in Your Shop
                  </label>
                  {featuredProductId && (
                    <button
                      type="button"
                      onClick={() => setFeaturedProductId('')}
                      className="text-[11px] text-[#8C7A6B] hover:text-[#1C1B1A] underline"
                    >
                      Clear Link (Set to None)
                    </button>
                  )}
                </div>

                <select
                  value={featuredProductId}
                  onChange={(e) => setFeaturedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                >
                  <option value="">None (No product linked)</option>
                  <optgroup label="Shop Collection">
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} — Rs. {p.price.toLocaleString()} ({p.category})
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div className="flex items-center justify-between text-[10px] text-[#8C7A6B]">
                  <span>
                    {featuredProductId ? (
                      <strong className="text-emerald-700">✓ Linked to shop item</strong>
                    ) : (
                      <span className="text-[#8C7A6B]">Status: <strong>None</strong> (General craft / lifestyle reel)</span>
                    )}
                  </span>
                  <span>Select "None" if this video doesn't sell a specific item.</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E8DFD8] gap-2 flex-wrap">
                <div>
                  {reelId && (
                    isDeletingEditorReel ? (
                      <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 p-1.5 rounded-lg text-xs">
                        <span className="text-rose-800 font-medium text-[11px]">Confirm deletion?</span>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(reelId)}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold"
                        >
                          Yes, Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDeletingEditorReel(false)}
                          className="px-2 py-1 text-[#8C7A6B] hover:text-[#1C1B1A] text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeletingEditorReel(true)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Video</span>
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('list');
                      setEditingReel(null);
                    }}
                    className="px-4 py-2 bg-white border border-[#D5C7BC] rounded-lg text-xs font-semibold text-[#554E48] hover:bg-[#F4EFEB]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#1C1B1A] text-white rounded-lg text-xs font-semibold hover:bg-[#34312F] shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>{reelId ? 'Update Video' : 'Add TikTok Video'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          )}

          {/* Downloader Section */}
          {activeTab === 'downloader' && (
            <InstagramReelDownloaderSection onSuccessPublished={() => setActiveTab('list')} />
          )}

        </div>

      </div>
    </div>
  );
};
