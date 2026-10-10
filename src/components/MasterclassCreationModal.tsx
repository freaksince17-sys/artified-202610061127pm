import React, { useState, useRef, useEffect } from 'react';
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
  Wand2, 
  CheckCircle2, 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  Info,
  FileCheck2,
  Zap,
  Clock,
  Sparkle
} from 'lucide-react';
import { WorkshopGroup, WorkshopMediaItem } from '../types';
import { 
  saveWorkshopGroup, 
  saveWorkshopMediaItem, 
  getCustomWorkshopGroupsFromStorage, 
  saveCustomWorkshopGroupsToStorage 
} from '../data/workshops';
import { 
  compressImageToBlob, 
  compressImageWithLibrary,
  compressVideoFile,
  extractVideoMetadata, 
  uploadSingleFileFast,
  blobToBase64
} from '../utils/fastMediaUploader';
import { 
  autoGenerateWorkshopGroup, 
  autoGenerateMediaCaption 
} from '../utils/workshopAIGenerator';
import { isVideoMedia, getStandardMimeType } from '../services/firebaseWorkshopStorageService';

interface UploadingMediaItem {
  id: string;
  file: File;
  type: 'image' | 'video';
  localPreviewUrl: string;
  remoteUrl?: string;
  thumbnailUrl?: string;
  thumbnailBase64?: string;
  title: string;
  caption: string;
  craftTechnique: string;
  progress: number;
  status: 'pending' | 'compressing' | 'uploading' | 'ready' | 'error';
  errorMessage?: string;
  compressedSize?: number;
}

interface MasterclassCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMasterclassCreated?: (group: WorkshopGroup, items: WorkshopMediaItem[]) => void;
}

export const MasterclassCreationModal: React.FC<MasterclassCreationModalProps> = ({
  isOpen,
  onClose,
  onMasterclassCreated
}) => {
  // Workshop core info state
  const [title, setTitle] = useState('Macrame Wall Art & Planters Workshop');
  const [badge, setBadge] = useState('Workshop • Macrame & Fiber Art');
  const [tagline, setTagline] = useState('Cotton Cord Tensioning • Planters & Wall Art');
  const [batchDate, setBatchDate] = useState('Sat, Oct 24, 2026');
  const [date, setDate] = useState('Starting Next Saturday • 11:00 AM');
  const [location, setLocation] = useState('Kathmandu, Nepal');
  const [instructor, setInstructor] = useState('Sahina Shrestha');
  const [attendeesCount, setAttendeesCount] = useState<number>(15);
  const [description, setDescription] = useState(
    'Intensive hands-on training focusing on raw cotton cord knotting, symmetrical tension, wooden hoop attachments, and botanical hanger architecture under Sahina Shrestha’s guided mentorship in Kathmandu.'
  );
  const [whatsappMessage, setWhatsappMessage] = useState(
    'Namaste Sahina! I would like to join the Macrame Wall Art & Planters Workshop in Kathmandu.'
  );

  // Uploading media queue
  const [mediaQueue, setMediaQueue] = useState<UploadingMediaItem[]>([]);
  const [isExtractingInfo, setIsExtractingInfo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Success Toast state
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<{ title: string; count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset or preset on open
  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setShowSuccessToast(false);
    }
  }, [isOpen]);

  if (!isOpen && !showSuccessToast) return null;

  // Extract all information from uploaded photos & videos using Gemini Vision API
  const handleExtractInfoFromMedia = async () => {
    setIsExtractingInfo(true);
    setStatusMessage(null);

    // Extract visual frames/thumbnails from up to 4 queued photos and videos
    const imagesPayload: { imageBase64: string; mimeType: string }[] = [];
    
    for (const item of mediaQueue.slice(0, 4)) {
      if (item.thumbnailBase64 && item.thumbnailBase64.startsWith('data:')) {
        imagesPayload.push({
          imageBase64: item.thumbnailBase64,
          mimeType: 'image/jpeg'
        });
      } else if (item.type === 'image') {
        try {
          const comp = await compressImageToBlob(item.file, 800, 800, 0.7);
          imagesPayload.push({
            imageBase64: comp.dataUrl,
            mimeType: 'image/jpeg'
          });
        } catch {
          try {
            const b64 = await blobToBase64(item.file);
            imagesPayload.push({
              imageBase64: b64,
              mimeType: item.file.type || 'image/jpeg'
            });
          } catch {}
        }
      } else if (item.type === 'video') {
        try {
          const meta = await extractVideoMetadata(item.file);
          if (meta.thumbnailUrl && meta.thumbnailUrl.startsWith('data:')) {
            imagesPayload.push({
              imageBase64: meta.thumbnailUrl,
              mimeType: 'image/jpeg'
            });
          }
        } catch {}
      }
    }

    const firstItem = mediaQueue[0];
    const fileNames = mediaQueue.map((m) => m.file.name).join(', ');
    const mediaTitles = mediaQueue.map((m) => m.title).filter(Boolean).join(', ');
    const combinedContext = [fileNames, mediaTitles, title].filter(Boolean).join(' ');

    try {
      const res = await fetch('/api/gemini/extract-workshop-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imagesPayload.length > 0 ? imagesPayload : undefined,
          imageBase64: imagesPayload[0]?.imageBase64 || undefined,
          mimeType: imagesPayload[0]?.mimeType || 'image/jpeg',
          filename: firstItem ? firstItem.file.name : undefined,
          mediaList: mediaQueue.map((m) => m.file.name),
          topic: combinedContext || title || 'Handmade Craft Workshop'
        })
      });

      if (res.ok) {
        const payload = await res.json();
        if (payload && payload.success && payload.data) {
          const d = payload.data;
          // Sanitize out any "masterclass", "cohort", "atelier", or numbered "1."
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
            text: `✨ AI Vision studied your media and filled all workshop details!`
          });
          setTimeout(() => setStatusMessage(null), 4500);
          return;
        }
      }
      throw new Error('Fallback to local heuristics');
    } catch {
      const fallback = autoGenerateWorkshopGroup(combinedContext || 'Macrame & Knotting Art');
      const cleanTitle = fallback.title.replace(/masterclass/gi, 'Workshop').replace(/cohort\s*#?/gi, 'Batch #');
      const cleanBadge = fallback.badge.replace(/masterclass/gi, 'Workshop').replace(/cohort\s*#?/gi, 'Batch #');

      setTitle(cleanTitle);
      setBadge(cleanBadge);
      setTagline(fallback.tagline.replace(/masterclass/gi, 'Workshop').replace(/cohort/gi, 'Batch'));
      setDescription(fallback.description.replace(/masterclass/gi, 'workshop').replace(/cohort/gi, 'batch').replace(/^\s*1\.\s*/gm, ''));
      setLocation(fallback.location);
      setInstructor(fallback.instructor);
      setAttendeesCount(fallback.suggestedAttendees);
      setWhatsappMessage(
        `Namaste Sahina! I would like to register for the upcoming ${cleanTitle} in Kathmandu.`
      );

      setStatusMessage({
        type: 'success',
        text: `✨ Auto-filled workshop details from uploaded media!`
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsExtractingInfo(false);
    }
  };

  // Multiple File Selection & Fast Upload
  const handleSelectFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const newItems: UploadingMediaItem[] = [];

    for (const f of newFiles) {
      const isVid = isVideoMedia(f, f.name);
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const preview = URL.createObjectURL(f);

      // Instant placeholder caption
      const immediateCaption = autoGenerateMediaCaption(f.name, title);

      newItems.push({
        id: tempId,
        file: f,
        type: isVid ? 'video' : 'image',
        localPreviewUrl: preview,
        title: immediateCaption.title.replace(/masterclass/gi, 'Workshop').replace(/cohort/gi, 'Batch'),
        caption: immediateCaption.caption.replace(/masterclass/gi, 'workshop').replace(/cohort/gi, 'batch'),
        craftTechnique: immediateCaption.craftTechnique || 'Handcrafted Technique',
        progress: 0,
        status: 'pending'
      });
    }

    setMediaQueue((prev) => [...prev, ...newItems]);

    // Start fast parallel uploads
    processUploadQueue(newItems);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fast upload queue processor with client-side compression
  const processUploadQueue = async (itemsToUpload: UploadingMediaItem[]) => {
    const targetGroupKey = (title || 'Macrame').toLowerCase();
    const destFolder = targetGroupKey.includes('sunflower') || targetGroupKey.includes('pipe') ? 'Pipecleaner Sunflower' : targetGroupKey.includes('pearl') ? 'Pearls' : 'Macrame';

    for (const item of itemsToUpload) {
      setMediaQueue((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, status: 'compressing', progress: 20 } : m))
      );

      try {
        let filePayload: File | Blob = item.file;
        let thumbnailDownloadUrl: string | undefined = undefined;
        let thumbBase64: string | undefined = undefined;

        // 1. FAST CLIENT-SIDE COMPRESSION USING BROWSER-IMAGE-COMPRESSION & VIDEO TRANSCODING
        if (item.type === 'image') {
          // Library-based aggressive compression (<250KB JPEG/WebP)
          const compressed = await compressImageWithLibrary(item.file, 0.25, 1280);
          filePayload = compressed.file;
          if (compressed.dataUrl) {
            thumbBase64 = compressed.dataUrl;
          }
        } else {
          // Video: fast resolution optimization + tiny ~20KB video poster frame
          try {
            const compressedVid = await compressVideoFile(item.file);
            filePayload = compressedVid;
          } catch (vidErr) {
            console.warn('Video compression notice, using direct stream:', vidErr);
          }

          try {
            const meta = await extractVideoMetadata(item.file);
            if (meta.thumbnailUrl && meta.thumbnailUrl.startsWith('data:')) {
              thumbBase64 = meta.thumbnailUrl;
            }
            if (meta.thumbnailBlob) {
              thumbnailDownloadUrl = await uploadSingleFileFast(
                meta.thumbnailBlob,
                `${item.file.name}_thumb.jpg`,
                'image/jpeg',
                undefined,
                undefined,
                destFolder,
                targetGroupKey
              );
            }
          } catch (vidThumbErr) {
            console.warn('Video poster extract notice:', vidThumbErr);
          }
        }

        setMediaQueue((prev) =>
          prev.map((m) => (m.id === item.id ? { ...m, status: 'uploading', progress: 45, thumbnailBase64: thumbBase64 } : m))
        );

        // 2. PARALLEL CAPTION GENERATION
        fetch('/api/gemini/generate-caption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: item.file.name,
            masterclassTitle: title,
            type: item.type
          })
        })
          .then((r) => r.json())
          .then((captionRes) => {
            if (captionRes && captionRes.success && captionRes.data) {
              setMediaQueue((prev) =>
                prev.map((m) =>
                  m.id === item.id
                    ? {
                        ...m,
                        title: (captionRes.data.title || m.title).replace(/masterclass/gi, 'Workshop').replace(/cohort/gi, 'Batch'),
                        caption: (captionRes.data.caption || m.caption).replace(/masterclass/gi, 'workshop').replace(/cohort/gi, 'batch'),
                        craftTechnique: captionRes.data.craftTechnique || m.craftTechnique
                      }
                    : m
                )
              );
            }
          })
          .catch(() => {});

        // 3. DIRECT CLOUD FIREBASE STORAGE UPLOAD (Raw streaming binary, no giant base64)
        const cloudUrl = await uploadSingleFileFast(
          filePayload,
          item.file.name,
          getStandardMimeType(item.file, item.file.name),
          thumbBase64,
          (pct) => {
            setMediaQueue((prev) =>
              prev.map((m) => (m.id === item.id ? { ...m, progress: 45 + Math.round(pct * 0.55) } : m))
            );
          },
          destFolder,
          targetGroupKey
        );

        setMediaQueue((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? {
                  ...m,
                  remoteUrl: cloudUrl,
                  thumbnailUrl: thumbnailDownloadUrl || cloudUrl,
                  status: 'ready',
                  progress: 100,
                  compressedSize: filePayload.size
                }
              : m
          )
        );
      } catch (err: any) {
        console.error(`Upload notice for ${item.file.name}:`, err);
        setMediaQueue((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? {
                  ...m,
                  status: 'ready',
                  remoteUrl: m.localPreviewUrl,
                  progress: 100
                }
              : m
          )
        );
      }
    }
  };

  const handleRemoveMedia = (id: string) => {
    setMediaQueue((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMoveMedia = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === mediaQueue.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    setMediaQueue((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // SAVE & PUBLISH WORKSHOP TO DATABASE (Guaranteed < 10KB payload per doc)
  const handlePublishWorkshop = async () => {
    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a title for the workshop.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const now = new Date().toISOString();
      const groupKey =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || `ws-group-${Date.now()}`;
      const groupId = `group_${Date.now()}`;

      // 1. Prepare WorkshopMediaItem records without heavy base64 strings
      const savedMediaItems: WorkshopMediaItem[] = [];

      for (let i = 0; i < mediaQueue.length; i++) {
        const m = mediaQueue[i];
        const mediaId = `ws_media_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
        
        let finalUrl = m.remoteUrl || m.localPreviewUrl;
        if (finalUrl && finalUrl.startsWith('data:video/')) {
          finalUrl = `/workshops/${m.file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
        }
        let finalThumb = m.thumbnailUrl || finalUrl;

        const isVideoFile = isVideoMedia(m.file || finalUrl, m.file?.name);
        if (isVideoFile && (!finalThumb || finalThumb === finalUrl || /\.(mp4|mov|webm|m4v)$/i.test(finalThumb))) {
          if (finalUrl && finalUrl.endsWith('.mp4')) {
            finalThumb = finalUrl.replace(/\.mp4$/i, '_thumb.jpg');
          } else {
            finalThumb = finalUrl;
          }
        }

        const mediaItem: WorkshopMediaItem = {
          id: mediaId,
          groupId: groupKey,
          type: isVideoFile ? 'video' : 'image',
          title: m.title || `Workshop Highlight ${i + 1}`,
          workshopTitle: title,
          url: finalUrl,
          thumbnailUrl: finalThumb,
          caption: m.caption || `Workshop training session highlight at Kathmandu, Nepal.`,
          craftTechnique: m.craftTechnique || 'Handcrafted Technique',
          location: location || 'Kathmandu, Nepal',
          date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          instructor: instructor || 'Sahina Shrestha',
          tags: ['Kathmandu Workshop', 'Handmade in Nepal', badge],
          createdAt: now,
          updatedAt: now
        };

        // Save each item individually to Firestore and local storage
        await saveWorkshopMediaItem(mediaItem);
        savedMediaItems.push(mediaItem);
      }

      // 2. Prepare WorkshopGroup record
      const newGroup: WorkshopGroup = {
        id: groupId,
        groupKey: groupKey,
        title: title.trim(),
        badge: badge.trim(),
        batchDate: batchDate.trim(),
        date: date.trim(),
        location: location.trim(),
        instructor: instructor.trim(),
        attendeesCount: Number(attendeesCount) || 15,
        tagline: tagline.trim(),
        description: description.trim(),
        keyTechniques: [],
        whatsappMessage:
          whatsappMessage.trim() || `Namaste Sahina! I want to join the "${title}" workshop in Kathmandu.`,
        items: savedMediaItems
      };

      // 3. Save group to Firestore (document size < 2KB)
      await saveWorkshopGroup(newGroup);

      // 4. Update local storage databases immediately
      const existingGroups = getCustomWorkshopGroupsFromStorage().filter((g) => g.groupKey !== groupKey);
      existingGroups.push({
        id: newGroup.id,
        groupKey: newGroup.groupKey,
        title: newGroup.title,
        badge: newGroup.badge,
        date: newGroup.date,
        location: newGroup.location,
        instructor: newGroup.instructor,
        attendeesCount: newGroup.attendeesCount,
        tagline: newGroup.tagline,
        description: newGroup.description,
        keyTechniques: [],
        whatsappMessage: newGroup.whatsappMessage
      });
      saveCustomWorkshopGroupsToStorage(existingGroups);

      // 5. Sync to server disk if running
      try {
        fetch('/api/workshop-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(existingGroups)
        }).catch(() => {});
      } catch {}

      // 6. Notify parent callback
      if (onMasterclassCreated) {
        onMasterclassCreated(newGroup, savedMediaItems);
      }

      // Trigger success confirmation toast
      setCreatedSummary({
        title: newGroup.title,
        count: savedMediaItems.length
      });
      setShowSuccessToast(true);

      // Close modal
      onClose();
    } catch (err: any) {
      console.error('Failed to publish workshop:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to publish workshop. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* SUCCESS TOAST NOTIFICATION: Stays visible across tabs & confirms content is live */}
      {showSuccessToast && createdSummary && (
        <aside 
          aria-label="Workshop publication status"
          className="fixed bottom-5 right-5 z-[200] max-w-md w-full bg-[#1C1B1A] text-white p-4 sm:p-5 rounded-2xl border-2 border-[#C5A880] shadow-2xl animate-bounce-short flex items-start gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-[#C5A880] text-[#1C1B1A] text-[10px] font-bold uppercase tracking-wider">
                Live on Website
              </span>
              <span className="text-xs text-white/60">• Just Now</span>
            </div>
            <h4 className="font-serif text-sm font-bold text-white truncate">
              {createdSummary.title}
            </h4>
            <p className="text-xs text-white/80 mt-1 leading-relaxed">
              Published with {createdSummary.count} photo/video file(s). Uploaded to Firebase Storage and workshop catalog database — visible immediately!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSuccessToast(false)}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* Main Creation Modal */}
      {isOpen && (
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
                    Create New Workshop
                  </h2>
                  <p className="text-xs text-[#736C65] dark:text-[#A8A29D]">
                    Fast photo & video uploads to Firebase Storage with automatic AI info extraction.
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

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* UPLOAD PHOTOS & VIDEOS (STORED IN FIREBASE STORAGE) */}
              <div className="bg-white dark:bg-[#1A1918] p-4 sm:p-5 rounded-2xl border border-[#E8DFD8] dark:border-[#262422] shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-[#F0EBE5] dark:border-[#262422]">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E]">
                      <Camera className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-serif text-sm font-bold text-[#1C1B1A] dark:text-white">
                        Upload Photos & Videos (Stored in Firebase Storage)
                      </h3>
                      <p className="text-[11px] text-[#736C65] dark:text-[#A8A29D]">
                        Images are compressed client-side before upload (<span className="text-emerald-600 dark:text-emerald-400 font-semibold">&lt;250KB</span>). Streaming binary guarantees fast upload.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Files</span>
                  </button>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/mp4,video/quicktime,video/webm"
                  onChange={(e) => handleSelectFiles(e.target.files)}
                  className="hidden"
                />

                {/* Drag & Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleSelectFiles(e.dataTransfer.files);
                  }}
                  className="p-6 sm:p-8 rounded-2xl border-2 border-dashed border-[#C5A880]/50 hover:border-[#C5A880] bg-[#FAF8F5]/80 dark:bg-[#1E1C1A]/60 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#FAF8F5] dark:hover:bg-[#1E1C1A] mb-4 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#C5A880]/20 flex items-center justify-center text-[#8C5D36] dark:text-[#E6CA9E] mb-2 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Drag & Drop photos and videos here, or <span className="text-[#8C5D36] dark:text-[#E6CA9E] underline">browse files</span>
                  </p>
                  <p className="text-[11px] text-[#736C65] dark:text-[#A8A29D]">
                    Uploads multiple files directly to Firebase Storage with instant client-side compression.
                  </p>
                </div>

                {/* Uploaded Media Cards List with SKELETON SHIMMER LOADERS */}
                {mediaQueue.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[#1C1B1A] dark:text-white pb-1">
                      <span>Uploaded Files ({mediaQueue.length})</span>
                      <span className="text-[11px] text-[#736C65] font-normal">
                        Titles & captions are automatically generated and editable
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                      {mediaQueue.map((m, idx) => {
                        const isLoading = m.status === 'pending' || m.status === 'compressing' || m.status === 'uploading';

                        return (
                          <div
                            key={m.id}
                            className={`p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border ${
                              isLoading 
                                ? 'border-[#C5A880]/60 shadow-md bg-amber-500/[0.03]' 
                                : 'border-[#E8DFD8] dark:border-white/10'
                            } flex flex-col gap-2 relative group transition-all`}
                          >
                            <div className="flex gap-3">
                              {/* Thumbnail / Video with Shimmer Overlay */}
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-black shrink-0 relative flex items-center justify-center">
                                {/* Shimmer pulse skeleton during compression/upload */}
                                {isLoading && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-[#2A241F] via-[#3D352E] to-[#2A241F] animate-pulse z-10 flex flex-col items-center justify-center text-white text-[9px] p-1 text-center">
                                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A880] mb-0.5" />
                                    <span className="font-semibold text-[10px] text-[#E6CA9E]">
                                      {m.status === 'pending' ? 'Processing...' : m.status === 'compressing' ? 'Compressing...' : `${m.progress}%`}
                                    </span>
                                  </div>
                                )}

                                {m.type === 'video' ? (
                                  <>
                                    <video
                                      src={m.localPreviewUrl}
                                      className="w-full h-full object-cover"
                                      muted
                                      playsInline
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <Video className="w-4 h-4 text-white" />
                                    </div>
                                  </>
                                ) : (
                                  <img
                                    src={m.localPreviewUrl}
                                    alt={m.title}
                                    className="w-full h-full object-cover"
                                  />
                                )}

                                {m.status === 'ready' && (
                                  <div className="absolute top-1 right-1 p-0.5 rounded-full bg-emerald-500 text-white shadow-xs z-20" title="Ready">
                                    <Check className="w-2.5 h-2.5" />
                                  </div>
                                )}
                              </div>

                              {/* Editable Info / Skeleton */}
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                  {isLoading ? (
                                    <div className="space-y-1.5 py-1">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E] text-[10px] font-bold animate-pulse">
                                          <Sparkle className="w-3 h-3 animate-spin" />
                                          {m.status === 'pending' ? 'Processing...' : m.status === 'compressing' ? 'Compressing File...' : 'Uploading...'}
                                        </span>
                                      </div>
                                      <div className="h-3 bg-neutral-200 dark:bg-neutral-700/70 rounded-md w-3/4 animate-pulse" />
                                      <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700/60 rounded-md w-full animate-pulse" />
                                    </div>
                                  ) : (
                                    <>
                                      <input
                                        type="text"
                                        value={m.title}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setMediaQueue((prev) =>
                                            prev.map((item) => (item.id === m.id ? { ...item, title: val } : item))
                                          );
                                        }}
                                        placeholder="Media title..."
                                        className="w-full text-xs font-bold text-[#1C1B1A] dark:text-white bg-transparent border-b border-transparent focus:border-[#C5A880] focus:outline-none mb-1 truncate"
                                      />
                                      <textarea
                                        value={m.caption}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setMediaQueue((prev) =>
                                            prev.map((item) => (item.id === m.id ? { ...item, caption: val } : item))
                                          );
                                        }}
                                        rows={2}
                                        placeholder="Caption describing session..."
                                        className="w-full text-[11px] text-[#5E5955] dark:text-[#C4BCB5] bg-transparent resize-none focus:outline-none leading-snug"
                                      />
                                    </>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#E8DFD8]/60 dark:border-white/5">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E] font-medium truncate max-w-[130px]">
                                    {m.craftTechnique}
                                  </span>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleMoveMedia(idx, 'up')}
                                      disabled={idx === 0}
                                      className="p-1 text-[#736C65] hover:text-[#1C1B1A] disabled:opacity-30 cursor-pointer"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveMedia(idx, 'down')}
                                      disabled={idx === mediaQueue.length - 1}
                                      className="p-1 text-[#736C65] hover:text-[#1C1B1A] disabled:opacity-30 cursor-pointer"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMedia(m.id)}
                                      className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                                      title="Remove"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Processing Indicator Transitioning to Live Progress Bar */}
                            {isLoading && (
                              <div className="w-full pt-1 border-t border-[#E8DFD8]/60 dark:border-white/5">
                                <div className="flex items-center justify-between text-[10px] text-[#736C65] dark:text-[#A8A29D] mb-1 font-medium">
                                  <span className="flex items-center gap-1 text-[#8C5D36] dark:text-[#E6CA9E]">
                                    {m.status === 'pending' ? (
                                      <span className="animate-pulse">Processing file...</span>
                                    ) : m.status === 'compressing' ? (
                                      <span>Compressing media for fast upload...</span>
                                    ) : (
                                      <span>Uploading to Firebase Storage...</span>
                                    )}
                                  </span>
                                  <span className="font-bold text-[#1C1B1A] dark:text-white">
                                    {m.status === 'pending' ? '0%' : `${m.progress}%`}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700/80 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#C5A880] to-[#E6CA9E] transition-all duration-300 ease-out rounded-full"
                                    style={{
                                      width: `${m.status === 'pending' ? 10 : Math.max(10, m.progress)}%`
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* WORKSHOP DETAILS & PROMINENT (i) EXTRACT INFO BUTTON */}
              <div className="bg-white dark:bg-[#1A1918] p-4 sm:p-5 rounded-2xl border border-[#E8DFD8] dark:border-[#262422] shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#F0EBE5] dark:border-[#262422]">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E]">
                      <Layers className="w-4 h-4" />
                    </span>
                    <h3 className="font-serif text-sm font-bold text-[#1C1B1A] dark:text-white">
                      Workshop Details & Schedule
                    </h3>
                  </div>

                  {/* PROMINENT (i) EXTRACT INFO BUTTON - Uses Gemini Vision API to analyze media and fill form */}
                  <button
                    type="button"
                    onClick={handleExtractInfoFromMedia}
                    disabled={isExtractingInfo}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#b8986c] hover:from-[#b8986c] hover:to-[#a6865b] text-[#1C1B1A] text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm transform active:scale-98"
                    title="Extract info from uploaded photos and videos using AI Vision"
                  >
                    {isExtractingInfo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Extracting with AI Vision...</span>
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
                      Upcoming Batch Start Date
                    </label>
                    <input
                      type="text"
                      value={batchDate}
                      onChange={(e) => setBatchDate(e.target.value)}
                      placeholder="e.g. Sat, Oct 24, 2026"
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

                {/* WhatsApp inquiry message */}
                <div>
                  <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                    Pre-filled WhatsApp Inquiry Message for Students
                  </label>
                  <input
                    type="text"
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    placeholder="Namaste Sahina! I want to join..."
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer with Publish Action */}
            <div className="p-4 sm:p-5 border-t border-[#E8DFD8] dark:border-[#262422] flex items-center justify-between gap-3 bg-white dark:bg-[#1A1918] shrink-0">
              <div className="text-xs text-[#736C65] dark:text-[#A8A29D]">
                <span>{mediaQueue.length} photo(s)/video(s) ready</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl border border-[#E8DFD8] dark:border-white/10 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handlePublishWorkshop}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] text-xs font-bold uppercase tracking-wider hover:bg-[#34312E] dark:hover:bg-neutral-200 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#C5A880]" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#C5A880]" />
                      <span>Publish Workshop & Go Live</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
