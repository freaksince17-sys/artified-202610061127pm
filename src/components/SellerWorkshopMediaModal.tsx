import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  Video, 
  Camera, 
  Check, 
  AlertCircle, 
  Loader2, 
  MapPin, 
  Calendar,
  Layers,
  Wand2,
  Trash2,
  Plus,
  Zap,
  Clock,
  FileCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { WorkshopMediaItem, WorkshopGroup } from '../types';
import { 
  saveWorkshopMediaItem, 
  fetchWorkshopGroups,
  WORKSHOP_GROUPS_METADATA,
  WORKSHOP_FOLDER_VIDEOS,
  WORKSHOP_FOLDER_PHOTOS,
  ALL_WORKSHOP_FOLDER_ASSETS,
  WorkshopFolderAsset,
  isMediaRelatedToGroup,
  fetchWorkshopFilesFromServer
} from '../data/workshops';
import { autoGenerateMediaCaption } from '../utils/workshopAIGenerator';
import { isVideoMedia, getStandardMimeType } from '../services/firebaseWorkshopStorageService';
import { 
  FastUploadFile, 
  UploadProgressInfo, 
  fastBatchUploadWorkshopMedia, 
  compressImageToBlob, 
  extractVideoMetadata, 
  uploadSingleFileFast 
} from '../utils/fastMediaUploader';
import { storeMediaBlobLocally } from '../utils/workshopMediaStore';

interface QueuedItem {
  id: string;
  isFolderAsset: boolean;
  file?: File;
  previewUrl: string;
  url: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  title: string;
  caption: string;
  technique: string;
  duration?: string;
  category?: string;
  originalSize?: number;
}

interface SellerWorkshopMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded?: (item: WorkshopMediaItem) => void;
  onItemsAdded?: (items: WorkshopMediaItem[]) => void;
  editingItem?: WorkshopMediaItem | null;
  defaultGroupId?: string;
  onRequestCreateNewGroup?: () => void;
}

export const SellerWorkshopMediaModal: React.FC<SellerWorkshopMediaModalProps> = ({
  isOpen,
  onClose,
  onItemAdded,
  onItemsAdded,
  editingItem,
  defaultGroupId,
  onRequestCreateNewGroup
}) => {
  const isEditing = !!editingItem;
  const [availableGroups, setAvailableGroups] = useState<Omit<WorkshopGroup, 'items'>[]>(WORKSHOP_GROUPS_METADATA);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId || 'macrame');
  
  // Single item edit/upload states
  const [mediaType, setMediaType] = useState<'image' | 'video'>(editingItem?.type || 'image');
  const [title, setTitle] = useState(editingItem?.title || '');
  const [date, setDate] = useState(editingItem?.date || 'September 2026');
  const [location, setLocation] = useState(editingItem?.location || 'Kathmandu, Nepal');
  const [craftTechnique, setCraftTechnique] = useState(editingItem?.craftTechnique || 'Macrame & Wearable Art');
  const [caption, setCaption] = useState(editingItem?.caption || '');
  const [instructor, setInstructor] = useState(editingItem?.instructor || 'Sahina Shrestha');
  const [attendeesCount, setAttendeesCount] = useState<number>(editingItem?.attendeesCount || 18);
  const [duration, setDuration] = useState(editingItem?.duration || '0:30');
  const [tagsInput, setTagsInput] = useState(editingItem?.tags?.join(', ') || 'Macrame, Hands-on, Kathmandu Workshop');
  const [isFeatured, setIsFeatured] = useState(editingItem ? !!editingItem.featured : true);
  
  // Single file preview
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(editingItem?.url || '');
  const [customUrl, setCustomUrl] = useState(editingItem?.url || '');

  // Multi-file & workshop folder selection queue
  const [queuedItems, setQueuedItems] = useState<QueuedItem[]>([]);
  const [selectedFolderAssetIds, setSelectedFolderAssetIds] = useState<string[]>([]);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<'auto' | 'macrame' | 'sunflower' | 'pearl' | 'all'>('auto');

  // Status & live progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressInfo, setProgressInfo] = useState<UploadProgressInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [liveServerAssets, setLiveServerAssets] = useState<WorkshopFolderAsset[]>([]);

  // Fetch groups and physical server files dynamically when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchWorkshopGroups().then((groups) => {
        if (groups && groups.length > 0) {
          setAvailableGroups(groups);
        }
      });
      fetchWorkshopFilesFromServer().then((files) => {
        if (files && files.length > 0) {
          const mapped: WorkshopFolderAsset[] = files.map((sf) => {
            const cat = (sf.category || '').toLowerCase();
            const normCat: 'macrame' | 'sunflower' | 'pearl' = 
              cat.includes('sunflower') || cat.includes('pipe')
                ? 'sunflower'
                : cat.includes('pearl')
                ? 'pearl'
                : 'macrame';
            const cleanTitle = sf.filename.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || sf.filename;
            return {
              id: `server_${sf.filename.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
              name: sf.filename,
              type: sf.type,
              url: sf.url,
              thumbnailUrl: sf.type === 'video' ? sf.url.replace(/\.[^/.]+$/, '_thumb.jpg') : sf.url,
              category: normCat,
              title: cleanTitle,
              description: `Physical file from ${sf.category} folder in Kathmandu workspace.`,
              suggestedCraftTechnique: normCat === 'macrame' ? 'Macrame Knotting' : normCat === 'pearl' ? 'Pearl Weaving' : 'Pipe Cleaner Sculpting'
            };
          });
          setLiveServerAssets(mapped);
        } else {
          setLiveServerAssets([]);
        }
      });
    }
  }, [isOpen]);

  // Sync with editingItem or defaultGroupId
  useEffect(() => {
    if (editingItem) {
      setMediaType(editingItem.type);
      setTitle(editingItem.title);
      setSelectedGroupId(editingItem.groupId || 'macrame');
      setDate(editingItem.date || 'September 2026');
      setLocation(editingItem.location || 'Kathmandu, Nepal');
      setCraftTechnique(editingItem.craftTechnique || 'Macrame & Wearable Art');
      setCaption(editingItem.caption || '');
      setInstructor(editingItem.instructor || 'Sahina Shrestha');
      setAttendeesCount(editingItem.attendeesCount || 18);
      setDuration(editingItem.duration || '0:30');
      setTagsInput(editingItem.tags?.join(', ') || '');
      setIsFeatured(!!editingItem.featured);
      setPreviewUrl(editingItem.url || '');
      setCustomUrl(editingItem.url || '');
      setSingleFile(null);
      setQueuedItems([]);
      setSelectedFolderAssetIds([]);
    } else {
      setMediaType('image');
      setTitle('');
      setSelectedGroupId(defaultGroupId || 'macrame');
      setDate('September 2026');
      setLocation('Kathmandu, Nepal');
      setCraftTechnique('Macrame & Wearable Art');
      setCaption('');
      setInstructor('Sahina Shrestha');
      setAttendeesCount(18);
      setDuration('0:30');
      setTagsInput('Macrame, Hands-on, Kathmandu Workshop');
      setIsFeatured(true);
      setSingleFile(null);
      setPreviewUrl('');
      setCustomUrl('');
      setQueuedItems([]);
      setSelectedFolderAssetIds([]);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setProgressInfo(null);
  }, [editingItem, defaultGroupId, isOpen]);

  if (!isOpen) return null;

  const currentSelectedGroup = availableGroups.find((g) => (g.groupKey || g.id) === selectedGroupId) || availableGroups[0];
  const isMultiMode = queuedItems.length > 0;

  const autoCategory: 'macrame' | 'sunflower' | 'pearl' | 'all' = 
    selectedGroupId.toLowerCase().includes('macrame')
      ? 'macrame'
      : selectedGroupId.toLowerCase().includes('sunflower')
      ? 'sunflower'
      : selectedGroupId.toLowerCase().includes('pearl')
      ? 'pearl'
      : 'all';

  const activeCategory: 'macrame' | 'sunflower' | 'pearl' | 'all' = 
    selectedFolderFilter === 'auto' ? autoCategory : selectedFolderFilter;

  const combinedAssets = useMemo(() => {
    const list = [...liveServerAssets, ...ALL_WORKSHOP_FOLDER_ASSETS];
    const seen = new Set<string>();
    return list.filter((a) => {
      const key = (a.url || a.id).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [liveServerAssets]);

  const scopedVideos = useMemo(() => {
    const list = combinedAssets.filter((a) => a.type === 'video');
    return activeCategory === 'all' ? list : list.filter((v) => v.category === activeCategory);
  }, [combinedAssets, activeCategory]);

  const scopedPhotos = useMemo(() => {
    const list = combinedAssets.filter((a) => a.type === 'image');
    return activeCategory === 'all' ? list : list.filter((p) => p.category === activeCategory);
  }, [combinedAssets, activeCategory]);

  const scopedAssets = useMemo(() => {
    return activeCategory === 'all'
      ? combinedAssets
      : combinedAssets.filter((a) => a.category === activeCategory);
  }, [combinedAssets, activeCategory]);

  // Toggle selection of a single workshop folder asset
  const handleToggleFolderAsset = (asset: WorkshopFolderAsset) => {
    setErrorMsg(null);
    setSelectedFolderAssetIds((prev) => {
      const isCurrentlySelected = prev.includes(asset.id);
      if (isCurrentlySelected) {
        // Remove from selected list
        const nextIds = prev.filter((id) => id !== asset.id);
        setQueuedItems((qPrev) => qPrev.filter((q) => q.id !== `folder_${asset.id}`));
        return nextIds;
      } else {
        // Add to selected list
        const nextIds = [...prev, asset.id];
        const newQueued: QueuedItem = {
          id: `folder_${asset.id}`,
          isFolderAsset: true,
          previewUrl: asset.url,
          url: asset.url,
          thumbnailUrl: asset.thumbnailUrl,
          type: asset.type,
          title: asset.title,
          caption: asset.description,
          technique: asset.suggestedCraftTechnique,
          duration: asset.duration,
          category: asset.category
        };
        setQueuedItems((qPrev) => {
          const filtered = qPrev.filter((q) => q.id !== `folder_${asset.id}`);
          return [...filtered, newQueued];
        });
        
        // Also update preview and form state for convenience
        setPreviewUrl(asset.url);
        setCustomUrl(asset.url);
        setMediaType(asset.type);
        if (!title) {
          setTitle(asset.title);
          setCaption(asset.description);
          setCraftTechnique(asset.suggestedCraftTechnique);
          if (asset.duration) setDuration(asset.duration);
        }

        return nextIds;
      }
    });
  };

  // Select all scoped workshop folder videos at once
  const handleSelectAllVideos = () => {
    setErrorMsg(null);
    const videoIds = scopedVideos.map((v) => v.id);
    setSelectedFolderAssetIds((prev) => {
      const combined = Array.from(new Set([...prev, ...videoIds]));
      return combined;
    });

    setQueuedItems((prev) => {
      const existingIds = new Set(prev.map((q) => q.id));
      const newItems: QueuedItem[] = scopedVideos.filter(
        (v) => !existingIds.has(`folder_${v.id}`)
      ).map((v) => ({
        id: `folder_${v.id}`,
        isFolderAsset: true,
        previewUrl: v.url,
        url: v.url,
        thumbnailUrl: v.thumbnailUrl,
        type: v.type,
        title: v.title,
        caption: v.description,
        technique: v.suggestedCraftTechnique,
        duration: v.duration,
        category: v.category
      }));
      return [...prev, ...newItems];
    });

    setSuccessMsg(`Selected all ${scopedVideos.length} workshop videos!`);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  // Select all scoped workshop folder photos at once
  const handleSelectAllPhotos = () => {
    setErrorMsg(null);
    const photoIds = scopedPhotos.map((p) => p.id);
    setSelectedFolderAssetIds((prev) => {
      const combined = Array.from(new Set([...prev, ...photoIds]));
      return combined;
    });

    setQueuedItems((prev) => {
      const existingIds = new Set(prev.map((q) => q.id));
      const newItems: QueuedItem[] = scopedPhotos.filter(
        (p) => !existingIds.has(`folder_${p.id}`)
      ).map((p) => ({
        id: `folder_${p.id}`,
        isFolderAsset: true,
        previewUrl: p.url,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
        type: p.type,
        title: p.title,
        caption: p.description,
        technique: p.suggestedCraftTechnique,
        category: p.category
      }));
      return [...prev, ...newItems];
    });

    setSuccessMsg(`Selected all ${scopedPhotos.length} workshop photos!`);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  // Select all scoped workshop folder media items
  const handleSelectAllAssets = () => {
    setErrorMsg(null);
    const allIds = scopedAssets.map((a) => a.id);
    setSelectedFolderAssetIds(allIds);

    const allQueued: QueuedItem[] = scopedAssets.map((a) => ({
      id: `folder_${a.id}`,
      isFolderAsset: true,
      previewUrl: a.url,
      url: a.url,
      thumbnailUrl: a.thumbnailUrl,
      type: a.type,
      title: a.title,
      caption: a.description,
      technique: a.suggestedCraftTechnique,
      duration: a.duration,
      category: a.category
    }));
    setQueuedItems(allQueued);

    setSuccessMsg(`Selected all ${scopedAssets.length} authentic workshop moments!`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  // Clear all selections
  const handleClearSelections = () => {
    setSelectedFolderAssetIds([]);
    setQueuedItems([]);
    setSingleFile(null);
    setPreviewUrl('');
    setCustomUrl('');
  };

  // Fast Multi-File Dropzone Selection Handler
  const handleMultiFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const activeGroupName = currentSelectedGroup?.title || 'Workshop Masterclass';

    const newQueued: QueuedItem[] = files.map((file, i) => {
      const isVid = file.type.startsWith('video') || file.name.match(/\.(mp4|mov|webm)$/i) !== null;
      const auto = autoGenerateMediaCaption(file.name, activeGroupName);
      return {
        id: `local_${Date.now()}_${i}_${file.name}`,
        isFolderAsset: false,
        file,
        previewUrl: URL.createObjectURL(file),
        url: '',
        thumbnailUrl: '',
        type: isVid ? 'video' : 'image',
        title: auto.title,
        caption: auto.caption,
        technique: auto.craftTechnique,
        originalSize: file.size
      };
    });

    setQueuedItems((prev) => [...prev, ...newQueued]);

    // Process video frame extractions in background without blocking UI
    newQueued.forEach((qItem) => {
      if (qItem.type === 'video' && qItem.file) {
        extractVideoMetadata(qItem.file).then((meta) => {
          setQueuedItems((prev) =>
            prev.map((f) => (f.id === qItem.id ? { ...f, duration: meta.duration, thumbnailUrl: meta.thumbnailUrl } : f))
          );
        });
      }
    });

    e.target.value = '';
  };

  const handleRemoveQueuedItem = (idToRemove: string) => {
    setQueuedItems((prev) => prev.filter((f) => f.id !== idToRemove));
    if (idToRemove.startsWith('folder_')) {
      const rawAssetId = idToRemove.replace('folder_', '');
      setSelectedFolderAssetIds((prev) => prev.filter((id) => id !== rawAssetId));
    }
  };

  // Auto-Fill captions and techniques for single item
  const handleAutoFillNotes = () => {
    const activeGroupName = currentSelectedGroup?.title || 'Workshop Masterclass';
    const filename = singleFile?.name || title || 'Masterclass Session';
    const autoData = autoGenerateMediaCaption(filename, activeGroupName);
    
    setTitle(autoData.title);
    setCaption(autoData.caption);
    setCraftTechnique(autoData.craftTechnique);
    setTagsInput(autoData.tags.join(', '));
    setSuccessMsg('Notes auto-generated!');
    setTimeout(() => setSuccessMsg(null), 1500);
  };

  // Auto-Generate notes for all queued items
  const handleAutoGenerateAllQueuedNotes = () => {
    const activeGroupName = currentSelectedGroup?.title || 'Workshop Masterclass';
    setQueuedItems((prev) =>
      prev.map((item) => {
        const seedName = item.file?.name || item.title || 'Craft Moment';
        const auto = autoGenerateMediaCaption(seedName, activeGroupName);
        return {
          ...item,
          title: auto.title,
          caption: auto.caption,
          technique: auto.craftTechnique
        };
      })
    );
    setSuccessMsg(`Auto-generated notes for all ${queuedItems.length} items!`);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  // Form Submit Handler: processes both multi-queue and single uploads reliably
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // ==========================================
    // 1. MULTI-ITEM BATCH FLOW (FOLDER ASSETS + LOCAL FILES)
    // ==========================================
    if (queuedItems.length > 0) {
      setIsSubmitting(true);
      const totalCount = queuedItems.length;

      setProgressInfo({
        overallPercentage: 10,
        completedCount: 0,
        totalCount,
        currentFilename: queuedItems[0].title || 'Processing batch...',
        fileProgress: {},
        status: 'uploading'
      });

      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const commonTags = parsedTags.length > 0 ? parsedTags : ['Workshop Masterclass', 'Kathmandu'];
      const savedResults: WorkshopMediaItem[] = [];

      try {
        for (let i = 0; i < queuedItems.length; i++) {
          const item = queuedItems[i];
          const progressPct = Math.round(((i + 1) / totalCount) * 100);

          setProgressInfo({
            overallPercentage: progressPct,
            completedCount: i,
            totalCount,
            currentFilename: item.title,
            fileProgress: { [item.id]: progressPct },
            status: item.isFolderAsset ? 'saving' : 'uploading'
          });

          let finalUrl = item.url || item.previewUrl;
          let finalThumb = item.thumbnailUrl || item.previewUrl || '';
          let itemDuration = item.duration;

          // Automatically route folder assets to their genuine cohort if selected from predefined folders
          let targetGroup = selectedGroupId;
          if (item.isFolderAsset) {
            if (item.category === 'sunflower' || finalUrl.includes('sunflower') || finalUrl.includes('pipe')) {
              targetGroup = 'pipecleaner-sunflower';
            } else if (item.category === 'macrame' || finalUrl.includes('macrame')) {
              targetGroup = 'macrame';
            } else if (item.category === 'pearl' || finalUrl.includes('pearl')) {
              targetGroup = 'pearls';
            }
          }

          const targetGroupKey = (targetGroup || selectedGroupId).toLowerCase();
          const destFolder = 
            targetGroupKey.includes('sunflower') || targetGroupKey.includes('pipe') ? 'Pipecleaner Sunflower' :
            targetGroupKey.includes('pearl') ? 'Pearls' : 'Macrame';

          // If it's a local uploaded file, run compression & storage upload
          if (!item.isFolderAsset && item.file) {
            let uploadBlob: Blob = item.file;
            const isVideo = isVideoMedia(item.file, item.file.name);
            let contentType = getStandardMimeType(item.file, item.file.name);

            if (!isVideo) {
              const compressed = await compressImageToBlob(item.file, 1600, 1200, 0.82);
              uploadBlob = compressed.blob;
              contentType = 'image/jpeg';
            } else {
              if (!itemDuration || !finalThumb) {
                const meta = await extractVideoMetadata(item.file);
                itemDuration = meta.duration;
                finalThumb = meta.thumbnailUrl;
              }
            }

            finalUrl = await uploadSingleFileFast(
              uploadBlob,
              item.file.name,
              contentType,
              finalThumb,
              undefined,
              destFolder,
              targetGroup
            );

            if (!isVideo) {
              finalThumb = finalUrl;
            } else if (!finalThumb || /\.(mp4|mov|webm|m4v)$/i.test(finalThumb)) {
              if (finalUrl.endsWith('.mp4')) {
                finalThumb = finalUrl.replace(/\.mp4$/i, '_thumb.jpg');
              } else {
                finalThumb = finalUrl;
              }
            }
          }

          const matchedGroup = availableGroups.find((g) => g.groupKey === targetGroup || g.id === targetGroup) || currentSelectedGroup;
          const newItemId = `ws_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;

          // Store local blob in IndexedDB for fast offline revival
          if (!item.isFolderAsset && item.file) {
            try {
              await storeMediaBlobLocally(newItemId, item.file, getStandardMimeType(item.file, item.file.name));
            } catch {}
          }

          const isVidItem = isVideoMedia(item.file || finalUrl, item.file?.name);

          const newItem: WorkshopMediaItem = {
            id: newItemId,
            groupId: targetGroup,
            type: isVidItem ? 'video' : 'image',
            title: item.title.trim() || 'Workshop Craft Moment',
            workshopTitle: matchedGroup?.title || 'Workshop Masterclass',
            batchName: matchedGroup?.badge || 'Masterclass Cohort',
            date: date.trim() || 'September 2026',
            location: location.trim() || 'Kathmandu, Nepal',
            url: finalUrl,
            thumbnailUrl: finalThumb,
            caption: item.caption.trim() || 'Practical workshop hands-on training.',
            craftTechnique: item.technique.trim() || 'Handcraft Technique',
            attendeesCount: Number(attendeesCount) || 18,
            instructor: instructor.trim() || 'Sahina Shrestha',
            featured: isFeatured,
            aspectRatio: item.type === 'video' ? 'vertical' : 'square',
            tags: commonTags,
            duration: item.type === 'video' ? (itemDuration || '0:30') : undefined,
            likes: `${(1.2 + (i % 5) * 0.3).toFixed(1)}k`,
            views: `${(10.5 + (i % 7) * 2.1).toFixed(1)}k`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await saveWorkshopMediaItem(newItem);
          savedResults.push(newItem);
        }

        setProgressInfo({
          overallPercentage: 100,
          completedCount: totalCount,
          totalCount,
          currentFilename: 'Complete!',
          fileProgress: {},
          status: 'completed'
        });

        if (onItemsAdded) {
          onItemsAdded(savedResults);
        } else if (onItemAdded && savedResults[0]) {
          onItemAdded(savedResults[0]);
        }

        setSuccessMsg(`⚡ Successfully added ${savedResults.length} photos and videos to the masterclass!`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        console.error('Batch upload error:', err);
        setErrorMsg(err?.message || 'Failed to save items. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // ==========================================
    // 2. SINGLE ITEM / EDIT FLOW
    // ==========================================
    if (!title.trim()) {
      setErrorMsg('Please enter a media title.');
      return;
    }

    const effectiveMediaUrl = customUrl.trim() || previewUrl || (singleFile ? singleFile.name : '');
    if (!effectiveMediaUrl && !singleFile) {
      setErrorMsg('Please select a photo/video file or click one from the workshop folder.');
      return;
    }

    setIsSubmitting(true);
    setProgressInfo({
      overallPercentage: 20,
      completedCount: 0,
      totalCount: 1,
      currentFilename: singleFile ? singleFile.name : title,
      fileProgress: { single: 20 },
      status: 'uploading'
    });

    try {
      let finalMediaUrl = customUrl.trim() || previewUrl;
      let thumbUrl = customUrl.trim() || previewUrl || '';
      let videoDuration = duration;

      const targetGroupKey = selectedGroupId.toLowerCase();
      const destFolder = 
        targetGroupKey.includes('sunflower') || targetGroupKey.includes('pipe') ? 'Pipecleaner Sunflower' :
        targetGroupKey.includes('pearl') ? 'Pearls' : 'Macrame';

      if (singleFile) {
        let uploadBlob: Blob = singleFile;
        let contentType = singleFile.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');

        if (mediaType === 'image') {
          const compressed = await compressImageToBlob(singleFile, 1920, 1440, 0.85);
          uploadBlob = compressed.blob;
          contentType = 'image/jpeg';
        } else if (mediaType === 'video') {
          const meta = await extractVideoMetadata(singleFile);
          videoDuration = meta.duration;
          thumbUrl = meta.thumbnailUrl;
        }

        finalMediaUrl = await uploadSingleFileFast(
          uploadBlob,
          singleFile.name,
          contentType,
          thumbUrl || previewUrl,
          undefined,
          destFolder,
          selectedGroupId
        );

        if (mediaType !== 'video') {
          thumbUrl = finalMediaUrl;
        } else if (!thumbUrl && finalMediaUrl.endsWith('.mp4')) {
          thumbUrl = finalMediaUrl.replace(/\.mp4$/i, '_thumb.jpg');
        } else if (!thumbUrl) {
          thumbUrl = finalMediaUrl;
        }
      }

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const newItem: WorkshopMediaItem = {
        id: editingItem?.id || `ws_${Date.now()}`,
        groupId: selectedGroupId,
        type: mediaType,
        title: title.trim(),
        workshopTitle: currentSelectedGroup?.title || 'Workshop Masterclass',
        batchName: currentSelectedGroup?.badge || 'Masterclass Cohort',
        date: date.trim() || 'September 2026',
        location: location.trim() || 'Kathmandu, Nepal',
        url: finalMediaUrl || editingItem?.url || '',
        thumbnailUrl: thumbUrl || finalMediaUrl || editingItem?.thumbnailUrl || '',
        caption: caption.trim() || 'Hands-on training session conducted by Sahina Shrestha.',
        craftTechnique: craftTechnique.trim() || 'Craft Mentorship',
        attendeesCount: Number(attendeesCount) || 18,
        instructor: instructor.trim() || 'Sahina Shrestha',
        featured: isFeatured,
        aspectRatio: mediaType === 'video' ? 'vertical' : (editingItem?.aspectRatio || 'square'),
        tags: tags.length > 0 ? tags : ['Craft Training', 'Kathmandu'],
        duration: mediaType === 'video' ? videoDuration : undefined,
        likes: editingItem?.likes || '1.2k',
        views: editingItem?.views || '12.4k',
        createdAt: editingItem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (singleFile) {
        try {
          await storeMediaBlobLocally(newItem.id, singleFile, singleFile.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'));
        } catch {}
      }

      await saveWorkshopMediaItem(newItem);

      if (onItemAdded) {
        onItemAdded(newItem);
      }

      setProgressInfo({
        overallPercentage: 100,
        completedCount: 1,
        totalCount: 1,
        currentFilename: 'Done',
        fileProgress: {},
        status: 'completed'
      });

      setSuccessMsg(isEditing ? 'Media updated successfully!' : '⚡ Workshop memory saved successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error saving workshop media:', err);
      setErrorMsg(err?.message || 'Failed to save media. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1A1918] rounded-3xl shadow-2xl border border-[#E8DFD8] dark:border-[#2E2C29] p-5 sm:p-7 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#F0EBE5] dark:border-[#262422] mb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#C5A880]/15 text-[#C5A880]">
              <Upload className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1C1B1A] dark:text-[#FAF8F5]">
                  {isEditing 
                    ? 'Edit Workshop Media' 
                    : isMultiMode 
                    ? `Upload Multiple Media (${queuedItems.length} Selected)` 
                    : 'Upload Workshop Photos & Videos'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  <Zap className="w-2.5 h-2.5" />
                  <span>Turbo Multi-Upload</span>
                </span>
              </div>
              <p className="text-xs text-[#736C65] dark:text-[#9E9790]">
                Select multiple videos/photos from workshop folder or upload from device
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#736C65] hover:text-[#1C1B1A] dark:text-[#9E9790] dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900/40">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-900/40 animate-fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* Live Turbo Progress Bar */}
        {isSubmitting && progressInfo && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#131211] border border-[#C5A880]/40 shadow-inner">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-[#8C5D36] dark:text-[#E6CA9E] flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {progressInfo.status === 'compressing' && '⚡ Optimizing Media...'}
                  {progressInfo.status === 'uploading' && `⚡ Multi-Stream Uploading: ${progressInfo.currentFilename}`}
                  {progressInfo.status === 'saving' && '⚡ Saving to Masterclass Gallery...'}
                  {progressInfo.status === 'completed' && 'Completed!'}
                </span>
              </span>
              <span className="font-mono font-bold text-[#1C1B1A] dark:text-white">
                {progressInfo.overallPercentage}%
              </span>
            </div>
            
            {/* Progress Track */}
            <div className="w-full h-2 rounded-full bg-[#E8DFD8] dark:bg-[#2E2C29] overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-[#C5A880] via-[#D4B890] to-emerald-500 transition-all duration-200 ease-out"
                style={{ width: `${progressInfo.overallPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#736C65] dark:text-[#9E9790] mt-1.5">
              <span>{progressInfo.completedCount} of {progressInfo.totalCount} finalized</span>
              <span>Fast Parallel Stream Engine</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Target Masterclass Group Selector */}
          <div className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8DFD8] dark:border-[#2E2C29]">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold">
                Target Workshop Masterclass Cohort
              </label>
              {onRequestCreateNewGroup && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestCreateNewGroup();
                  }}
                  className="inline-flex items-center gap-1 text-[#8C5D36] dark:text-[#E6CA9E] font-bold hover:underline cursor-pointer text-[11px]"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Create New Masterclass</span>
                </button>
              )}
            </div>

            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1A1918] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white font-medium focus:outline-none focus:border-[#C5A880]"
            >
              {availableGroups.map((grp) => (
                <option key={grp.groupKey || grp.id} value={grp.groupKey || grp.id}>
                  {grp.badge ? `[${grp.badge}] ` : ''}{grp.title}
                </option>
              ))}
            </select>
          </div>

          {/* Section 1: Multi-Select Videos & Photos Directly from Workshop Folder */}
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#141312] border border-[#E8DFD8] dark:border-[#2E2C29]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div>
                <span className="font-bold text-[#1C1B1A] dark:text-white text-xs flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Select from Authentic Workshop Archive</span>
                </span>
                <p className="text-[10px] text-[#736C65] dark:text-[#9E9790] mt-0.5">
                  Showing genuine media for <strong className="text-[#8C5D36] dark:text-[#E6CA9E]">{currentSelectedGroup?.title}</strong>
                </p>
              </div>

              {/* Quick Batch Actions */}
              {scopedAssets.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {scopedVideos.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllVideos}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-[#1E1C1A] hover:bg-neutral-100 border border-[#E8DFD8] dark:border-[#333] text-[10px] font-bold text-[#8C5D36] dark:text-[#E6CA9E] cursor-pointer"
                    >
                      + {scopedVideos.length} Video{scopedVideos.length > 1 ? 's' : ''}
                    </button>
                  )}
                  {scopedPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllPhotos}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-[#1E1C1A] hover:bg-neutral-100 border border-[#E8DFD8] dark:border-[#333] text-[10px] font-bold text-[#8C5D36] dark:text-[#E6CA9E] cursor-pointer"
                    >
                      + All {scopedPhotos.length} Photos
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSelectAllAssets}
                    className="px-2 py-1 rounded-lg bg-[#C5A880] text-[#1C1B1A] text-[10px] font-bold cursor-pointer hover:bg-[#b8986c]"
                  >
                    + Select All ({scopedAssets.length})
                  </button>
                  {selectedFolderAssetIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelections}
                      className="px-2 py-1 rounded-lg text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    >
                      Clear ({selectedFolderAssetIds.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Folder selection tabs */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5 pb-2 border-b border-[#E8DFD8] dark:border-[#262422]">
              <span className="text-[10px] uppercase font-bold text-[#736C65] dark:text-[#A8A29D] mr-1">Folder:</span>
              <button
                type="button"
                onClick={() => setSelectedFolderFilter('auto')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedFolderFilter === 'auto'
                    ? 'bg-[#1C1B1A] text-white dark:bg-white dark:text-[#1C1B1A] shadow-xs'
                    : 'bg-white/80 dark:bg-[#1E1C1A] text-[#736C65] hover:text-[#1C1B1A] border border-[#E8DFD8] dark:border-[#333]'
                }`}
              >
                🎯 Auto Match
              </button>
              <button
                type="button"
                onClick={() => setSelectedFolderFilter('macrame')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedFolderFilter === 'macrame'
                    ? 'bg-[#C5A880] text-[#1C1B1A] shadow-xs'
                    : 'bg-white/80 dark:bg-[#1E1C1A] text-[#736C65] hover:text-[#1C1B1A] border border-[#E8DFD8] dark:border-[#333]'
                }`}
              >
                📁 Macrame ({combinedAssets.filter((a) => a.category === 'macrame').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFolderFilter('sunflower')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedFolderFilter === 'sunflower'
                    ? 'bg-[#C5A880] text-[#1C1B1A] shadow-xs'
                    : 'bg-white/80 dark:bg-[#1E1C1A] text-[#736C65] hover:text-[#1C1B1A] border border-[#E8DFD8] dark:border-[#333]'
                }`}
              >
                📁 Pipecleaner Sunflower ({combinedAssets.filter((a) => a.category === 'sunflower').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFolderFilter('pearl')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedFolderFilter === 'pearl'
                    ? 'bg-[#C5A880] text-[#1C1B1A] shadow-xs'
                    : 'bg-white/80 dark:bg-[#1E1C1A] text-[#736C65] hover:text-[#1C1B1A] border border-[#E8DFD8] dark:border-[#333]'
                }`}
              >
                📁 Pearls ({combinedAssets.filter((a) => a.category === 'pearl').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFolderFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedFolderFilter === 'all'
                    ? 'bg-[#C5A880] text-[#1C1B1A] shadow-xs'
                    : 'bg-white/80 dark:bg-[#1E1C1A] text-[#736C65] hover:text-[#1C1B1A] border border-[#E8DFD8] dark:border-[#333]'
                }`}
              >
                📂 All Folders ({combinedAssets.length})
              </button>
            </div>

            {/* Asset Multi-Select Grid or Empty Cohort Notice */}
            {scopedAssets.length === 0 ? (
              <div className="py-5 px-4 text-center rounded-xl bg-white dark:bg-[#1A1918] border border-dashed border-[#E8DFD8] dark:border-[#2A2825]">
                <Sparkles className="w-5 h-5 text-[#C5A880] mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-[#1C1B1A] dark:text-white">
                  Upcoming Masterclass Cohort
                </p>
                <p className="text-[11px] text-[#736C65] dark:text-[#9E9790] max-w-sm mx-auto mt-0.5">
                  No completed workshop media is archived for this upcoming cohort yet. Use the upload box below to upload genuine photos or videos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {scopedAssets.map((asset) => {
                  const isSelected = selectedFolderAssetIds.includes(asset.id) || previewUrl === asset.url;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => handleToggleFolderAsset(asset)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all cursor-pointer border relative ${
                        isSelected
                          ? 'bg-[#C5A880]/20 border-[#C5A880] text-[#1C1B1A] dark:text-white shadow-xs ring-1 ring-[#C5A880]'
                          : 'bg-white dark:bg-[#1C1B1A] border-[#E8DFD8] dark:border-[#2E2C29] hover:border-[#C5A880]/60 text-[#5E5955] dark:text-[#C4BCB5]'
                      }`}
                    >
                      {/* Checkbox indicator */}
                      <div className="shrink-0 text-[#C5A880]">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 fill-[#C5A880] text-white dark:text-black" />
                        ) : (
                          <Square className="w-4 h-4 opacity-40" />
                        )}
                      </div>

                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 relative">
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/80 text-white">
                          {asset.type === 'video' ? <Video className="w-2 h-2 text-[#E6CA9E]" /> : <Camera className="w-2 h-2 text-[#E6CA9E]" />}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold truncate leading-tight">
                          {asset.name}
                        </p>
                        <p className="text-[9px] text-[#736C65] dark:text-[#9E9790] truncate">
                          {asset.type === 'video' ? `Video (${asset.duration || '0:30'})` : 'Photo'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Upload from Device Dropzone */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold">
                Or Upload New Files from Your Device
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>Auto-Optimized</span>
              </span>
            </div>
            
            <div className="relative border-2 border-dashed border-[#E8DFD8] dark:border-[#2E2C29] hover:border-[#C5A880] rounded-2xl p-3 text-center bg-[#FAF8F5] dark:bg-[#121110] transition-colors group cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMultiFilesSelected}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="py-1.5 pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-[#C5A880]/15 text-[#C5A880] flex items-center justify-center mx-auto mb-1 group-hover:scale-110 transition-transform">
                  <Upload className="w-4 h-4" />
                </div>
                <p className="font-semibold text-[#1C1B1A] dark:text-white text-xs">
                  Click or drag device files here
                </p>
              </div>
            </div>
          </div>

          {/* Queued Selected Batch Items List */}
          {queuedItems.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#141312] border border-[#E8DFD8] dark:border-[#2E2C29]">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1C1B1A] dark:text-white text-xs">
                    {queuedItems.length} Selected Media Items in Batch Queue
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E] text-[10px] font-bold">
                    Ready to Publish
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAutoGenerateAllQueuedNotes}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8C5D36] dark:text-[#E6CA9E] hover:underline cursor-pointer bg-white dark:bg-[#1E1D1B] px-2.5 py-1 rounded-lg border border-[#E8DFD8] dark:border-[#333]"
                >
                  <Wand2 className="w-3 h-3 text-[#C5A880]" />
                  <span>⚡ Auto-Notes</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {queuedItems.map((qFile) => (
                  <div
                    key={qFile.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white dark:bg-[#1A1918] border border-[#E8DFD8] dark:border-[#2A2825]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-black shrink-0 relative border border-[#E8DFD8] dark:border-[#333]">
                        {qFile.type === 'video' ? (
                          <video src={qFile.previewUrl} className="w-full h-full object-cover" />
                        ) : (
                          <img src={qFile.previewUrl} alt={qFile.title} className="w-full h-full object-cover" />
                        )}
                        <span className="absolute bottom-0.5 right-0.5 p-0.5 rounded-md bg-black/80 text-white">
                          {qFile.type === 'video' ? <Video className="w-2.5 h-2.5 text-[#E6CA9E]" /> : <Camera className="w-2.5 h-2.5 text-[#E6CA9E]" />}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#1C1B1A] dark:text-white truncate">
                          {qFile.title}
                        </p>
                        <p className="text-[10px] text-[#736C65] dark:text-[#9E9790] truncate">
                          <span className="text-[#C5A880] font-medium">{qFile.technique}</span> {qFile.duration ? `• ${qFile.duration}` : ''} {qFile.isFolderAsset ? '• Workshop Folder' : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQueuedItem(qFile.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single Item Metadata Form when not in multi-mode */}
          {queuedItems.length === 0 && (
            <>
              {/* Single File Preview Thumbnail if selected */}
              {previewUrl && (
                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#141312] border border-[#E8DFD8] dark:border-[#2E2C29]">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 relative border border-[#E8DFD8] dark:border-[#333]">
                    {mediaType === 'video' ? (
                      <video src={previewUrl} className="w-full h-full object-cover" />
                    ) : (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute bottom-1 right-1 p-1 rounded-md bg-black/80 text-[#E6CA9E]">
                      {mediaType === 'video' ? <Video className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#1C1B1A] dark:text-white truncate">
                      {singleFile ? singleFile.name : (title || 'Selected Media')}
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Ready for publish
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSingleFile(null);
                      setPreviewUrl('');
                      setCustomUrl('');
                    }}
                    className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Title & Auto-Fill button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold">
                    Title / Activity Name *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoFillNotes}
                    className="inline-flex items-center gap-1 text-[#8C5D36] dark:text-[#E6CA9E] hover:underline cursor-pointer text-[11px] font-bold"
                  >
                    <Wand2 className="w-3 h-3 text-[#C5A880]" />
                    <span>Auto-Fill Notes</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Macrame Cord Tension & Loop Alignment"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {/* Craft Technique & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold mb-1">
                    Craft Technique
                  </label>
                  <input
                    type="text"
                    value={craftTechnique}
                    onChange={(e) => setCraftTechnique(e.target.value)}
                    placeholder="e.g. Square Knot Tensioning"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div>
                  <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="e.g. September 2026"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold mb-1">
                  Craft Story / Caption
                </label>
                <textarea
                  rows={2}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe what the instructor and candidates are crafting in this moment..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[#736C65] dark:text-[#9E9790] font-medium mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Macrame, Tension, Kathmandu Workshop"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#F0EBE5] dark:border-[#262422] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-[#736C65] dark:text-[#9E9790] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Parallel Multi-Thread Engine Active</span>
            </span>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-[#E8DFD8] dark:border-[#2E2C29] text-[#736C65] hover:text-[#1C1B1A] dark:text-[#9E9790] dark:hover:text-white font-medium cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading & Publishing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>
                      {isEditing 
                        ? 'Update Media' 
                        : queuedItems.length > 0 
                        ? `Upload & Publish (${queuedItems.length} Items)` 
                        : 'Upload & Publish Media'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
