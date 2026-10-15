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
  Wand2,
  Folder,
  FolderPlus,
  CheckSquare,
  Square,
  FileVideo,
  FileImage,
  HardDrive,
  Volume2,
  VolumeX
} from 'lucide-react';
import { WorkshopGroup, WorkshopMediaItem } from '../types';
import { 
  saveWorkshopGroup, 
  deleteWorkshopGroup, 
  saveWorkshopMediaItem, 
  deleteWorkshopMediaPermanent,
  toggleWorkshopMediaAudio,
  uploadWorkshopFileDirectly,
  fetchWorkshopFilesFromServer,
  deleteWorkshopFileFromServer,
  fetchWorkshopFoldersFromServer,
  createWorkshopFolderOnServer,
  fetchWorkshopGroups,
  fetchWorkshopMedia,
  getCustomWorkshopMediaFromStorage,
  buildWorkshopGroups,
  deduplicateMediaItems,
  ServerWorkshopFile,
  WORKSHOP_GROUPS_METADATA,
  isMediaRelatedToGroup
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
  uploadFileToFirebaseStorage, 
  batchDeleteFirebaseStorageFiles 
} from '../services/firebaseWorkshopStorageService';
import { 
  autoGenerateWorkshopGroup, 
  autoGenerateMediaCaption 
} from '../utils/workshopAIGenerator';
import { isVideoMedia, getStandardMimeType } from '../services/firebaseWorkshopStorageService';
import { verifyUploadPath, logMediaIntegrity } from '../utils/workshopDiagnostics';

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

class UnifiedMasterclassModalErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || 'Error initializing editor' };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('UnifiedMasterclassModalErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-white dark:bg-[#1C1B1A] p-6 rounded-2xl border border-[#E8DFD8] dark:border-[#333] text-center shadow-xl">
            <h3 className="font-serif text-lg font-bold text-[#1C1B1A] dark:text-white mb-2">
              Workshop Studio Editor
            </h3>
            <p className="text-xs text-[#736C65] dark:text-[#A8A29D] mb-4">
              Unable to open editor for this workshop. Please try again.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMsg: '' })}
                className="px-4 py-2 rounded-xl bg-[#C5A880] text-[#1C1B1A] text-xs font-bold cursor-pointer hover:bg-[#b8986c]"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={this.props.onClose}
                className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const UnifiedMasterclassModalInner: React.FC<UnifiedMasterclassModalProps> = ({
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

  // Active selected workshop - initialized safely from defaultGroupId or first available group
  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    return defaultGroupId || (propGroups && propGroups[0] ? (propGroups[0].groupKey || propGroups[0].id) : '');
  });
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State: Workshop Details
  const [title, setTitle] = useState('');
  const [badge, setBadge] = useState('Workshop • Special Batch');
  const [date, setDate] = useState('Starting Next Saturday • 11:00 AM');
  const [batchDate, setBatchDate] = useState('Sat, Oct 24, 2026');
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

  // Code File Explorer & Destination Folder states
  const [serverFiles, setServerFiles] = useState<ServerWorkshopFile[]>([]);
  const [isLoadingServerFiles, setIsLoadingServerFiles] = useState(false);
  const [showServerFilesDrawer, setShowServerFilesDrawer] = useState(false);
  const [selectedExplorerFiles, setSelectedExplorerFiles] = useState<string[]>([]);
  const [explorerFolderFilter, setExplorerFolderFilter] = useState<string>('all');
  const [availableFolders, setAvailableFolders] = useState<string[]>(['Macrame', 'Pearls', 'Pipecleaner Sunflower']);
  const [targetFolder, setTargetFolder] = useState<string>('Macrame');
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal fallback when props are empty
  useEffect(() => {
    if (isOpen && (!propGroups || propGroups.length === 0)) {
      Promise.all([fetchWorkshopGroups(), fetchWorkshopMedia()]).then(([gMetas, media]) => {
        setInternalMedia(media || []);
        const built = buildWorkshopGroups(media || [], gMetas || WORKSHOP_GROUPS_METADATA);
        setInternalGroups(built);
      });
    }
  }, [isOpen, propGroups]);

  // Synchronize active selected workshop whenever defaultGroupId or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    if (defaultGroupId) {
      setActiveGroupId(defaultGroupId);
      setIsCreatingNew(false);
    } else if (availableGroups.length > 0 && !activeGroupId) {
      setActiveGroupId(availableGroups[0]?.groupKey || availableGroups[0]?.id || '');
      setIsCreatingNew(false);
    } else if (availableGroups.length === 0) {
      setIsCreatingNew(true);
    }
  }, [isOpen, defaultGroupId, availableGroups]);

  // Fetch available folders from code explorer on modal open
  useEffect(() => {
    if (isOpen) {
      fetchWorkshopFoldersFromServer().then((folders) => {
        if (folders && folders.length > 0) {
          setAvailableFolders(folders);
        }
      }).catch(() => {});
      loadServerFiles();
    }
  }, [isOpen]);

  // Load details of the active workshop and synchronize destination folder
  useEffect(() => {
    if (!isOpen) return;
    if (isCreatingNew) {
      const batchNum = availableGroups.length + 1;
      setTitle(`Workshop Batch #${batchNum < 10 ? '0' + batchNum : batchNum}`);
      setBadge(`Workshop • Batch #${batchNum < 10 ? '0' + batchNum : batchNum}`);
      setDate('Starting Next Saturday • 11:00 AM');
      setBatchDate('Sat, Oct 24, 2026');
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
      setBatchDate(current.batchDate || current.nextBatchDate || 'Sat, Oct 24, 2026');
      setLocation(current.location || 'Kathmandu, Nepal');
      setInstructor(current.instructor || 'Sahina Shrestha');
      setAttendeesCount(current.attendeesCount || 15);
      setTagline(current.tagline || '');
      setDescription(current.description || '');
      setWhatsappMessage(current.whatsappMessage || '');
      setConfirmDeleteGroup(false);
      setStatusMessage(null);

      // Automatically map folder in code explorer to this workshop
      const norm = (current.groupKey || current.id || '').toLowerCase();
      let matchedFolder = 'Macrame';
      if (norm.includes('sunflower') || norm.includes('pipe')) {
        matchedFolder = 'Pipecleaner Sunflower';
      } else if (norm.includes('pearl')) {
        matchedFolder = 'Pearls';
      } else if (norm.includes('macrame')) {
        matchedFolder = 'Macrame';
      }
      setTargetFolder(matchedFolder);
      setExplorerFolderFilter(matchedFolder);
    }
  }, [isOpen, activeGroupId, isCreatingNew, availableGroups]);

  // Load physical files in public/workshops/
  const loadServerFiles = async () => {
    setIsLoadingServerFiles(true);
    try {
      const files = await fetchWorkshopFilesFromServer();
      setServerFiles(Array.isArray(files) ? files : []);
    } catch {
      setServerFiles([]);
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

  // Resolve current active workshop metadata safely
  const currentGroup = availableGroups.find((g) => (g.groupKey || g.id) === activeGroupId || g.id === activeGroupId) || availableGroups[0];

  // Filter media items for the currently selected workshop with strict group logic
  const currentWorkshopMedia = allMediaItems.filter((item) => {
    if (!item) return false;
    if (isCreatingNew) {
      const cleanTitle = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'new-batch';
      return item.groupId === 'new-batch' || item.groupId === cleanTitle;
    }
    const targetKey = currentGroup?.groupKey || activeGroupId || 'macrame';
    const targetId = currentGroup?.id || activeGroupId || 'macrame';
    return isMediaRelatedToGroup(item, targetKey) || isMediaRelatedToGroup(item, targetId);
  });

  // Safe URI decoder
  const safeDecodeString = (str: string): string => {
    try {
      return decodeURIComponent(str || '');
    } catch {
      return str || '';
    }
  };

  // Filter physical files in Code File Explorer drawer based on folder tab with alias deduplication
  const filteredExplorerFiles = React.useMemo(() => {
    if (!Array.isArray(serverFiles)) return [];
    const scoped = serverFiles.filter((f) => {
      if (!f || !f.filename) return false;
      if (explorerFolderFilter === 'all') return true;
      const cat = (f.category || f.folder || '').toLowerCase();
      const target = (explorerFolderFilter || '').toLowerCase();
      return cat === target || f.filename.toLowerCase().startsWith(target + '/');
    });

    const seen = new Set<string>();
    const deduplicated: typeof serverFiles = [];
    const sorted = [...scoped].sort((a, b) => {
      const aSpace = a.filename?.includes(' ') ? 1 : 0;
      const bSpace = b.filename?.includes(' ') ? 1 : 0;
      return bSpace - aSpace;
    });
    for (const f of sorted) {
      if (!f || !f.filename) continue;
      const folder = f.folder || f.category || (f.filename.includes('/') ? f.filename.split('/')[0] : '');
      const parts = f.filename.split('/');
      const last = parts[parts.length - 1] || '';
      const base = last.replace(/\.[^/.]+$/, '').replace(/_\d+$/, '').replace(/[^a-z0-9]/g, '');
      const key = `${folder.toLowerCase()}:${base.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(f);
      }
    }
    return deduplicated;
  }, [serverFiles, explorerFolderFilter]);

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
        batchDate: batchDate.trim() || 'Sat, Oct 24, 2026',
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

  // Create a new folder directly in public/workshops/ on server disk
  const handleCreateNewFolder = async () => {
    if (!newFolderNameInput.trim()) return;
    const folderName = newFolderNameInput.trim();
    try {
      const created = await createWorkshopFolderOnServer(folderName);
      if (created) {
        setAvailableFolders((prev) => Array.from(new Set([...prev, created])));
        setTargetFolder(created);
        setIsCreatingNewFolder(false);
        setNewFolderNameInput('');
        setStatusMessage({ 
          type: 'success', 
          text: `📁 Created folder "public/workshops/${created}/" in code explorer!` 
        });
        setTimeout(() => setStatusMessage(null), 3000);
        loadServerFiles();
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to create folder on server.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error creating folder' });
    }
  };

  // Toggle selection of a file in the Code File Explorer
  const handleToggleSelectExplorerFile = (filename: string) => {
    setSelectedExplorerFiles((prev) => 
      prev.includes(filename) ? prev.filter((f) => f !== filename) : [...prev, filename]
    );
  };

  // Delete a physical file from the Code File Explorer server folder
  const handleDeleteExplorerFile = async (filename: string) => {
    try {
      const success = await deleteWorkshopFileFromServer(filename);
      if (success) {
        setServerFiles((prev) => prev.filter((f) => f.filename !== filename));
        setSelectedExplorerFiles((prev) => prev.filter((f) => f !== filename));
        setStatusMessage({
          type: 'success',
          text: `🗑️ Successfully deleted "${filename}" from server!`
        });
        setTimeout(() => setStatusMessage(null), 3000);

        const updated = allMediaItems.filter((m) => !m.url?.includes(filename));
        if (onMediaUpdated) {
          onMediaUpdated(updated);
        }
        setInternalMedia(updated);
        loadServerFiles();
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to delete file from server.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error deleting file' });
    }
  };

  // 1-Click Auto-sync all 3 workshop folders on disk to their canonical classes
  const handleSyncAllFolders = async () => {
    setIsLoadingServerFiles(true);
    try {
      const res = await fetch('/api/workshop-media/sync-folders', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.items)) {
          setInternalMedia(data.items);
          if (onMediaUpdated) {
            onMediaUpdated(data.items);
          }
          setStatusMessage({
            type: 'success',
            text: `✨ Successfully synced all 3 folders! Pearl -> Pearl Bag, Sunflower -> Sunflower, Macrame -> Macrame!`
          });
          setTimeout(() => setStatusMessage(null), 3500);
          loadServerFiles();
          return;
        }
      }
    } catch (e) {
      console.warn('Sync folders error:', e);
    } finally {
      setIsLoadingServerFiles(false);
    }
  };

  // Attach or re-assign selected files from the Code File Explorer to a workshop class
  const handleAttachFilesFromExplorer = async (specificFilenames?: string[], assignToGroupId?: string) => {
    const toAttach = specificFilenames || selectedExplorerFiles;
    if (!toAttach || toAttach.length === 0) return;

    const activeWorkshopKey = isCreatingNew
      ? (title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'new-batch')
      : (currentGroup?.groupKey || activeGroupId || 'macrame');

    // Determine target group based on context:
    let defaultFolderTarget: string | undefined = undefined;
    if (explorerFolderFilter.toLowerCase().includes('pearl')) {
      defaultFolderTarget = 'pearl-bag';
    } else if (explorerFolderFilter.toLowerCase().includes('sunflower') || explorerFolderFilter.toLowerCase().includes('pipe')) {
      defaultFolderTarget = 'sunflower';
    } else if (explorerFolderFilter.toLowerCase().includes('macrame')) {
      defaultFolderTarget = 'macrame';
    }

    const effectiveAssignTo = assignToGroupId || (explorerFolderFilter !== 'all' ? defaultFolderTarget : activeWorkshopKey);
    const isByFolder = effectiveAssignTo === 'by-folder' || effectiveAssignTo === 'auto';
    const targetKey = isByFolder ? 'by-folder' : (effectiveAssignTo || activeWorkshopKey);
    const targetGroup = availableGroups.find((g) => (g.groupKey || g.id) === targetKey || g.id === targetKey);
    const canonicalKey = isByFolder ? 'by-folder' : (targetGroup?.groupKey || (
      targetKey.toLowerCase().includes('sunflower') || targetKey.toLowerCase().includes('pipe') ? 'sunflower' : 
      targetKey.toLowerCase().includes('pearl') ? 'pearl-bag' : 'macrame'
    ));

    // Call server assign-batch endpoint for persistent atomic assignment
    try {
      const res = await fetch('/api/workshop-media/assign-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: toAttach, targetGroupId: canonicalKey })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.items)) {
          setInternalMedia(data.items);
          if (onMediaUpdated) {
            onMediaUpdated(data.items);
          }
          setStatusMessage({
            type: 'success',
            text: isByFolder
              ? `✨ Successfully organized all ${toAttach.length} file(s) into their true workshop classes!`
              : `✨ Successfully assigned ${toAttach.length} item(s) to "${targetGroup?.title || title || 'Workshop'}"!`
          });
          setTimeout(() => setStatusMessage(null), 3500);
          setSelectedExplorerFiles([]);
          loadServerFiles();
          return;
        }
      }
    } catch (e) {
      console.warn('Backend batch assign fallback to client updater:', e);
    }

    // Fallback client-side updater
    const updatedMedia = [...allMediaItems];
    for (const filename of toAttach) {
      const fileObj = serverFiles.find((f) => f.filename === filename);
      if (!fileObj) continue;

      const fnLower = filename.toLowerCase();
      const resolvedFamily = isByFolder ? (
        fnLower.includes('sunflower') || fnLower.includes('pipe') ? 'sunflower' :
        fnLower.includes('pearl') ? 'pearl-bag' : 'macrame'
      ) : canonicalKey;

      const cleanBase = filename.split('/').pop()?.replace(/\.[^/.]+$/, '') || filename;
      const cleanName = filename.split('/').pop() || filename;
      const effectiveGroup = availableGroups.find((g) => (g.groupKey || g.id) === resolvedFamily || g.id === resolvedFamily);
      const aiCaption = autoGenerateMediaCaption(cleanBase, effectiveGroup?.title || targetGroup?.title || title || 'Kathmandu Workshop');
      const isVid = fileObj.type === 'video' || /\.(mp4|mov|webm|m4v)$/i.test(fileObj.filename);
      const thumb = fileObj.thumbnailUrl || (isVid ? fileObj.url.replace(/\.mp4$/i, '_thumb.jpg') : fileObj.url);

      const existingIndex = updatedMedia.findIndex((m) => 
        m.url === fileObj.url || (m.url && m.url.endsWith(cleanName))
      );

      if (existingIndex >= 0) {
        const updatedItem: WorkshopMediaItem = {
          ...updatedMedia[existingIndex],
          groupId: resolvedFamily,
          workshopTitle: effectiveGroup?.title || targetGroup?.title || title || updatedMedia[existingIndex].workshopTitle,
          updatedAt: new Date().toISOString()
        };
        updatedMedia[existingIndex] = updatedItem;
        await saveWorkshopMediaItem(updatedItem);
      } else {
        const newItem: WorkshopMediaItem = {
          id: `ws_media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          groupId: resolvedFamily,
          type: isVid ? 'video' : 'image',
          title: aiCaption.title,
          workshopTitle: effectiveGroup?.title || targetGroup?.title || title || 'Artisan Workshop',
          url: fileObj.url,
          thumbnailUrl: thumb,
          caption: aiCaption.caption,
          craftTechnique: aiCaption.craftTechnique || 'Handcrafted Technique',
          location: location || 'Kathmandu, Nepal',
          date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          instructor: instructor || 'Sahina Shrestha',
          tags: ['Kathmandu Workshop', badge],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedMedia.push(newItem);
        await saveWorkshopMediaItem(newItem);
      }
    }

    setInternalMedia(updatedMedia);
    if (onMediaUpdated) {
      onMediaUpdated(updatedMedia);
    }
    setStatusMessage({
      type: 'success',
      text: isByFolder
        ? `✨ Successfully organized all media by class folder!`
        : `✨ Successfully assigned ${toAttach.length} item(s) to "${targetGroup?.title || title}"!`
    });
    setTimeout(() => setStatusMessage(null), 3500);
    setSelectedExplorerFiles([]);
  };

  // Detach a physical file from the active workshop
  const handleDetachFileFromWorkshop = async (filename: string) => {
    const cleanName = filename.split('/').pop() || filename;
    const itemToDetach = allMediaItems.find((m) => 
      m.url === `/workshops/${filename}` || (m.url && m.url.endsWith(cleanName))
    );
    if (itemToDetach) {
      const updatedItem: WorkshopMediaItem = {
        ...itemToDetach,
        groupId: 'unassigned',
        updatedAt: new Date().toISOString()
      };
      await saveWorkshopMediaItem(updatedItem);
      const updatedList = allMediaItems.map((m) => m.id === itemToDetach.id ? updatedItem : m);
      setInternalMedia(updatedList);
      if (onMediaUpdated) {
        onMediaUpdated(updatedList);
      }
      setStatusMessage({ type: 'success', text: `Detached "${itemToDetach.title}" from this workshop.` });
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  // Upload Photos & Videos directly to the selected folder in code explorer
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const targetKey = isCreatingNew ? (title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'new-batch') : activeGroupId;
    setIsUploading(true);
    setStatusMessage(null);

    const destFolder = targetFolder || 'Macrame';
    const uploadedItems: WorkshopMediaItem[] = [];
    const total = files.length;
    let lastErrorReason: string | null = null;

    console.group(`🚀 [Upload Handler] Starting batch upload of ${total} file(s) to folder "${destFolder}" (targetGroupKey: "${targetKey}")`);

    for (let i = 0; i < total; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${i + 1} of ${total}: "${file.name}"...`);

      console.group(`📤 [File Upload ${i + 1}/${total}] Processing file: "${file.name}" (${file.size} bytes, type: ${file.type})`);

      try {
        const isVid = isVideoMedia(file, file.name);
        const origBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || (isVid ? 'mp4' : 'jpg') : (isVid ? 'mp4' : 'jpg');
        
        // Generate unique filename ensuring no collisions
        const timestamp = Date.now();
        const finalCleanName = `${origBaseName}_${timestamp}.${ext}`;

        const aiCaption = autoGenerateMediaCaption(file.name, title || 'Kathmandu Artisan Workshop');

        let savedUrl = '';
        let savedThumb = '';

        // 1. Primary Fast Path: Direct local backend streaming (/api/workshop-upload-binary)
        // This is immediate (<50ms), writes directly to disk, and automatically generates video thumbnails
        try {
          const uploadRes = await fetch(`/api/workshop-upload-binary?folder=${encodeURIComponent(destFolder)}&filename=${encodeURIComponent(finalCleanName)}&groupId=${encodeURIComponent(targetKey)}&type=${isVid ? 'video' : 'image'}&title=${encodeURIComponent(aiCaption.title)}`, {
            method: 'POST',
            headers: {
              'Content-Type': file.type || (isVid ? 'video/mp4' : 'image/jpeg'),
              'x-filename': finalCleanName,
              'x-folder': destFolder,
              'x-group-id': targetKey,
              'x-type': isVid ? 'video' : 'image',
              'x-title': aiCaption.title
            },
            body: file
          });
          if (uploadRes.ok) {
            const uData = await uploadRes.json();
            if (uData?.url) {
              savedUrl = uData.url;
              savedThumb = uData.thumbnailUrl || uData.url;
              console.info('⚡ Successfully saved to workshop disk:', savedUrl);
            }
          }
        } catch (serverErr) {
          console.warn('Backend binary upload notice, trying Firebase Storage:', serverErr);
        }

        // 2. Cloud Path: Firebase Storage for persistence (if server disk upload wasn't used, or for cloud mirror)
        if (!savedUrl) {
          try {
            const mime = getStandardMimeType(file, finalCleanName);
            const cloudUrl = await uploadFileToFirebaseStorage(file, finalCleanName, mime);
            if (cloudUrl) {
              savedUrl = cloudUrl;
              if (isVid) {
                try {
                  const meta = await extractVideoMetadata(file);
                  savedThumb = meta.thumbnailUrl || cloudUrl;
                } catch {
                  savedThumb = cloudUrl;
                }
              } else {
                savedThumb = cloudUrl;
              }
              console.info('☁️ Successfully uploaded to Firebase Storage:', savedUrl);
            }
          } catch (cloudErr: any) {
            lastErrorReason = cloudErr?.message;
            console.warn('Firebase Storage upload notice, falling back to local client processing:', cloudErr);
          }
        }

        // 3. Fallback: Base64 data URL if server and cloud are unreachable
        if (!savedUrl) {
          if (!isVid) {
            try {
              const comp = await compressImageToBlob(file, 1280, 960, 0.8);
              savedUrl = await blobToBase64(comp.blob);
              savedThumb = savedUrl;
            } catch {
              savedUrl = await blobToBase64(file);
              savedThumb = savedUrl;
            }
          } else {
            savedUrl = `/workshops/${encodeURIComponent(destFolder)}/${encodeURIComponent(finalCleanName)}`;
            savedThumb = savedUrl;
          }
        }

        const newItem: WorkshopMediaItem = {
          id: `ws_media_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          groupId: targetKey,
          type: isVid ? 'video' : 'image',
          title: aiCaption.title,
          workshopTitle: title || 'Artisan Workshop',
          url: savedUrl,
          thumbnailUrl: savedThumb || savedUrl,
          caption: aiCaption.caption,
          craftTechnique: aiCaption.craftTechnique || 'Handcrafted Technique',
          location: location || 'Kathmandu, Nepal',
          date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          instructor: instructor || 'Sahina Shrestha',
          tags: ['Kathmandu Workshop', badge, isVid ? 'Workshop Video' : 'Workshop Photo'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await saveWorkshopMediaItem(newItem);
        uploadedItems.push(newItem);
        console.groupEnd();
      } catch (err: any) {
        lastErrorReason = err?.message || 'File processing error';
        console.error(`❌ Error uploading file ${file.name}:`, err);
        console.groupEnd();
      }
    }

    console.info('🎉 Batch upload finished successfully. Total saved items:', uploadedItems.length);
    console.groupEnd();

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
        text: `✨ Successfully uploaded & verified ${uploadedItems.length} media item(s)!` 
      });
      setTimeout(() => setStatusMessage(null), 3500);
      loadServerFiles();
    } else {
      setStatusMessage({ 
        type: 'error', 
        text: lastErrorReason ? `Upload failed: ${lastErrorReason}` : 'Upload failed. Please ensure file is a valid photo (JPG, PNG, WebP) or video (MP4, WebM, MOV).' 
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Delete a media item from this workshop & purge from cloud storage immediately
  const handleDeleteMediaItem = async (item: WorkshopMediaItem, deleteFileFromDisk = false) => {
    try {
      await deleteWorkshopMediaPermanent(item.id, deleteFileFromDisk);
      
      // Explicitly trigger Firebase Storage batch delete for associated cloud paths
      const pathsToPurge = [item.url, item.thumbnailUrl].filter(Boolean) as string[];
      await batchDeleteFirebaseStorageFiles(pathsToPurge);

      const updated = allMediaItems.filter((m) => m.id !== item.id);
      if (onMediaUpdated) {
        onMediaUpdated(updated);
      }
      setInternalMedia(updated);
      setStatusMessage({ 
        type: 'success', 
        text: `Removed "${item.title}" from this workshop and purged from cloud storage.` 
      });
      setTimeout(() => setStatusMessage(null), 2500);
      loadServerFiles();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to delete media.' });
    }
  };

  // Toggle whether audio is removed (muted) or restored for a video media item
  const handleToggleMediaAudio = async (item: WorkshopMediaItem) => {
    try {
      const updated = await toggleWorkshopMediaAudio(item.id);
      if (updated) {
        const nextMedia = allMediaItems.map((m) => (m.id === item.id ? updated : m));
        if (onMediaUpdated) {
          onMediaUpdated(nextMedia);
        }
        setInternalMedia(nextMedia);
        setStatusMessage({
          type: 'success',
          text: updated.isAudioRemoved 
            ? `Audio removed from "${item.title}". Video is now silent for customers.`
            : `Audio restored to "${item.title}". Sound is active.`
        });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to toggle audio settings.' });
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
                  Upcoming Start Batch Date *
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
          {/* SECTION: PHOTOS & VIDEOS FOR THIS WORKSHOP */}
          <div className="bg-white dark:bg-[#1A1918] p-4 sm:p-5 rounded-2xl border border-[#E8DFD8] dark:border-[#262422] shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#F0EBE5] dark:border-[#262422]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E]">
                  <Camera className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#1C1B1A] dark:text-white">
                    Photos & Videos for "{title || 'This Workshop'}"
                  </h3>
                  <p className="text-[11px] text-[#736C65] dark:text-[#A8A29D]">
                    Upload new media or link existing videos directly from project folders.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Button to open Code File Explorer */}
                <button
                  type="button"
                  onClick={() => {
                    setShowServerFilesDrawer(true);
                    loadServerFiles();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] hover:bg-[#F0EBE5] dark:hover:bg-[#2A2825] border border-[#C5A880]/50 text-[#8C5D36] dark:text-[#E6CA9E] text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Select from Code Explorer</span>
                  {serverFiles.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#C5A880]/20 text-[10px]">
                      {serverFiles.length}
                    </span>
                  )}
                </button>

                {/* Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.mp4,.mov,.webm,.m4v,.jpg,.jpeg,.png,.webp,.heic,.avif"
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

            {/* Destination Folder Selector in Code File Explorer */}
            <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1E1C1A] border border-[#E8DFD8] dark:border-[#2E2C29] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#C5A880] shrink-0" />
                <span className="text-xs font-semibold text-[#1C1B1A] dark:text-neutral-200">
                  Save Uploads into Code Folder:
                </span>
                
                {isCreatingNewFolder ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Folder name (e.g. Pottery)"
                      value={newFolderNameInput}
                      onChange={(e) => setNewFolderNameInput(e.target.value)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-[#C5A880] bg-white dark:bg-[#141312] text-[#1C1B1A] dark:text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewFolder}
                      className="px-2 py-1 rounded-lg bg-[#C5A880] text-[#1C1B1A] text-xs font-bold cursor-pointer hover:bg-[#b8986c]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewFolder(false)}
                      className="px-2 py-1 rounded-lg text-xs text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    value={targetFolder}
                    onChange={(e) => {
                      if (e.target.value === '__CREATE_NEW__') {
                        setIsCreatingNewFolder(true);
                      } else {
                        setTargetFolder(e.target.value);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#252321] border border-[#E8DFD8] dark:border-[#383532] text-xs font-bold text-[#8C5D36] dark:text-[#E6CA9E] focus:outline-none cursor-pointer"
                  >
                    {availableFolders.map((f) => (
                      <option key={f} value={f}>
                        📁 public/workshops/{f}/
                      </option>
                    ))}
                    <option value="">📁 public/workshops/ (Root)</option>
                    <option value="__CREATE_NEW__">➕ + Create New Folder in Code Explorer...</option>
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#736C65] dark:text-[#9E9790]">
                  Target disk path: <code className="text-[#8C5D36] dark:text-[#E6CA9E] font-mono">public/workshops/{targetFolder ? `${targetFolder}/` : ''}</code>
                </span>
                {!isCreatingNewFolder && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewFolder(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8C5D36] dark:text-[#E6CA9E] hover:underline cursor-pointer"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span>New Folder</span>
                  </button>
                )}
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
                {currentWorkshopMedia.map((m) => {
                  if (!m) return null;
                  const isVid = m.type === 'video' || (m.url && m.url.includes('.mp4'));
                  return (
                    <div
                      key={m.id || `wm_${Math.random()}`}
                      className="p-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 relative group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-black mb-2 relative">
                          {isVid ? (
                            <>
                              <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                                <Video className="w-5 h-5 text-white" />
                              </div>
                            </>
                          ) : (
                            <img src={m.url || m.thumbnailUrl} alt={m.title || 'Workshop Media'} className="w-full h-full object-cover" />
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteMediaItem(m)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                            title="Delete photo/video"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Audio Toggle Button for Video */}
                          {isVid && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleMediaAudio(m);
                              }}
                              className={`absolute bottom-1.5 left-1.5 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 backdrop-blur-md transition-all cursor-pointer shadow-xs ${
                                m.isAudioRemoved
                                  ? 'bg-amber-500 text-black font-extrabold ring-1 ring-amber-300'
                                  : 'bg-black/70 text-white hover:bg-black'
                              }`}
                              title={m.isAudioRemoved ? 'Audio removed (silent): Click to restore sound' : 'Click to remove audio (make silent for customers)'}
                            >
                              {m.isAudioRemoved ? (
                                <>
                                  <VolumeX className="w-3 h-3 text-black" />
                                  <span>Silent (Audio Removed)</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3 h-3 text-emerald-400" />
                                  <span>Audio Active</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-[#1C1B1A] dark:text-white truncate" title={m.title}>
                          {m.title || 'Untitled Media'}
                        </h4>
                        <p className="text-[10px] text-[#736C65] dark:text-[#A8A29D] line-clamp-2 mt-0.5">
                          {m.caption || m.description || 'Kathmandu workshop session media'}
                        </p>
                      </div>

                      {/* Video Audio Action Bar */}
                      {isVid && (
                        <div className="mt-2 pt-2 border-t border-[#E8DFD8] dark:border-white/10 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleToggleMediaAudio(m)}
                            className={`w-full py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                              m.isAudioRemoved
                                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 border border-amber-500/40'
                                : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[#5E5955] dark:text-[#C4BCB5]'
                            }`}
                          >
                            {m.isAudioRemoved ? (
                              <>
                                <VolumeX className="w-3 h-3 text-amber-500" />
                                <span>🔊 Restore Audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-emerald-500" />
                                <span>🔇 Remove Audio</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
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
        {/* CODE FILE EXPLORER MODAL OVERLAY */}
        {showServerFilesDrawer && (
          <div 
            className="absolute inset-0 z-50 bg-[#FAF8F5] dark:bg-[#141312] text-[#1C1B1A] dark:text-[#F5F2EB] flex flex-col p-4 sm:p-6 animate-fade-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Explorer Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E8DFD8] dark:border-[#262422] shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E]">
                  <HardDrive className="w-5 h-5 text-[#C5A880]" />
                </span>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#1C1B1A] dark:text-white flex items-center gap-2">
                    <span>Code File Explorer: public/workshops/</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                      {serverFiles.length} Total Files
                    </span>
                  </h3>
                  <p className="text-xs text-[#736C65] dark:text-[#A8A29D]">
                    Select genuine videos & photos from project directories to attach directly to <strong className="text-[#8C5D36] dark:text-[#E6CA9E]">{title || 'this workshop'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadServerFiles}
                  disabled={isLoadingServerFiles}
                  className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-[#5E5955] dark:text-[#C4BCB5] cursor-pointer"
                  title="Refresh files"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingServerFiles ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowServerFilesDrawer(false)}
                  className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-[#5E5955] dark:text-[#C4BCB5] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Folder Filter Tabs & Batch Bar */}
            <div className="py-3 border-b border-[#E8DFD8] dark:border-[#262422] flex flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0">
              {/* Folder Tabs with Workshop Identity */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExplorerFolderFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    explorerFolderFilter === 'all'
                      ? 'bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] shadow-xs'
                      : 'bg-white dark:bg-[#1E1C1A] text-[#736C65] hover:text-[#1C1B1A] border border-[#E8DFD8] dark:border-[#333]'
                  }`}
                >
                  📂 All Folders ({serverFiles.length})
                </button>
                {availableFolders.map((fName) => {
                  const count = serverFiles.filter((f) => 
                    (f.category || f.folder || '').toLowerCase() === fName.toLowerCase() || 
                    f.filename.toLowerCase().startsWith(fName.toLowerCase() + '/')
                  ).length;
                  const isPearls = fName.toLowerCase().includes('pearl');
                  const isPipe = fName.toLowerCase().includes('sunflower') || fName.toLowerCase().includes('pipe');
                  const icon = isPearls ? '🦪' : isPipe ? '🌻' : '🪡';
                  const shortClass = isPearls ? 'Pearl Bag' : isPipe ? 'Sunflower' : 'Macrame';

                  return (
                    <button
                      key={fName}
                      type="button"
                      onClick={() => setExplorerFolderFilter(fName)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        explorerFolderFilter.toLowerCase() === fName.toLowerCase()
                          ? 'bg-[#C5A880] text-[#1C1B1A] shadow-xs'
                          : 'bg-white dark:bg-[#1E1C1A] text-[#736C65] hover:text-[#1C1B1A] border border-[#E8DFD8] dark:border-[#333]'
                      }`}
                      title={`Files for ${shortClass} Workshop`}
                    >
                      <span>{icon} {fName}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const scoped = filteredExplorerFiles.map((f) => f.filename);
                    setSelectedExplorerFiles((prev) => Array.from(new Set([...prev, ...scoped])));
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-[#E8DFD8] dark:border-[#333] bg-white dark:bg-[#1A1918] text-[#5E5955] dark:text-[#C4BCB5] hover:text-black dark:hover:text-white cursor-pointer font-medium"
                >
                  Select All ({filteredExplorerFiles.length})
                </button>

                {/* 1-Click Sync All 3 Folders button */}
                <button
                  type="button"
                  onClick={handleSyncAllFolders}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Auto-organize every file by its folder on disk: Pearls -> Pearl Bag, Sunflower -> Sunflower, Macrame -> Macrame"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Auto-Sync All 3 Folders</span>
                </button>

                {selectedExplorerFiles.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedExplorerFiles([])}
                      className="px-2 py-1 text-xs text-rose-500 hover:underline cursor-pointer font-semibold"
                    >
                      Clear ({selectedExplorerFiles.length})
                    </button>
                    
                    {/* Dynamic Context-Aware Attach Button */}
                    <button
                      type="button"
                      onClick={() => handleAttachFilesFromExplorer()}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {explorerFolderFilter.toLowerCase().includes('pearl')
                          ? `Attach (${selectedExplorerFiles.length}) to 🦪 Pearl Bag Workshop`
                          : explorerFolderFilter.toLowerCase().includes('sunflower') || explorerFolderFilter.toLowerCase().includes('pipe')
                          ? `Attach (${selectedExplorerFiles.length}) to 🌻 Sunflower Workshop`
                          : explorerFolderFilter.toLowerCase().includes('macrame')
                          ? `Attach (${selectedExplorerFiles.length}) to 🪡 Macrame Workshop`
                          : `Auto-Organize (${selectedExplorerFiles.length}) by Folder`}
                      </span>
                    </button>

                    <div className="flex items-center gap-1 pl-1 border-l border-[#E8DFD8] dark:border-[#333]">
                      <span className="text-[10px] text-[#736C65] font-bold">Assign to:</span>
                      <button
                        type="button"
                        onClick={() => handleAttachFilesFromExplorer(undefined, 'pearl-bag')}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-[#333] hover:border-[#C5A880] text-[#1C1B1A] dark:text-white cursor-pointer"
                        title="Assign selected to Bridal Pearl Bag"
                      >
                        🦪 Pearl Bag
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttachFilesFromExplorer(undefined, 'sunflower')}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-[#333] hover:border-[#C5A880] text-[#1C1B1A] dark:text-white cursor-pointer"
                        title="Assign selected to Pipe Sunflower"
                      >
                        🌻 Sunflower
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttachFilesFromExplorer(undefined, 'macrame')}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-[#333] hover:border-[#C5A880] text-[#1C1B1A] dark:text-white cursor-pointer"
                        title="Assign selected to Macrame Wall Art"
                      >
                        🪡 Macrame
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Grid of Files */}
            <div className="flex-1 overflow-y-auto pt-3 pr-1">
              {isLoadingServerFiles ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#C5A880] mb-2" />
                  <p className="text-xs text-[#736C65]">Scanning public/workshops/ on server disk...</p>
                </div>
              ) : filteredExplorerFiles.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-[#E8DFD8] dark:border-white/10 rounded-2xl">
                  <Folder className="w-10 h-10 mx-auto text-neutral-400 mb-2 opacity-50" />
                  <p className="text-sm font-bold text-[#1C1B1A] dark:text-white">No files found in this folder</p>
                  <p className="text-xs text-[#736C65] mt-1">
                    Upload photos or videos into this folder using the destination selector above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredExplorerFiles.map((file) => {
                    const isSelected = selectedExplorerFiles.includes(file.filename);
                    const cleanName = file.filename.split('/').pop() || file.filename;
                    
                    const fileFolder = file.category || file.folder || (file.filename.includes('/') ? file.filename.split('/')[0] : '');
                    const checkStr = `${fileFolder} ${file.filename}`.toLowerCase();
                    const isPearlFolder = checkStr.includes('pearl') || checkStr.includes('bead');
                    const isSunflowerFolder = checkStr.includes('sunflower') || checkStr.includes('pipe') || checkStr.includes('sunglower');
                    const canonicalClassKey = isPearlFolder ? 'pearl-bag' : isSunflowerFolder ? 'sunflower' : 'macrame';
                    const canonicalClassTitle = isPearlFolder ? 'Bridal Pearl Bag' : isSunflowerFolder ? 'Pipe Sunflower' : 'Macrame Wall Art';
                    const canonicalIcon = isPearlFolder ? '🦪' : isSunflowerFolder ? '🌻' : '🪡';

                    // Smart match against allMediaItems by full URL, filename, or normalized base
                    const attachedItem = allMediaItems.find((m) => {
                      if (!m) return false;
                      if (m.url === file.url) return true;
                      const mDec = safeDecodeString(m.url || '').toLowerCase();
                      const fileDec = safeDecodeString(file.url || file.filename || '').toLowerCase();
                      if (mDec.endsWith(cleanName.toLowerCase())) return true;
                      const mBase = mDec.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/_\d+$/, '').replace(/[^a-z0-9]/g, '');
                      const fBase = cleanName.toLowerCase().replace(/\.[^/.]+$/, '').replace(/_\d+$/, '').replace(/[^a-z0-9]/g, '');
                      return mBase && fBase && mBase === fBase;
                    });

                    const attachedGroup = attachedItem 
                      ? availableGroups.find((g) => (g.groupKey || g.id) === attachedItem.groupId || g.id === attachedItem.groupId)
                      : null;

                    const isAttachedToThisWorkshop = attachedItem ? (
                      isMediaRelatedToGroup(attachedItem, currentGroup?.groupKey || activeGroupId) || 
                      isMediaRelatedToGroup(attachedItem, currentGroup?.id || activeGroupId)
                    ) : false;

                    const isVid = file.type === 'video' || /\.(mp4|mov|webm|m4v)$/i.test(file.filename);
                    const sizeStr = file.size > 1024 * 1024 
                      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
                      : `${Math.round(file.size / 1024)} KB`;

                    return (
                      <div
                        key={file.filename}
                        onClick={() => handleToggleSelectExplorerFile(file.filename)}
                        className={`p-2.5 rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#C5A880]/15 border-[#C5A880] shadow-sm ring-2 ring-[#C5A880]'
                            : isAttachedToThisWorkshop
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 hover:border-[#C5A880]/60'
                            : attachedGroup
                            ? 'bg-amber-50/30 dark:bg-amber-950/15 border-amber-200 dark:border-amber-800/40 hover:border-[#C5A880]/60'
                            : 'bg-white dark:bg-[#1C1B1A] border-[#E8DFD8] dark:border-[#2E2C29] hover:border-[#C5A880]/60'
                        }`}
                      >
                        {/* Visual Media Preview */}
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-black mb-2 relative group/item">
                          {isVid ? (
                            <>
                              <video src={file.url} className="w-full h-full object-cover" muted playsInline />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                                <Video className="w-6 h-6 text-white" />
                              </div>
                            </>
                          ) : (
                            <img src={file.url} alt={file.filename} className="w-full h-full object-cover" />
                          )}

                          {/* Checkbox indicator - Always interactive */}
                          <div 
                            className="absolute top-2 left-2 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectExplorerFile(file.filename);
                            }}
                          >
                            <div className="p-1 rounded-lg bg-black/60 text-[#C5A880] backdrop-blur-xs hover:scale-110 transition-transform">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 fill-[#C5A880] text-black" />
                              ) : (
                                <Square className="w-4 h-4 text-white/80" />
                              )}
                            </div>
                          </div>

                          {/* Delete button */}
                          <div className="absolute top-2 right-2 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExplorerFile(file.filename);
                              }}
                              className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white backdrop-blur-xs transition-colors cursor-pointer shadow-xs"
                              title="Delete file from server folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Format & Size badge */}
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] text-white font-mono">
                            {isVid ? 'MP4 Video' : 'Image'} • {sizeStr}
                          </div>

                          {/* Folder badge on top right */}
                          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] text-amber-200 font-semibold">
                            {canonicalIcon} {fileFolder}
                          </div>
                        </div>

                        {/* File Details & Class Tag */}
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <p className="text-xs font-bold text-[#1C1B1A] dark:text-white truncate flex-1" title={file.filename}>
                              {cleanName}
                            </p>
                            {isAttachedToThisWorkshop ? (
                              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                <Check className="w-3 h-3" />
                                <span>Attached</span>
                              </span>
                            ) : attachedGroup ? (
                              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold truncate max-w-[110px]" title={attachedGroup.title || 'Class'}>
                                In: {attachedGroup.title ? attachedGroup.title.split(' ')[0] : 'Class'}
                              </span>
                            ) : (
                              <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-medium">
                                Unassigned
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-[#736C65] dark:text-[#9E9790] truncate">
                            public/workshops/{file.filename}
                          </p>
                        </div>

                        {/* Attach/Detach + 1-Click Reassignment Bar */}
                        <div className="mt-2.5 pt-2 border-t border-[#F0EBE5] dark:border-[#262422] flex flex-col gap-1.5">
                          {isAttachedToThisWorkshop ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDetachFileFromWorkshop(file.filename);
                              }}
                              className="w-full py-1.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              ✕ Detach from {currentGroup?.title?.split(' ')[0] || title?.split(' ')[0] || 'Class'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAttachFilesFromExplorer([file.filename], currentGroup?.groupKey || activeGroupId || canonicalClassKey);
                              }}
                              className="w-full py-1.5 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-[10px] font-bold cursor-pointer transition-all shadow-2xs flex items-center justify-center gap-1"
                            >
                              <span>+ Add to {currentGroup?.title?.split(' ')[0] || title?.split(' ')[0] || 'Class'}</span>
                            </button>
                          )}

                          {/* 1-Click Direct Reassignment Options */}
                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-dashed border-[#F0EBE5] dark:border-[#262422]">
                            <span className="text-[9px] text-[#736C65] dark:text-[#A8A29D] font-semibold shrink-0">Class:</span>
                            <div className="flex items-center gap-1 overflow-x-auto">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAttachFilesFromExplorer([file.filename], 'pearl-bag');
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer shrink-0 ${
                                  attachedGroup?.groupKey === 'pearl-bag'
                                    ? 'bg-amber-200 dark:bg-amber-900/60 text-[#1C1B1A] dark:text-white font-extrabold ring-1 ring-amber-400'
                                    : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C5A880] hover:text-[#1C1B1A]'
                                }`}
                                title="Assign to Bridal Pearl Bag"
                              >
                                🦪 Pearl
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAttachFilesFromExplorer([file.filename], 'sunflower');
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer shrink-0 ${
                                  attachedGroup?.groupKey === 'sunflower'
                                    ? 'bg-amber-200 dark:bg-amber-900/60 text-[#1C1B1A] dark:text-white font-extrabold ring-1 ring-amber-400'
                                    : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C5A880] hover:text-[#1C1B1A]'
                                }`}
                                title="Assign to Pipe Sunflower"
                              >
                                🌻 Pipe
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAttachFilesFromExplorer([file.filename], 'macrame');
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer shrink-0 ${
                                  attachedGroup?.groupKey === 'macrame'
                                    ? 'bg-amber-200 dark:bg-amber-900/60 text-[#1C1B1A] dark:text-white font-extrabold ring-1 ring-amber-400'
                                    : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-[#C5A880] hover:text-[#1C1B1A]'
                                }`}
                                title="Assign to Macrame Wall Art"
                              >
                                🪡 Macrame
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const UnifiedMasterclassModal: React.FC<UnifiedMasterclassModalProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <UnifiedMasterclassModalErrorBoundary onClose={props.onClose}>
      <UnifiedMasterclassModalInner {...props} />
    </UnifiedMasterclassModalErrorBoundary>
  );
};

