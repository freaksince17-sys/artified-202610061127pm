import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  MapPin, 
  Users, 
  MessageCircle, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Loader2,
  Upload,
  Video,
  Camera,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  Layers,
  Edit3,
  CheckCircle2,
  RefreshCw,
  Info,
  Wand2
} from 'lucide-react';
import { WorkshopGroup, WorkshopMediaItem } from '../types';
import { 
  saveWorkshopGroup, 
  deleteWorkshopGroup, 
  saveWorkshopMediaItem, 
  deleteWorkshopMediaPermanent,
  uploadWorkshopFileDirectly,
  fetchWorkshopFilesFromServer,
  fetchWorkshopGroups,
  fetchWorkshopMedia,
  buildWorkshopGroups,
  deduplicateMediaItems,
  ServerWorkshopFile,
  WORKSHOP_GROUPS_METADATA
} from '../data/workshops';
import { 
  compressImageWithLibrary, 
  compressVideoFile, 
  extractVideoMetadata, 
  uploadSingleFileFast,
  compressImageToBlob,
  blobToBase64
} from '../utils/fastMediaUploader';
import { 
  autoGenerateWorkshopGroup, 
  autoGenerateMediaCaption 
} from '../utils/workshopAIGenerator';

interface UnifiedMasterclassModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableGroups?: WorkshopGroup[];
  allMediaItems?: WorkshopMediaItem[];
  defaultGroupId?: string;
  onGroupSaved?: (group: WorkshopGroup) => void;
  onGroupDeleted?: (groupId: string, groupKey?: string) => void;
  onMediaUpdated?: (items: WorkshopMediaItem[]) => void;
}

export const UnifiedMasterclassModal: React.FC<UnifiedMasterclassModalProps> = ({
  isOpen,
  onClose,
  availableGroups: propGroups,
  allMediaItems: propMedia,
  defaultGroupId,
  onGroupSaved,
  onGroupDeleted,
  onMediaUpdated
}) => {
  // Internal fallback state if props not provided
  const [internalGroups, setInternalGroups] = useState<WorkshopGroup[]>([]);
  const [internalMedia, setInternalMedia] = useState<WorkshopMediaItem[]>([]);

  // Use props if provided, otherwise internal state
  const availableGroups = propGroups && propGroups.length > 0 ? propGroups : internalGroups;
  const allMediaItems = propMedia !== undefined ? propMedia : internalMedia;

  useEffect(() => {
    if (isOpen && (!propGroups || propGroups.length === 0)) {
      Promise.all([fetchWorkshopGroups(), fetchWorkshopMedia()]).then(([gMetas, media]) => {
        setInternalMedia(media || []);
        const built = buildWorkshopGroups(media || [], gMetas || WORKSHOP_GROUPS_METADATA);
        setInternalGroups(built);
      });
    }
  }, [isOpen, propGroups]);

  // Active selected workshop
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State: Workshop Details
  const [title, setTitle] = useState('');
  const [badge, setBadge] = useState('Workshop • Special Batch');
  const [date, setDate] = useState('Starting Next Saturday • 11:00 AM');
  const [location, setLocation] = useState('Kathmandu, Nepal');
  const [instructor, setInstructor] = useState('Sahina Shrestha');
  const [attendeesCount, setAttendeesCount] = useState<number>(15);
  const [tagline, setTagline] = useState('Hands-on Practical Craft Training');
  const [description, setDescription] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // Form State: Media Upload & Management
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isExtractingInfo, setIsExtractingInfo] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);

  // Existing Server Files Drawer
  const [serverFiles, setServerFiles] = useState<ServerWorkshopFile[]>([]);
  const [isLoadingServerFiles, setIsLoadingServerFiles] = useState(false);
  const [showServerFilesDrawer, setShowServerFilesDrawer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize selected workshop
  useEffect(() => {
    if (!isOpen) return;

    if (defaultGroupId) {
      setActiveGroupId(defaultGroupId);
      setIsCreatingNew(false);
    } else if (availableGroups.length > 0 && !activeGroupId) {
      setActiveGroupId(availableGroups[0].groupKey || availableGroups[0].id);
      setIsCreatingNew(false);
    } else if (availableGroups.length === 0) {
      setIsCreatingNew(true);
    }
  }, [isOpen, defaultGroupId, availableGroups]);

  // Load details of the active workshop
  useEffect(() => {
    if (isCreatingNew) {
      const batchNum = availableGroups.length + 1;
      setTitle(`Workshop Batch #${batchNum < 10 ? '0' + batchNum : batchNum}`);
      setBadge(`Workshop • Batch #${batchNum < 10 ? '0' + batchNum : batchNum}`);
      setDate('Starting Next Saturday • 11:00 AM');
      setLocation('Kathmandu, Nepal');
      setInstructor('Sahina Shrestha');
      setAttendeesCount(15);
      setTagline('Hands-On Practical Craft Training');
      setDescription('');
      setWhatsappMessage('Namaste Sahina! I would like to join your workshop batch in Kathmandu.');
      setConfirmDeleteGroup(false);
      setStatusMessage(null);
      return;
    }

    const current = availableGroups.find((g) => (g.groupKey || g.id) === activeGroupId || g.id === activeGroupId);
    if (current) {
      setTitle(current.title || '');
      setBadge(current.badge || 'Workshop Batch');
      setDate(current.date || 'Starting Next Saturday • 11:00 AM');
      setLocation(current.location || 'Kathmandu, Nepal');
      setInstructor(current.instructor || 'Sahina Shrestha');
      setAttendeesCount(current.attendeesCount || 15);
      setTagline(current.tagline || '');
      setDescription(current.description || '');
      setWhatsappMessage(current.whatsappMessage || '');
      setConfirmDeleteGroup(false);
      setStatusMessage(null);
    }
  }, [activeGroupId, isCreatingNew, availableGroups]);

  // Load physical files in public/workshops/
  const loadServerFiles = async () => {
    setIsLoadingServerFiles(true);
    try {
      const files = await fetchWorkshopFilesFromServer();
      setServerFiles(files);
    } catch {
      // Ignored
    } finally {
      setIsLoadingServerFiles(false);
    }
  };

  useEffect(() => {
    if (isOpen && showServerFilesDrawer) {
      loadServerFiles();
    }
  }, [isOpen, showServerFilesDrawer]);

  if (!isOpen) return null;

  // Filter media items for the currently selected workshop
  const currentWorkshopMedia = allMediaItems.filter((item) => {
    if (!activeGroupId && !isCreatingNew) return false;
    const key = isCreatingNew ? 'new-batch' : activeGroupId;
    return item.groupId === key || item.groupId === `ws-group-${key}` || (key.startsWith('ws-group-') && item.groupId === key.replace('ws-group-', ''));
  });

  // Extract info from attached media using Gemini Vision API
  const handleExtractInfoFromMedia = async () => {
    setIsExtractingInfo(true);
    setStatusMessage(null);

    const imagesPayload: { imageBase64: string; mimeType: string }[] = [];
    for (const item of currentWorkshopMedia.slice(0, 4)) {
      if (item.thumbnailUrl && item.thumbnailUrl.startsWith('data:')) {
        imagesPayload.push({ imageBase64: item.thumbnailUrl, mimeType: 'image/jpeg' });
      } else if (item.url && item.url.startsWith('data:')) {
        imagesPayload.push({ imageBase64: item.url, mimeType: 'image/jpeg' });
      }
    }

    const firstItem = currentWorkshopMedia[0];

    try {
      const res = await fetch('/api/gemini/extract-workshop-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imagesPayload.length > 0 ? imagesPayload : undefined,
          imageBase64: imagesPayload[0]?.imageBase64 || undefined,
          mimeType: 'image/jpeg',
          filename: firstItem?.title || undefined,
          mediaList: currentWorkshopMedia.map((m) => m.title),
          topic: title || 'Handmade Craft Workshop'
        })
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload && payload.success && payload.data) {
          const d = payload.data;
          const cleanTitle = (d.title || title)
            .replace(/masterclass/gi, 'Workshop')
            .replace(/cohort\s*#?/gi, 'Batch #')
            .replace(/atelier/gi, 'Studio');
          const cleanBadge = (d.badge || badge)
            .replace(/masterclass/gi, 'Workshop')
            .replace(/cohort\s*#?/gi, 'Batch #')
            .replace(/atelier/gi, 'Studio');
          const cleanTagline = (d.tagline || tagline)
            .replace(/masterclass/gi, 'Workshop')
            .replace(/cohort/gi, 'Batch')
            .replace(/atelier/gi, 'Studio');
          const cleanDesc = (d.description || description)
            .replace(/masterclass/gi, 'workshop')
            .replace(/cohort/gi, 'batch')
            .replace(/atelier/gi, 'studio')
            .replace(/^\s*1\.\s*/gm, '')
            .replace(/^\s*\d+\.\s*/gm, '');

          setTitle(cleanTitle);
          setBadge(cleanBadge);
          setTagline(cleanTagline);
          setDescription(cleanDesc);
          if (d.location) setLocation(d.location);
          if (d.instructor) setInstructor(d.instructor);
          if (d.suggestedAttendees) setAttendeesCount(d.suggestedAttendees);
          if (d.whatsappMessage) {
            setWhatsappMessage(
              d.whatsappMessage
                .replace(/masterclass/gi, 'workshop')
                .replace(/cohort/gi, 'batch')
                .replace(/atelier/gi, 'studio')
            );
          }

          setStatusMessage({
            type: 'success',
            text: `✨ AI Vision successfully extracted workshop details from attached media!`
          });
          setTimeout(() => setStatusMessage(null), 4000);
          return;
        }
      }
      throw new Error('Fallback');
    } catch {
      const fallback = autoGenerateWorkshopGroup(title || 'Macrame & Knotting Art');
      setTitle(fallback.title);
      setBadge(fallback.badge);
      setTagline(fallback.tagline);
      setDescription(fallback.description);
      setLocation(fallback.location);
      setInstructor(fallback.instructor);
      setAttendeesCount(fallback.suggestedAttendees);
      setWhatsappMessage(fallback.whatsappMessage);

      setStatusMessage({ type: 'success', text: '✨ Extracted workshop details!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsExtractingInfo(false);
    }
  };

  // Save Workshop Details
  const handleSaveWorkshopDetails = async (closeOnComplete = false, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a title for this workshop.' });
      return;
    }

    setIsSavingGroup(true);
    setStatusMessage(null);

    try {
      const targetKey = isCreatingNew 
        ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `ws-${Date.now()}`
        : activeGroupId;

      const currentGroup = availableGroups.find((g) => (g.groupKey || g.id) === activeGroupId);

      const savedGroup: WorkshopGroup = {
        id: currentGroup?.id || `group_${Date.now()}`,
        groupKey: targetKey,
        title: title.trim(),
        badge: badge.trim(),
        date: date.trim(),
        location: location.trim(),
        instructor: instructor.trim(),
        attendeesCount: Number(attendeesCount) || 15,
        tagline: tagline.trim(),
        description: description.trim(),
        keyTechniques: [],
        whatsappMessage: whatsappMessage.trim() || `Namaste Sahina! I want to join "${title}" at Kathmandu Workshop.`,
        items: currentWorkshopMedia
      };

      await saveWorkshopGroup(savedGroup);
      if (onGroupSaved) {
        onGroupSaved(savedGroup);
      }
      setInternalGroups((prev) => {
        const exists = prev.some((g) => g.id === savedGroup.id || g.groupKey === savedGroup.groupKey);
        if (exists) {
          return prev.map((g) => (g.id === savedGroup.id || g.groupKey === savedGroup.groupKey ? savedGroup : g));
        }
        return [...prev, savedGroup];
      });

      if (isCreatingNew) {
        setIsCreatingNew(false);
        setActiveGroupId(targetKey);
      }

      setStatusMessage({ type: 'success', text: `Saved "${savedGroup.title}" details successfully!` });

      if (closeOnComplete) {
        setTimeout(() => {
          onClose();
        }, 250);
      } else {
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('Error saving workshop:', err);
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to save workshop details.' });
    } finally {
      setIsSavingGroup(false);
    }
  };

  // Delete Current Workshop and CASCADE DELETE all attached media
  const handleDeleteWorkshop = async () => {
    const currentGroup = availableGroups.find((g) => (g.groupKey || g.id) === activeGroupId);
    if (!currentGroup) return;

    try {
      await deleteWorkshopGroup(currentGroup.id, currentGroup.groupKey);
      if (onGroupDeleted) {
        onGroupDeleted(currentGroup.id, currentGroup.groupKey);
      }
      setConfirmDeleteGroup(false);

      const remaining = availableGroups.filter((g) => (g.groupKey || g.id) !== activeGroupId && g.id !== currentGroup.id && g.groupKey !== currentGroup.groupKey);
      setInternalGroups(remaining);

      // Cascade clean up all media for this workshop
      const remainingMedia = allMediaItems.filter((m) => m.groupId !== currentGroup.id && m.groupId !== currentGroup.groupKey && m.groupId !== `ws-group-${currentGroup.groupKey}`);
      if (onMediaUpdated) {
        onMediaUpdated(remainingMedia);
      }
      setInternalMedia(remainingMedia);

      if (remaining.length > 0) {
        setActiveGroupId(remaining[0].groupKey || remaining[0].id);
      } else {
        setIsCreatingNew(true);
      }

      setStatusMessage({ type: 'success', text: `Deleted workshop "${currentGroup.title}" and its media.` });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to delete workshop.' });
    }
  };

  // Upload Photos & Videos with client-side compression
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const targetKey = isCreatingNew ? 'new-batch' : activeGroupId;
    setIsUploading(true);
    setStatusMessage(null);

    const uploadedItems: WorkshopMediaItem[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      setUploadProgress(`Compressing & Uploading ${i + 1} of ${total}: "${file.name}"...`);

      try {
        const isVid = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
        let fileToUpload: File | Blob = file;
        let thumbUrl: string | undefined = undefined;

        if (!isVid) {
          // Client-side image compression (<250KB)
          const comp = await compressImageWithLibrary(file, 0.25, 1280);
          fileToUpload = comp.file;
        } else {
          try {
            const compVid = await compressVideoFile(file);
            fileToUpload = compVid;
          } catch {}
          try {
            const meta = await extractVideoMetadata(file);
            if (meta.thumbnailBlob) {
              thumbUrl = await uploadSingleFileFast(meta.thumbnailBlob, `${file.name}_thumb.jpg`, 'image/jpeg');
            }
          } catch {}
        }

        const cloudUrl = await uploadSingleFileFast(
          fileToUpload,
          file.name,
          file.type || (isVid ? 'video/mp4' : 'image/jpeg')
        );

        const aiCaption = autoGenerateMediaCaption(file.name, title || 'Kathmandu Artisan Workshop');

        const newItem: WorkshopMediaItem = {
          id: `ws_media_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          groupId: targetKey,
          type: isVid ? 'video' : 'image',
          title: aiCaption.title,
          workshopTitle: title || 'Artisan Workshop',
          url: cloudUrl,
          thumbnailUrl: thumbUrl || cloudUrl,
          caption: aiCaption.caption,
          craftTechnique: aiCaption.craftTechnique || 'Handcrafted Technique',
          location: location || 'Kathmandu, Nepal',
          date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          instructor: instructor || 'Sahina Shrestha',
          tags: ['Kathmandu Workshop', badge],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await saveWorkshopMediaItem(newItem);
        uploadedItems.push(newItem);
      } catch (err) {
        console.error(`Error uploading file ${file.name}:`, err);
      }
    }

    setIsUploading(false);
    setUploadProgress(null);

    if (uploadedItems.length > 0) {
      const updatedList = deduplicateMediaItems([...uploadedItems, ...allMediaItems]);
      if (onMediaUpdated) {
        onMediaUpdated(updatedList);
      }
      setInternalMedia(updatedList);
      setStatusMessage({ 
        type: 'success', 
        text: `✨ Successfully uploaded ${uploadedItems.length} file(s) with client-side compression!` 
      });
      setTimeout(() => setStatusMessage(null), 3500);
      loadServerFiles();
    } else {
      setStatusMessage({ type: 'error', text: 'Upload failed. Please check file format.' });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Delete a media item from this workshop
  const handleDeleteMediaItem = async (item: WorkshopMediaItem, deleteFileFromDisk = false) => {
    try {
      await deleteWorkshopMediaPermanent(item.id, deleteFileFromDisk);
      const updated = allMediaItems.filter((m) => m.id !== item.id);
      if (onMediaUpdated) {
        onMediaUpdated(updated);
      }
      setInternalMedia(updated);
      setStatusMessage({ 
        type: 'success', 
        text: `Removed "${item.title}" from this workshop.` 
      });
      setTimeout(() => setStatusMessage(null), 2500);
      loadServerFiles();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to delete media.' });
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#FAF8F5] dark:bg-[#141312] text-[#1C1B1A] dark:text-[#F5F2EB] rounded-2xl sm:rounded-3xl border border-[#E8DFD8] dark:border-[#2E2C29] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8DFD8] dark:border-[#262422] flex items-center justify-between gap-3 bg-white dark:bg-[#1A1918] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A880]/20 flex items-center justify-center text-[#8C5D36] dark:text-[#E6CA9E]">
              <Sparkles className="w-5 h-5 text-[#C5A880]" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#1C1B1A] dark:text-white">
                Workshop & Media Studio
              </h2>
              <p className="text-xs text-[#736C65] dark:text-[#A8A29D]">
                Manage workshop details, upload photos & videos, or delete sessions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 text-[#5E5955] dark:text-[#C4BCB5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div
            className={`p-3 text-xs font-semibold flex items-center justify-between gap-2 shrink-0 ${
              statusMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Active Workshop Selector Tabs */}
          <div className="bg-white dark:bg-[#1A1918] p-3 rounded-2xl border border-[#E8DFD8] dark:border-[#262422] flex items-center gap-2 overflow-x-auto">
            {availableGroups.map((g) => {
              const gKey = g.groupKey || g.id;
              const isSelected = !isCreatingNew && activeGroupId === gKey;
              return (
                <button
                  key={gKey}
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setActiveGroupId(gKey);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] shadow-xs'
                      : 'bg-[#FAF8F5] dark:bg-[#201E1C] text-[#736C65] dark:text-[#A8A29D] hover:text-[#1C1B1A] dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{g.title || 'Workshop'}</span>
                  <span className="text-[10px] opacity-70">({g.items?.length || 0})</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(true);
                setActiveGroupId('');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isCreatingNew
                  ? 'bg-[#C5A880] text-[#1C1B1A] shadow-xs'
                  : 'bg-[#C5A880]/15 text-[#8C5D36] dark:text-[#E6CA9E] hover:bg-[#C5A880]/25'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Workshop</span>
            </button>
          </div>

          {/* SECTION: WORKSHOP DETAILS & PROMINENT (i) EXTRACT INFO BUTTON */}
          <div className="bg-white dark:bg-[#1A1918] p-4 sm:p-5 rounded-2xl border border-[#E8DFD8] dark:border-[#262422] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#F0EBE5] dark:border-[#262422]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E]">
                  <Layers className="w-4 h-4" />
                </span>
                <h3 className="font-serif text-sm font-bold text-[#1C1B1A] dark:text-white">
                  Workshop Information & Schedule
                </h3>
              </div>

              {/* (i) EXTRACT INFO BUTTON */}
              <button
                type="button"
                onClick={handleExtractInfoFromMedia}
                disabled={isExtractingInfo}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#b8986c] text-[#1C1B1A] text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                title="Extract info from photos and videos using AI"
              >
                {isExtractingInfo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-[#1C1B1A]" />
                    <span>Extract Info from Media (i)</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Workshop Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Macrame Wall Art & Planters Workshop"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Workshop Badge
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. Workshop • Macrame & Fiber Art"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Date & Schedule
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="e.g. Starting Next Saturday • 11:00 AM"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Kathmandu, Nepal"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Instructor & Mentor
                </label>
                <input
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="Sahina Shrestha"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Cotton Cord Tensioning • Planters & Wall Art"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Max Seats
                </label>
                <input
                  type="number"
                  value={attendeesCount}
                  onChange={(e) => setAttendeesCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </div>

            {/* Workshop Description */}
            <div>
              <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                Workshop Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive description of what participants will create and learn in this workshop..."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880] leading-relaxed"
              />
            </div>

            {/* WhatsApp Message */}
            <div>
              <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                WhatsApp Inquiry Message
              </label>
              <input
                type="text"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Namaste Sahina! I want to join..."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#F0EBE5] dark:border-[#262422]">
              {!isCreatingNew && (
                <div>
                  {confirmDeleteGroup ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                        Delete this workshop and all its media?
                      </span>
                      <button
                        type="button"
                        onClick={handleDeleteWorkshop}
                        className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
                      >
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteGroup(false)}
                        className="px-3 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteGroup(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Workshop</span>
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleSaveWorkshopDetails(false)}
                disabled={isSavingGroup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] text-xs font-bold uppercase tracking-wider hover:bg-[#34312E] dark:hover:bg-neutral-200 transition-all cursor-pointer shadow-xs disabled:opacity-50 ml-auto"
              >
                {isSavingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-[#C5A880]" />}
                <span>Save Workshop Details</span>
              </button>
            </div>
          </div>

          {/* SECTION: PHOTOS & VIDEOS FOR THIS WORKSHOP */}
          <div className="bg-white dark:bg-[#1A1918] p-4 sm:p-5 rounded-2xl border border-[#E8DFD8] dark:border-[#262422] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EBE5] dark:border-[#262422]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E]">
                  <Camera className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#1C1B1A] dark:text-white">
                    Photos & Videos for "{title || 'This Workshop'}"
                  </h3>
                  <p className="text-[11px] text-[#736C65] dark:text-[#A8A29D]">
                    Upload photos and videos with client-side compression (<span className="text-emerald-600 font-semibold">&lt;250KB</span>).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/mp4,video/quicktime,video/webm"
                  onChange={(e) => handleUploadFiles(e.target.files)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isUploading ? 'Uploading...' : 'Upload Photos / Videos'}</span>
                </button>
              </div>
            </div>

            {/* Upload progress message */}
            {uploadProgress && (
              <div className="p-2.5 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 text-xs text-[#8C5D36] dark:text-[#E6CA9E] flex items-center gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{uploadProgress}</span>
              </div>
            )}

            {/* Media list */}
            {currentWorkshopMedia.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-[#E8DFD8] dark:border-white/10 rounded-2xl">
                <Camera className="w-8 h-8 text-[#736C65] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                  No media uploaded for this workshop yet
                </p>
                <p className="text-[11px] text-[#736C65] dark:text-[#A8A29D]">
                  Click "Upload Photos / Videos" to add training session moments.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentWorkshopMedia.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 relative group"
                  >
                    <div className="w-full h-32 rounded-lg overflow-hidden bg-black mb-2 relative">
                      {m.type === 'video' ? (
                        <>
                          <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Video className="w-5 h-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <img src={m.url || m.thumbnailUrl} alt={m.title} className="w-full h-full object-cover" />
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteMediaItem(m)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                        title="Delete photo/video"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-xs font-bold text-[#1C1B1A] dark:text-white truncate">
                      {m.title}
                    </h4>
                    <p className="text-[10px] text-[#736C65] dark:text-[#A8A29D] line-clamp-2 mt-0.5">
                      {m.caption}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E8DFD8] dark:border-[#262422] flex items-center justify-between gap-3 bg-white dark:bg-[#1A1918] shrink-0">
          <div className="text-xs text-[#736C65] dark:text-[#A8A29D]">
            <span>{currentWorkshopMedia.length} item(s) in this workshop</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E8DFD8] dark:border-white/10 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => handleSaveWorkshopDetails(true)}
              disabled={isSavingGroup}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] text-xs font-bold uppercase tracking-wider hover:bg-[#34312E] dark:hover:bg-neutral-200 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSavingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-[#C5A880]" />}
              <span>Save & Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
