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
  Info
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
  ServerWorkshopFile,
  WORKSHOP_GROUPS_METADATA
} from '../data/workshops';

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

  // Active selected masterclass
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State: Masterclass Details
  const [title, setTitle] = useState('');
  const [badge, setBadge] = useState('Masterclass • Special Cohort');
  const [date, setDate] = useState('Starting Nov 2026');
  const [location, setLocation] = useState('Kathmandu, Nepal');
  const [instructor, setInstructor] = useState('Sahina Shrestha');
  const [attendeesCount, setAttendeesCount] = useState<number>(15);
  const [tagline, setTagline] = useState('Hands-on Practical Craft Training');
  const [description, setDescription] = useState('');
  const [techniques, setTechniques] = useState<string[]>([]);
  const [newTechniqueInput, setNewTechniqueInput] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // Form State: Media Upload & Management
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);

  // Existing Server Files Drawer
  const [serverFiles, setServerFiles] = useState<ServerWorkshopFile[]>([]);
  const [isLoadingServerFiles, setIsLoadingServerFiles] = useState(false);
  const [showServerFilesDrawer, setShowServerFilesDrawer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize selected masterclass
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

  // Load details of the active masterclass
  useEffect(() => {
    if (isCreatingNew) {
      const cohortNum = availableGroups.length + 1;
      setTitle(`Masterclass #${cohortNum < 10 ? '0' + cohortNum : cohortNum} New Cohort`);
      setBadge(`Masterclass #${cohortNum < 10 ? '0' + cohortNum : cohortNum}`);
      setDate('Starting Nov 2026');
      setLocation('Kathmandu, Nepal');
      setInstructor('Sahina Shrestha');
      setAttendeesCount(15);
      setTagline('Hands-On Practical Craft Training');
      setDescription('');
      setTechniques(['Material Tensioning', 'Core Assembly', 'Finishing Knots']);
      setWhatsappMessage('Namaste Sahina! I would like to join your workshop cohort in Kathmandu.');
      setConfirmDeleteGroup(false);
      setStatusMessage(null);
      return;
    }

    const current = availableGroups.find((g) => (g.groupKey || g.id) === activeGroupId || g.id === activeGroupId);
    if (current) {
      setTitle(current.title || '');
      setBadge(current.badge || 'Masterclass Cohort');
      setDate(current.date || 'Starting Nov 2026');
      setLocation(current.location || 'Kathmandu, Nepal');
      setInstructor(current.instructor || 'Sahina Shrestha');
      setAttendeesCount(current.attendeesCount || 15);
      setTagline(current.tagline || '');
      setDescription(current.description || '');
      setTechniques(current.keyTechniques && current.keyTechniques.length > 0 ? current.keyTechniques : ['Handcrafting Technique', 'Durability Structure']);
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

  // Filter media items for the currently selected masterclass
  const currentMasterclassMedia = allMediaItems.filter((item) => {
    if (!activeGroupId && !isCreatingNew) return false;
    const key = isCreatingNew ? 'new-cohort' : activeGroupId;
    return item.groupId === key || item.groupId === `ws-group-${key}` || (key.startsWith('ws-group-') && item.groupId === key.replace('ws-group-', ''));
  });

  // Handle adding curriculum technique
  const handleAddTechnique = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newTechniqueInput.trim()) return;
    const clean = newTechniqueInput.trim();
    if (!techniques.includes(clean)) {
      setTechniques([...techniques, clean]);
    }
    setNewTechniqueInput('');
  };

  const handleRemoveTechnique = (idx: number) => {
    setTechniques(techniques.filter((_, i) => i !== idx));
  };

  // Save Masterclass Details (Information, Syllabus, Location, Schedule)
  const handleSaveMasterclassDetails = async (closeOnComplete = false, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a title for this masterclass.' });
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
        keyTechniques: techniques,
        whatsappMessage: whatsappMessage.trim() || `Namaste Sahina! I want to join "${title}" at Kathmandu Workshop.`,
        items: currentMasterclassMedia
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
      console.error('Error saving masterclass:', err);
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to save masterclass details.' });
    } finally {
      setIsSavingGroup(false);
    }
  };

  // Delete Current Masterclass
  const handleDeleteMasterclass = async () => {
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

      // Clean up media for this cohort from internal state
      const remainingMedia = allMediaItems.filter((m) => m.groupId !== currentGroup.id && m.groupId !== currentGroup.groupKey);
      if (onMediaUpdated) {
        onMediaUpdated(remainingMedia);
      }
      setInternalMedia(remainingMedia);

      if (remaining.length > 0) {
        setActiveGroupId(remaining[0].groupKey || remaining[0].id);
      } else {
        setIsCreatingNew(true);
      }

      setStatusMessage({ type: 'success', text: `Deleted masterclass "${currentGroup.title}".` });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to delete masterclass.' });
    }
  };

  // Upload Photos & Videos directly to public/workshops/
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const targetKey = isCreatingNew ? 'new-cohort' : activeGroupId;
    setIsUploading(true);
    setStatusMessage(null);

    const uploadedItems: WorkshopMediaItem[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${i + 1} of ${total}: "${file.name}" to public/workshops/...`);

      try {
        const isVid = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const cleanItemTitle = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const savedItem = await uploadWorkshopFileDirectly({
          fileBase64: base64Data,
          filename: file.name,
          type: isVid ? 'video' : 'image',
          groupId: targetKey,
          title: cleanItemTitle,
          caption: `${cleanItemTitle} session recorded for ${title || 'Masterclass'} at Kathmandu Workshop.`,
          craftTechnique: techniques[0] || 'Handcrafted Technique'
        });

        if (savedItem) {
          uploadedItems.push(savedItem);
        }
      } catch (err) {
        console.error(`Error uploading file ${file.name}:`, err);
      }
    }

    setIsUploading(false);
    setUploadProgress(null);

    if (uploadedItems.length > 0) {
      const updatedList = [...uploadedItems, ...allMediaItems];
      if (onMediaUpdated) {
        onMediaUpdated(updatedList);
      }
      setInternalMedia(updatedList);
      setStatusMessage({ 
        type: 'success', 
        text: `Successfully uploaded ${uploadedItems.length} file(s) directly to public/workshops/!` 
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

  // Attach an existing file from public/workshops/ to this masterclass
  const handleAttachServerFile = async (serverFile: ServerWorkshopFile) => {
    const targetKey = isCreatingNew ? 'new-cohort' : activeGroupId;
    const cleanTitle = serverFile.filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const newItem: WorkshopMediaItem = {
      id: `ws_media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      groupId: targetKey,
      type: serverFile.type,
      title: cleanTitle,
      workshopTitle: title || 'Handcrafted Masterclass',
      url: serverFile.url,
      thumbnailUrl: serverFile.url,
      caption: `${cleanTitle} training highlight at Kathmandu, Nepal.`,
      craftTechnique: techniques[0] || 'Craft Technique',
      location: 'Kathmandu, Nepal',
      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      instructor: instructor || 'Sahina Shrestha',
      tags: ['Kathmandu Workshop'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveWorkshopMediaItem(newItem);
    const updated = [newItem, ...allMediaItems];
    if (onMediaUpdated) {
      onMediaUpdated(updated);
    }
    setInternalMedia(updated);

    setStatusMessage({ type: 'success', text: `Attached "${serverFile.filename}" to this masterclass!` });
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // Delete a media item from this masterclass
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
        text: deleteFileFromDisk ? `Deleted "${item.title}" and removed file from public/workshops/` : `Removed "${item.title}" from this masterclass.` 
      });
      setTimeout(() => setStatusMessage(null), 2500);
      loadServerFiles();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to delete media.' });
    }
  };

  // Reorder media item up or down
  const handleMoveMediaItem = (itemIdx: number, direction: 'up' | 'down') => {
    const list = [...currentMasterclassMedia];
    const targetIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[itemIdx];
    list[itemIdx] = list[targetIdx];
    list[targetIdx] = temp;

    // Update parent list
    const otherItems = allMediaItems.filter((m) => !list.some((l) => l.id === m.id));
    const fullUpdated = [...list, ...otherItems];
    if (onMediaUpdated) {
      onMediaUpdated(fullUpdated);
    }
    setInternalMedia(fullUpdated);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-5xl max-h-[94vh] bg-[#FAF8F5] dark:bg-[#141312] text-[#1C1B1A] dark:text-[#F5F2EB] rounded-2xl sm:rounded-3xl border border-[#E8DFD8] dark:border-[#2E2C29] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8DFD8] dark:border-[#262422] flex items-center justify-between gap-3 bg-white dark:bg-[#1A1918] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A880]/20 flex items-center justify-center text-[#8C5D36] dark:text-[#E6CA9E]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#1C1B1A] dark:text-white">
                Masterclass & Media Manager
              </h2>
              <p className="text-xs text-[#736C65] dark:text-[#A8A29D]">
                Edit syllabus, schedule, and upload specific photos & videos saved directly to <code className="text-[#8C5D36] dark:text-[#E6CA9E] font-mono text-[11px]">public/workshops/</code>.
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

        {/* Masterclass Selector Tabs (One Place to switch between all masterclasses or create new) */}
        <div className="px-4 py-2.5 bg-[#F2ECE4] dark:bg-[#1E1C1A] border-b border-[#E8DFD8] dark:border-[#262422] flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#736C65] dark:text-[#A8A29D] shrink-0 mr-1">
            Cohorts:
          </span>

          {availableGroups.map((g, idx) => {
            const gKey = g.groupKey || g.id;
            const isSelected = !isCreatingNew && (activeGroupId === gKey || activeGroupId === g.id);
            const mediaCount = allMediaItems.filter((m) => m.groupId === gKey || m.groupId === g.id).length;

            return (
              <button
                key={gKey}
                type="button"
                onClick={() => {
                  setIsCreatingNew(false);
                  setActiveGroupId(gKey);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#1C1B1A] text-white dark:bg-white dark:text-[#1C1B1A] shadow-xs'
                    : 'bg-white/80 dark:bg-[#282624] text-[#5E5955] dark:text-[#C4BCB5] hover:bg-white dark:hover:bg-[#322F2D]'
                }`}
              >
                <span>{g.badge || `Masterclass #${idx + 1}`}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white dark:bg-black/20 dark:text-[#1C1B1A]' : 'bg-neutral-200 dark:bg-white/10'
                }`}>
                  {mediaCount} files
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setIsCreatingNew(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              isCreatingNew
                ? 'bg-[#C5A880] text-[#1C1B1A] border-[#C5A880] shadow-xs'
                : 'bg-white/60 dark:bg-white/5 border-dashed border-[#C5A880]/60 text-[#8C5D36] dark:text-[#E6CA9E] hover:bg-[#C5A880]/15'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Masterclass</span>
          </button>
        </div>

        {/* Global Status Message Toast */}
        {statusMessage && (
          <div className={`p-3 text-xs font-semibold flex items-center justify-between gap-2 shrink-0 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-rose-600 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
            <button type="button" onClick={() => setStatusMessage(null)} className="p-1 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Main Body with 2 Integrated Sections */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* SECTION 1: MASTERCLASS DETAILS & SYLLABUS */}
          <div className="bg-white dark:bg-[#1A1918] p-4 sm:p-5 rounded-2xl border border-[#E8DFD8] dark:border-[#262422] shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#F0EBE5] dark:border-[#262422]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E]">
                  <Edit3 className="w-4 h-4" />
                </span>
                <h3 className="font-serif text-base font-bold text-[#1C1B1A] dark:text-white">
                  1. Masterclass Information & Schedule
                </h3>
              </div>

              {!isCreatingNew && (
                confirmDeleteGroup ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-xl border border-rose-300">
                    <span className="text-[11px] text-rose-600 font-bold px-1">Delete masterclass?</span>
                    <button
                      type="button"
                      onClick={handleDeleteMasterclass}
                      className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteGroup(false)}
                      className="px-1.5 py-1 rounded-lg bg-neutral-200 text-[#5E5955] text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteGroup(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Cohort</span>
                  </button>
                )
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-4">
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Masterclass Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Macrame Handcrafting Masterclass"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs font-medium text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {/* Badge */}
              <div>
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Cohort Badge
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. Masterclass #01"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs font-medium text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Date & Schedule
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="e.g. Starting Nov 2026 • Saturdays"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs font-medium text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Atelier / Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Kathmandu, Nepal"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs font-medium text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {/* Instructor */}
              <div>
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Lead Instructor
                </label>
                <input
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="e.g. Sahina Shrestha"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs font-medium text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Max Candidates / Seats
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={attendeesCount}
                  onChange={(e) => setAttendeesCount(parseInt(e.target.value, 10) || 15)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs font-medium text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {/* Tagline */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                  Subtitle Tagline
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Macrame Knotting & Fiber Art Cohort"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs font-medium text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </div>

            {/* Description / Syllabus */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                Syllabus & Masterclass Overview *
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive practical training on ancestral techniques, structural durability, material tensioning, and contemporary Nepali design."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs font-medium text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880] leading-relaxed resize-y"
              />
            </div>

            {/* Curriculum Techniques Pills */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                Curriculum Key Techniques
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {techniques.map((tech, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-[#262422] text-[#1C1B1A] dark:text-white text-xs border border-neutral-200 dark:border-white/10"
                  >
                    <span>✓ {tech}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTechnique(idx)}
                      className="hover:text-rose-500 cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  value={newTechniqueInput}
                  onChange={(e) => setNewTechniqueInput(e.target.value)}
                  onKeyDown={handleAddTechnique}
                  placeholder="Add technique (e.g. Spiral Knotting)..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                />
                <button
                  type="button"
                  onClick={handleAddTechnique}
                  className="px-3 py-1.5 rounded-xl bg-neutral-200 dark:bg-[#282624] hover:bg-neutral-300 text-xs font-bold cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* WhatsApp Message */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#5E5955] dark:text-[#C4BCB5] mb-1">
                WhatsApp Inquiry Message
              </label>
              <input
                type="text"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Namaste Sahina! I want to enroll in this workshop batch in Kathmandu."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 text-xs font-medium text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleSaveMasterclassDetails()}
                disabled={isSavingGroup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] text-xs font-bold uppercase tracking-wider hover:bg-[#34312E] dark:hover:bg-neutral-200 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSavingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-[#C5A880]" />}
                <span>Save Masterclass Details</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: PHOTOS & VIDEOS FOR THIS MASTERCLASS (SAVED TO public/workshops/) */}
          <div className="bg-white dark:bg-[#1A1918] p-4 sm:p-5 rounded-2xl border border-[#E8DFD8] dark:border-[#262422] shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F0EBE5] dark:border-[#262422]">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#C5A880]/20 text-[#8C5D36] dark:text-[#E6CA9E]">
                  <Camera className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#1C1B1A] dark:text-white">
                    2. Photos & Videos for "{title || 'This Masterclass'}"
                  </h3>
                  <p className="text-[11px] text-[#736C65] dark:text-[#A8A29D]">
                    Upload specific photos and videos for this masterclass. Files are directly saved to <code className="text-[#8C5D36] dark:text-[#E6CA9E]">public/workshops/</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowServerFilesDrawer(!showServerFilesDrawer)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#262422] border border-[#E8DFD8] dark:border-white/10 hover:border-[#C5A880] text-xs font-semibold text-[#1C1B1A] dark:text-white transition-all cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>{showServerFilesDrawer ? 'Hide Folder Files' : 'Browse Folder Files'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Files</span>
                </button>
              </div>
            </div>

            {/* Hidden Multiple File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/mp4,video/quicktime,video/webm"
              onChange={(e) => handleUploadFiles(e.target.files)}
              className="hidden"
            />

            {/* Direct Drag & Drop Upload Zone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleUploadFiles(e.dataTransfer.files);
              }}
              className="relative p-6 sm:p-8 rounded-2xl border-2 border-dashed border-[#C5A880]/50 hover:border-[#C5A880] bg-[#FAF8F5]/80 dark:bg-[#1E1C1A]/60 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#FAF8F5] dark:hover:bg-[#1E1C1A] mb-5 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#C5A880]/20 flex items-center justify-center text-[#8C5D36] dark:text-[#E6CA9E] mb-2.5 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#1C1B1A] dark:text-white mb-1">
                Drag & Drop Photos and Videos here, or <span className="text-[#8C5D36] dark:text-[#E6CA9E] underline">Browse from Computer</span>
              </p>
              <p className="text-[11px] text-[#736C65] dark:text-[#A8A29D] max-w-md">
                Files upload directly to the workshop server disk (<code className="text-[#8C5D36] dark:text-[#E6CA9E]">public/workshops/</code>) and link specifically to this masterclass cohort.
              </p>

              {isUploading && (
                <div className="absolute inset-0 bg-white/90 dark:bg-black/90 rounded-2xl flex flex-col items-center justify-center p-4 z-20 animate-fade-in">
                  <Loader2 className="w-8 h-8 text-[#C5A880] animate-spin mb-2" />
                  <p className="text-xs font-bold text-[#1C1B1A] dark:text-white">{uploadProgress || 'Saving to public/workshops/...'}</p>
                </div>
              )}
            </div>

            {/* Collapsible Drawer: Files Already Inside public/workshops/ */}
            {showServerFilesDrawer && (
              <div className="mb-5 p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1A19] border border-[#E8DFD8] dark:border-[#2E2C29] animate-fade-in">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1B1A] dark:text-white">
                    <FolderOpen className="w-4 h-4 text-[#C5A880]" />
                    <span>Files physically in public/workshops/ ({serverFiles.length} found)</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadServerFiles}
                    className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/10 text-xs font-semibold cursor-pointer"
                    title="Refresh folder list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingServerFiles ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {isLoadingServerFiles ? (
                  <div className="py-6 text-center text-xs text-[#736C65]">Scanning public/workshops/...</div>
                ) : serverFiles.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#736C65]">No files found in public/workshops/. Upload files above!</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {serverFiles.map((sf, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-white dark:bg-[#242220] border border-[#E8DFD8] dark:border-white/10 flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {sf.type === 'video' ? <Video className="w-3.5 h-3.5 text-[#C5A880] shrink-0" /> : <Camera className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />}
                          <span className="text-[11px] font-semibold truncate" title={sf.filename}>{sf.filename}</span>
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-[#736C65]">
                          <span>{(sf.size / 1024).toFixed(0)} KB</span>
                          <button
                            type="button"
                            onClick={() => handleAttachServerFile(sf)}
                            className="px-2 py-0.5 rounded bg-[#C5A880]/20 hover:bg-[#C5A880]/30 text-[#8C5D36] dark:text-[#E6CA9E] font-bold cursor-pointer"
                          >
                            + Attach
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Currently Attached Media List for this Masterclass */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold text-[#1C1B1A] dark:text-white">
                  Attached Photos & Videos ({currentMasterclassMedia.length})
                </span>
                <span className="text-[11px] text-[#736C65]">
                  Drag/reorder or delete anytime
                </span>
              </div>

              {currentMasterclassMedia.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#FAF8F5] dark:bg-[#1E1C1A] border border-dashed border-[#E8DFD8] dark:border-white/10 text-center">
                  <Camera className="w-8 h-8 text-[#C5A880]/60 mx-auto mb-2" />
                  <h4 className="text-xs sm:text-sm font-bold text-[#1C1B1A] dark:text-white mb-1">
                    No photos or videos uploaded for this masterclass yet
                  </h4>
                  <p className="text-xs text-[#736C65] dark:text-[#A8A29D] max-w-sm mx-auto mb-3">
                    Upload your specific training photos and session videos above. They will be saved directly into <code className="text-[#8C5D36] dark:text-[#E6CA9E]">public/workshops/</code>.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload First File</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {currentMasterclassMedia.map((item, itemIdx) => {
                    const isVid = item.type === 'video';

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#1E1C1A] border border-[#E8DFD8] dark:border-white/10 flex flex-col justify-between group hover:border-[#C5A880]/60 transition-all shadow-2xs"
                      >
                        <div>
                          {/* Media Thumbnail Viewport */}
                          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black mb-2.5">
                            {isVid ? (
                              <video
                                src={item.url}
                                poster={item.thumbnailUrl}
                                className="w-full h-full object-cover"
                                controls={false}
                                muted
                              />
                            ) : (
                              <img
                                src={item.thumbnailUrl || item.url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            )}

                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-black/80 text-white flex items-center gap-1">
                              {isVid ? <Video className="w-3 h-3 text-[#E6CA9E]" /> : <Camera className="w-3 h-3 text-[#E6CA9E]" />}
                              <span>{isVid ? 'Video' : 'Photo'}</span>
                            </span>

                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/80 text-white/90">
                              #{itemIdx + 1}
                            </span>
                          </div>

                          {/* Editable Title */}
                          <div className="mb-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#736C65] dark:text-[#A8A29D] mb-0.5">
                              Moment Title
                            </label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const newTitle = e.target.value;
                                const updated = allMediaItems.map((m) => m.id === item.id ? { ...m, title: newTitle } : m);
                                if (onMediaUpdated) {
                                  onMediaUpdated(updated);
                                }
                                setInternalMedia(updated);
                                saveWorkshopMediaItem({ ...item, title: newTitle });
                              }}
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-[#141312] border border-[#E8DFD8] dark:border-white/10 text-xs font-semibold text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                            />
                          </div>

                          {/* Editable Craft Technique */}
                          <div className="mb-2">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#736C65] dark:text-[#A8A29D] mb-0.5">
                              Technique / Moment Detail
                            </label>
                            <input
                              type="text"
                              value={item.craftTechnique || ''}
                              placeholder="e.g. Knotting Spiral Weave"
                              onChange={(e) => {
                                const newTech = e.target.value;
                                const updated = allMediaItems.map((m) => m.id === item.id ? { ...m, craftTechnique: newTech } : m);
                                if (onMediaUpdated) {
                                  onMediaUpdated(updated);
                                }
                                setInternalMedia(updated);
                                saveWorkshopMediaItem({ ...item, craftTechnique: newTech });
                              }}
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-[#141312] border border-[#E8DFD8] dark:border-white/10 text-[11px] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
                            />
                          </div>
                        </div>

                        {/* Card Footer: Reorder & Delete */}
                        <div className="flex items-center justify-between gap-1 pt-2 border-t border-[#E8DFD8] dark:border-white/10 mt-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveMediaItem(itemIdx, 'up')}
                              disabled={itemIdx === 0}
                              className="p-1 rounded-md bg-white dark:bg-[#141312] hover:bg-neutral-200 text-[#5E5955] disabled:opacity-30 cursor-pointer"
                              title="Move Left / Earlier"
                            >
                              <ArrowUp className="w-3.5 h-3.5 rotate-[-90deg]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveMediaItem(itemIdx, 'down')}
                              disabled={itemIdx === currentMasterclassMedia.length - 1}
                              className="p-1 rounded-md bg-white dark:bg-[#141312] hover:bg-neutral-200 text-[#5E5955] disabled:opacity-30 cursor-pointer"
                              title="Move Right / Later"
                            >
                              <ArrowDown className="w-3.5 h-3.5 rotate-[-90deg]" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteMediaItem(item, false)}
                              className="px-2 py-1 rounded-lg bg-neutral-200 dark:bg-white/10 hover:bg-neutral-300 text-[11px] font-semibold text-[#5E5955] dark:text-[#C4BCB5] cursor-pointer"
                              title="Remove from this masterclass"
                            >
                              Remove
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete "${item.title}" permanently from disk (public/workshops/)?`)) {
                                  handleDeleteMediaItem(item, true);
                                }
                              }}
                              className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 cursor-pointer"
                              title="Delete file from disk"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E8DFD8] dark:border-[#262422] flex items-center justify-between gap-3 bg-white dark:bg-[#1A1918] shrink-0">
          <span className="text-xs text-[#736C65] dark:text-[#A8A29D]">
            All masterclasses, photos, and videos are saved permanently to server storage & public/workshops/
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 text-xs font-semibold text-[#5E5955] dark:text-[#C4BCB5] cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => handleSaveMasterclassDetails(false)}
              disabled={isSavingGroup}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#1C1B1A] dark:text-white border border-[#E8DFD8] dark:border-white/15 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              <span>Save Changes</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveMasterclassDetails(true)}
              disabled={isSavingGroup}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSavingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save & Done</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
