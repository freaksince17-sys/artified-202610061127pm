import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Video, 
  Camera, 
  Calendar, 
  MapPin, 
  Users, 
  Award, 
  Search, 
  MessageCircle, 
  Plus, 
  Layers,
  Wand2,
  FolderPlus,
  Repeat,
  Edit3
} from 'lucide-react';
import { WorkshopMediaItem, WorkshopGroup } from '../types';
import { 
  fetchWorkshopMedia, 
  DEFAULT_WORKSHOP_MEDIA, 
  getDeletedWorkshopMediaIds,
  buildWorkshopGroups,
  WORKSHOP_GROUPS_METADATA,
  getDeletedWorkshopGroupIds,
  getCustomWorkshopGroupsFromStorage,
  getCustomWorkshopMediaFromStorage,
  fetchWorkshopGroups,
  deleteWorkshopGroup,
  isMediaRelatedToGroup
} from '../data/workshops';
import { WorkshopThreeGroupStoryFeed } from './WorkshopThreeGroupStoryFeed';
import { WorkshopLightboxModal } from './WorkshopLightboxModal';
import { UnifiedMasterclassModal } from './UnifiedMasterclassModal';
import { ReplaceMediaModal } from './ReplaceMediaModal';
import { useCart } from '../context/CartContext';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export const WorkshopGallery: React.FC = () => {
  const { isSellerMode } = useCart();
  const [mediaItems, setMediaItems] = useState<WorkshopMediaItem[]>(() => {
    const deletedIds = getDeletedWorkshopMediaIds();
    const local = getCustomWorkshopMediaFromStorage().filter((m) => !deletedIds.includes(m.id) && isMediaRelatedToGroup(m, m.groupId));
    const defaults = DEFAULT_WORKSHOP_MEDIA.filter((m) => !deletedIds.includes(m.id) && isMediaRelatedToGroup(m, m.groupId));
    const map = new Map<string, WorkshopMediaItem>();
    defaults.forEach((d) => map.set(d.id, d));
    local.forEach((l) => map.set(l.id, l));
    return Array.from(map.values());
  });

  const [groupMetas, setGroupMetas] = useState<Omit<WorkshopGroup, 'items'>[]>(() => {
    const deletedIds = getDeletedWorkshopGroupIds();
    const local = getCustomWorkshopGroupsFromStorage().filter((g) => !deletedIds.includes(g.id) && !deletedIds.includes(g.groupKey));
    const defaults = WORKSHOP_GROUPS_METADATA.filter((g) => !deletedIds.includes(g.id) && !deletedIds.includes(g.groupKey));
    const map = new Map<string, Omit<WorkshopGroup, 'items'>>();
    defaults.forEach((d) => map.set(d.groupKey, d));
    local.forEach((l) => map.set(l.groupKey, l));
    return Array.from(map.values());
  });
  
  // Lightbox state
  const [lightboxItems, setLightboxItems] = useState<WorkshopMediaItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  // Modals state
  const [isMasterclassModalOpen, setIsMasterclassModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replaceTargetItem, setReplaceTargetItem] = useState<WorkshopMediaItem | null>(null);

  const [targetGroupKey, setTargetGroupKey] = useState<string | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState('');

  // Initial load
  useEffect(() => {
    fetchWorkshopMedia().then((items) => {
      if (items && items.length > 0) setMediaItems(items);
    });
    fetchWorkshopGroups().then((groups) => {
      if (groups && groups.length > 0) setGroupMetas(groups);
    });
  }, []);

  // 1. Real-time Firestore synchronization for media items
  useEffect(() => {
    const colRef = collection(db, 'workshop_gallery');

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const deletedIds = getDeletedWorkshopMediaIds();
        const local = getCustomWorkshopMediaFromStorage().filter((m) => !deletedIds.includes(m.id) && isMediaRelatedToGroup(m, m.groupId));
        const mergedMap = new Map<string, WorkshopMediaItem>();

        DEFAULT_WORKSHOP_MEDIA.filter((item) => !deletedIds.includes(item.id) && isMediaRelatedToGroup(item, item.groupId)).forEach((item) => {
          mergedMap.set(item.id, item);
        });

        local.forEach((item) => {
          mergedMap.set(item.id, item);
        });

        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            const itemId = docSnap.id;
            const d = docSnap.data() as WorkshopMediaItem;
            if (!deletedIds.includes(itemId) && isMediaRelatedToGroup({ ...d, id: itemId, type: d.type }, d.groupId) && (d.url || d.thumbnailUrl)) {
              mergedMap.set(itemId, { ...d, id: itemId });
            }
          });
        }

        setMediaItems(Array.from(mergedMap.values()));
      },
      (error) => {
        console.warn('Notice: workshop_gallery snapshot fallback:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore synchronization for custom workshop masterclass groups
  useEffect(() => {
    const groupsRef = collection(db, 'workshop_groups');

    const unsubscribe = onSnapshot(
      groupsRef,
      (snapshot) => {
        const deletedGroupIds = getDeletedWorkshopGroupIds();
        const local = getCustomWorkshopGroupsFromStorage().filter(
          (g) => !deletedGroupIds.includes(g.id) && !deletedGroupIds.includes(g.groupKey)
        );
        const mergedMap = new Map<string, Omit<WorkshopGroup, 'items'>>();

        WORKSHOP_GROUPS_METADATA.filter(
          (g) => !deletedGroupIds.includes(g.id) && !deletedGroupIds.includes(g.groupKey)
        ).forEach((g) => mergedMap.set(g.groupKey, g));

        local.forEach((g) => mergedMap.set(g.groupKey, g));

        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            const id = docSnap.id;
            const data = docSnap.data() as Omit<WorkshopGroup, 'items'>;
            if (!deletedGroupIds.includes(id) && !deletedGroupIds.includes(data.groupKey)) {
              mergedMap.set(data.groupKey, { ...data, id });
            }
          });
        }

        setGroupMetas(Array.from(mergedMap.values()));
      },
      (error) => {
        console.warn('Notice: workshop_groups snapshot listener fallback:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter items by search query if any
  const filteredMediaItems = useMemo(() => {
    if (!searchQuery.trim()) return mediaItems;
    const q = searchQuery.toLowerCase().trim();
    return mediaItems.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.caption.toLowerCase().includes(q) ||
        m.craftTechnique.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [mediaItems, searchQuery]);

  // Construct workshop groups based on current group metadata
  const workshopGroups = useMemo(() => {
    return buildWorkshopGroups(filteredMediaItems, groupMetas);
  }, [filteredMediaItems, groupMetas]);

  const handleOpenLightbox = (groupItems: WorkshopMediaItem[], initialIndex: number) => {
    setLightboxItems(groupItems);
    setLightboxIndex(initialIndex);
  };

  const handleOpenMasterclassEditor = (groupKey?: string) => {
    setTargetGroupKey(groupKey);
    setIsMasterclassModalOpen(true);
  };

  const handleEditItem = (item: WorkshopMediaItem) => {
    setTargetGroupKey(item.groupId);
    setIsMasterclassModalOpen(true);
  };

  const handleReplaceItem = (item: WorkshopMediaItem) => {
    setReplaceTargetItem(item);
    setIsReplaceModalOpen(true);
  };

  const handleDeleteItem = (deletedItem: WorkshopMediaItem) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== deletedItem.id));
  };

  const handleBatchDelete = (deletedIds: string[]) => {
    setMediaItems((prev) => prev.filter((item) => !deletedIds.includes(item.id)));
  };

  const handleEditGroup = (group: WorkshopGroup) => {
    setTargetGroupKey(group.groupKey || group.id);
    setIsMasterclassModalOpen(true);
  };

  const handleDeleteGroup = async (group: WorkshopGroup) => {
    try {
      const gId = group.id;
      const gKey = group.groupKey;
      await deleteWorkshopGroup(gId, gKey);
      setGroupMetas((prev) => prev.filter((g) => g.id !== gId && g.groupKey !== gKey && g.id !== gKey && g.groupKey !== gId));
      setMediaItems((prev) => prev.filter((m) => m.groupId !== gKey && m.groupId !== gId));
    } catch (err) {
      console.error('Error deleting workshop masterclass:', err);
    }
  };

  const handleItemReplaced = (updatedItem: WorkshopMediaItem) => {
    setMediaItems((prev) => prev.map((m) => (m.id === updatedItem.id ? updatedItem : m)));
  };

  const openWhatsAppRegister = () => {
    const phone = '9779767573721';
    const text = encodeURIComponent(
      'Namaste Sahina Shrestha! ✨ I am browsing the Workshop Masterclasses on your website and would like to register for the upcoming batch in Kathmandu.'
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="w-full min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0E] text-[#1C1B1A] dark:text-[#F5F2EB] py-3 sm:py-5 px-3 sm:px-5 lg:px-7 max-w-[1360px] mx-auto animate-fade-in">
      
      {/* Compact Top Header Card */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-[#1C1B1A] via-[#24211F] to-[#141312] text-white p-4 sm:p-6 mb-4 sm:mb-5 shadow-lg border border-[#C5A880]/25">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
          
          {/* Left Column: Headline & CTA */}
          <div className="md:col-span-7 flex flex-col justify-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#C5A880]/20 text-[#E6CA9E] border border-[#C5A880]/30 mb-2 w-fit">
              <Sparkles className="w-3 h-3 text-[#C5A880]" />
              <span>Kathmandu, Nepal</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight mb-1.5">
              Workshops & Training Masterclasses
            </h1>

            <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-xl mb-3.5 font-normal">
              Explore hands-on masterclass series taught by founder & master artisan{' '}
              <strong className="text-[#E6CA9E] font-semibold">Sahina Shrestha</strong>:
              Macrame knotting, waste pipe to sunflower eco-crafting, bridal pearl bag weaving, and new atelier cohorts.
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={openWhatsAppRegister}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold uppercase tracking-wider transition-all transform active:scale-98 cursor-pointer shadow-md shadow-[#25D366]/20"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                <span>Inquire Next Batch</span>
              </button>

              {isSellerMode && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenMasterclassEditor(undefined)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Manage Masterclasses & Media</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenMasterclassEditor('new-cohort')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>+ New Masterclass</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Compact Sahina Shrestha Nameplate */}
          <div className="md:col-span-5 flex justify-center md:justify-end">
            <div className="w-full max-w-sm bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-[#C5A880]/30 shadow-md">
              <div className="flex items-center gap-3 mb-2">
                <img 
                  src="/artisan_avatar.jpg" 
                  alt="Sahina Shrestha" 
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-[#D4AF37] shadow-md shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-white tracking-wide truncate">
                    Sahina Shrestha
                  </h3>
                  <p className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider">
                    Lead Mentor & Master Artisan
                  </p>
                  <span className="text-[10px] text-white/70 block">
                    Founder, Artified Nepal • Kathmandu Workshop
                  </span>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-white/85 italic leading-snug font-serif pt-1.5 border-t border-white/10">
                "Turning raw cotton threads, upcycled pipes, and pearls into lasting wearable art and community empowerment."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Action Banner when Seller Mode is ON */}
      {isSellerMode && (
        <div className="bg-gradient-to-r from-[#C5A880]/15 via-[#8C5D36]/10 to-[#C5A880]/15 border border-[#C5A880]/40 rounded-xl p-3 sm:p-3.5 mb-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#C5A880] text-[#1C1B1A]">
              <Wand2 className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-[#1C1B1A] dark:text-white">
                Seller Workshop Studio & Batch Manager
              </h4>
              <p className="text-[10px] text-[#736C65] dark:text-[#9E9790]">
                Selectively delete, replace, or re-verify photos & videos in bulk with automatic cloud & IndexedDB persistence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenMasterclassEditor(undefined)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Edit Masterclasses & Media</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMasterclassEditor('new-cohort')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C5A880] text-[#1C1B1A] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ New Masterclass</span>
            </button>
          </div>
        </div>
      )}

      {/* Compact Search and Overview Pill Bar */}
      <div className="bg-white dark:bg-[#171615] p-2.5 sm:p-3 rounded-xl border border-[#E8DFD8] dark:border-[#262422] shadow-2xs mb-4 sm:mb-5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        
        {/* Search input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#7A746E] dark:text-[#A8A29D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search masterclasses, techniques, or video moments..."
            className="w-full pl-9 pr-4 py-1.5 bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-white/10 rounded-xl text-xs text-[#1C1B1A] dark:text-white placeholder:text-[#7A746E] dark:placeholder:text-[#A8A29D] focus:outline-none focus:border-[#C5A880]"
          />
        </div>

        {/* Overview Stats Badges */}
        <div className="flex items-center gap-1.5 text-xs text-[#7A746E] dark:text-[#A8A29D] flex-wrap justify-end">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 font-semibold text-[#1C1B1A] dark:text-white">
            <Layers className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>{workshopGroups.length} Cohorts</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5">
            <Video className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>{mediaItems.filter(i => i.type === 'video').length} Videos</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5">
            <Camera className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>{mediaItems.filter(i => i.type === 'image').length} Photos</span>
          </span>
        </div>
      </div>

      {/* Main 3-Group Workshop Storytelling Feed */}
      <WorkshopThreeGroupStoryFeed
        groups={workshopGroups}
        onOpenLightbox={handleOpenLightbox}
        onOpenUploadModal={handleOpenMasterclassEditor}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onReplaceItem={handleReplaceItem}
        onBatchDelete={handleBatchDelete}
        onEditGroup={handleEditGroup}
        onDeleteGroup={handleDeleteGroup}
      />

      {/* Fullscreen HD Lightbox Modal */}
      <WorkshopLightboxModal
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        items={lightboxItems}
        initialIndex={lightboxIndex || 0}
      />

      {/* Unified Masterclass & Media Management Modal (Both Edit in One Place) */}
      <UnifiedMasterclassModal
        isOpen={isMasterclassModalOpen}
        onClose={() => {
          setIsMasterclassModalOpen(false);
          setTargetGroupKey(undefined);
        }}
        availableGroups={workshopGroups}
        allMediaItems={mediaItems}
        defaultGroupId={targetGroupKey}
        onGroupSaved={(savedGroup) => {
          setGroupMetas((prev) => {
            const exists = prev.some((g) => g.id === savedGroup.id || g.groupKey === savedGroup.groupKey);
            if (exists) {
              return prev.map((g) => (g.id === savedGroup.id || g.groupKey === savedGroup.groupKey ? savedGroup : g));
            }
            return [...prev, savedGroup];
          });
        }}
        onGroupDeleted={(deletedId, groupKey) => {
          const allDeleted = [deletedId, groupKey].filter(Boolean) as string[];
          setGroupMetas((prev) => prev.filter((g) => !allDeleted.includes(g.id) && !allDeleted.includes(g.groupKey)));
          setMediaItems((prev) => prev.filter((m) => !allDeleted.includes(m.groupId || '')));
        }}
        onMediaUpdated={(updated) => {
          setMediaItems(updated);
        }}
      />

      {/* Replace Media Modal for Selective Swapping */}
      <ReplaceMediaModal
        isOpen={isReplaceModalOpen}
        onClose={() => {
          setIsReplaceModalOpen(false);
          setReplaceTargetItem(null);
        }}
        targetItem={replaceTargetItem}
        onItemReplaced={handleItemReplaced}
      />
    </div>
  );
};
