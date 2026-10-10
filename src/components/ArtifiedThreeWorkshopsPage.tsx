import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Camera, 
  Video, 
  Upload, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  MessageCircle, 
  Calendar, 
  MapPin, 
  Award, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Lock,
  Plus,
  Loader2,
  Eye,
  Maximize2,
  Tv,
  FolderOpen,
  ArrowRight,
  Info,
  Layers,
  Wand2,
  ChevronRight,
  CheckSquare,
  Square
} from 'lucide-react';
import { WorkshopMediaItem } from '../types';
import { db, storage } from '../firebase';
import { 
  collection, 
  doc, 
  deleteDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { autoGenerateMediaCaption } from '../utils/workshopAIGenerator';
import { compressImageToBlob } from '../utils/fastMediaUploader';
import { useCart } from '../context/CartContext';
import { ArtifiedLogo } from './ArtifiedLogo';
import { WorkshopLightboxModal } from './WorkshopLightboxModal';

export interface WorkshopClassDef {
  id: string;
  key: string;
  title: string;
  badge: string;
  tagline: string;
  schedule: string;
  location: string;
  instructor: string;
  capacity: number;
  description: string;
  whatsappMessage: string;
  techniques: string[];
}

export const CANONICAL_WORKSHOPS: WorkshopClassDef[] = [
  {
    id: 'ws-macrame',
    key: 'macrame',
    title: 'Macrame Wall Art & Planters Workshop',
    badge: 'UPCOMING WORKSHOP BATCH',
    tagline: 'Cotton Cord Tensioning • Planters & Wall Hangings',
    schedule: 'Every Saturday • 11:00 AM - 2:00 PM',
    location: 'Kathmandu Studio, Nepal',
    instructor: 'Sahina Shrestha',
    capacity: 15,
    description: 'Master the art of raw cotton cord knotting, symmetrical tension, wooden hoop mounting, and botanical planter framing in our Kathmandu atelier under Sahina Shrestha\'s guided mentorship.',
    whatsappMessage: 'Namaste Sahina! I would like to reserve a seat for the Macrame Wall Art & Planters Workshop in Kathmandu.',
    techniques: [
      'Square Knots & Continuous Spiral Weaves',
      'Lark\'s Head Dowel & Ring Mounting',
      'Botanical Planter Netting & Tassel Finishing'
    ]
  },
  {
    id: 'ws-sunflower',
    key: 'sunflower',
    title: 'Waste Pipe to Sunflower Eco-Art Workshop',
    badge: 'UPCOMING WORKSHOP BATCH',
    tagline: 'Upcycled Conduit Pipes • Petal Sculpting & Ring Bases',
    schedule: 'Bi-Weekly Sundays • 1:00 PM - 4:00 PM',
    location: 'Kathmandu Studio, Nepal',
    instructor: 'Sahina Shrestha',
    capacity: 12,
    description: 'Transform discarded industrial conduit pipes into breathtaking botanical sunflower sculptures using precision heat-molding, petal fabric creasing, and eco-patina layering.',
    whatsappMessage: 'Namaste Sahina! I would like to reserve a seat for the Waste Pipe to Sunflower Eco-Art Workshop in Kathmandu.',
    techniques: [
      'Conduit Pipe Sectioning & Radial Heating',
      'Fabric Petal Creasing & Symmetrical Layering',
      'Central Seed Core Texturing & Eco-Sealing'
    ]
  },
  {
    id: 'ws-pearl-bag',
    key: 'pearl-bag',
    title: 'Bridal Pearl Bag & Bead Weaving Workshop',
    badge: 'UPCOMING WORKSHOP BATCH',
    tagline: '3D Pearl Lattice Weaving • Structured Clutch Framing',
    schedule: 'Alternate Fridays • 2:00 PM - 5:30 PM',
    location: 'Kathmandu Studio, Nepal',
    instructor: 'Sahina Shrestha',
    capacity: 10,
    description: 'Learn intricate 3D pearl lattice beading, structured bridal clutch framing, ergonomic artisan handle assembly, and satin interior finishing in our hands-on couture masterclass.',
    whatsappMessage: 'Namaste Sahina! I would like to reserve a seat for the Bridal Pearl Bag & Bead Weaving Workshop in Kathmandu.',
    techniques: [
      '4-Bead Cross-Weave High-Tension Grid',
      'Reinforced Monofilament Internal Locking',
      'Bridal Handle Arch Geometry & Satin Lining'
    ]
  }
];

// Persistent keys
const CLASSES_STORAGE_KEY = 'artified_workshop_classes_list_v33';
const LOCAL_MEDIA_KEY = 'artified_three_workshops_media_v33';
const TOMBSTONE_DELETED_KEY = 'artified_deleted_media_ids_v33';

function getTombstones(): string[] {
  try {
    const raw = localStorage.getItem(TOMBSTONE_DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addTombstone(id: string) {
  try {
    const set = new Set(getTombstones());
    set.add(id);
    localStorage.setItem(TOMBSTONE_DELETED_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn(e);
  }
}

function getStoredLocalMedia(): WorkshopMediaItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_MEDIA_KEY);
    const parsed: WorkshopMediaItem[] = raw ? JSON.parse(raw) : [];
    const tombstones = new Set(getTombstones());
    return parsed.filter(item => item && item.id && !tombstones.has(item.id));
  } catch {
    return [];
  }
}

function saveStoredLocalMedia(items: WorkshopMediaItem[]) {
  try {
    const tombstones = new Set(getTombstones());
    const clean = items.filter(item => item && item.id && !tombstones.has(item.id));
    localStorage.setItem(LOCAL_MEDIA_KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn(e);
  }
}

function getStoredClasses(): WorkshopClassDef[] {
  try {
    const raw = localStorage.getItem(CLASSES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return CANONICAL_WORKSHOPS;
}

function saveStoredClasses(classes: WorkshopClassDef[]) {
  try {
    localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(classes));
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Standard HTML5 Hover-to-Play Video Component with explicit attributes & event listeners
 */
const HoverVideoCard: React.FC<{
  video: WorkshopMediaItem;
  isSeller: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (item: WorkshopMediaItem) => void;
  onGenerateAI?: (item: WorkshopMediaItem) => void;
  isAiGenerating?: boolean;
  onOpenTheater?: (video: WorkshopMediaItem) => void;
}> = ({ video, isSeller, onDelete, onEdit, onGenerateAI, isAiGenerating, onOpenTheater }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isAudioMuted;
      videoRef.current.muted = nextMuted;
      setIsAudioMuted(nextMuted);
    }
  };

  return (
    <div 
      className="group relative flex flex-col bg-[#1A1918] rounded-2xl border border-[#2D2A26] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300"
    >
      <div 
        className="relative w-full aspect-square bg-black overflow-hidden cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onOpenTheater && onOpenTheater(video)}
      >
        <video
          ref={videoRef}
          src={video.url}
          poster={video.thumbnailUrl && video.thumbnailUrl !== video.url ? video.thumbnailUrl : undefined}
          muted={isAudioMuted}
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Hover Status Indicator Badge */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 pointer-events-none">
          {isPlaying ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#25D366] text-white shadow-md animate-pulse">
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>Playing Preview</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-black/70 backdrop-blur-md text-white/90 border border-white/10">
              <Video className="w-2.5 h-2.5 text-[#C5A880]" />
              <span>Hover to Play</span>
            </span>
          )}
        </div>

        {/* Hover Audio Controls */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={toggleSound}
            title={isAudioMuted ? "Unmute Audio" : "Mute Audio"}
            className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md transition-colors cursor-pointer"
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#C5A880]" />}
          </button>
        </div>

        {/* Watermark Play Icon */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 flex flex-col flex-grow justify-between bg-[#1A1918]">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-serif font-bold text-sm text-[#F5F2EB] line-clamp-1">
              {video.title || 'Artisan Technique Reel'}
            </h4>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#C5A880]/15 text-[#E6CA9E] shrink-0">
              {video.craftTechnique || 'Masterclass'}
            </span>
          </div>

          <p className="text-xs text-[#A8A29D] line-clamp-2 leading-relaxed mb-3">
            {video.caption || video.description || 'Hands-on artisan training session in Kathmandu atelier.'}
          </p>
        </div>

        {isSeller && (
          <div className="flex items-center justify-between pt-2.5 border-t border-[#2D2A26] gap-2">
            {onGenerateAI && (
              <button
                type="button"
                onClick={() => onGenerateAI(video)}
                disabled={isAiGenerating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#C5A880]/15 hover:bg-[#C5A880]/25 text-[#E6CA9E] border border-[#C5A880]/30 transition-all cursor-pointer"
              >
                <Sparkles className={`w-3 h-3 text-[#C5A880] ${isAiGenerating ? 'animate-spin' : ''}`} />
                <span>{isAiGenerating ? 'Generating...' : 'Generate with AI'}</span>
              </button>
            )}

            <div className="flex items-center gap-1 ml-auto">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(video)}
                  title="Edit title & description"
                  className="p-1.5 rounded-lg text-[#A8A29D] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(video.id)}
                  title="Permanently delete video"
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Standard Photo Card Component
 */
const PhotoGridCard: React.FC<{
  photo: WorkshopMediaItem;
  isSeller: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (item: WorkshopMediaItem) => void;
  onGenerateAI?: (item: WorkshopMediaItem) => void;
  isAiGenerating?: boolean;
  onOpenPhoto?: (photo: WorkshopMediaItem) => void;
}> = ({ photo, isSeller, onDelete, onEdit, onGenerateAI, isAiGenerating, onOpenPhoto }) => {
  return (
    <div className="group relative flex flex-col bg-[#1A1918] rounded-2xl border border-[#2D2A26] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300">
      <div 
        className="relative w-full aspect-square bg-black/40 overflow-hidden cursor-pointer"
        onClick={() => onOpenPhoto && onOpenPhoto(photo)}
      >
        <img
          src={photo.url}
          alt={photo.title || 'Artified Workshop Photo'}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-104"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-black/70 text-white backdrop-blur-md">
            <Camera className="w-2.5 h-2.5 text-[#C5A880]" />
            <span>Photo</span>
          </span>
        </div>
      </div>

      <div className="p-3.5 flex flex-col flex-grow justify-between bg-[#1A1918]">
        <div>
          <h4 className="font-serif font-bold text-sm text-[#F5F2EB] line-clamp-1 mb-1">
            {photo.title || 'Artisan Workshop Photo'}
          </h4>

          <p className="text-xs text-[#A8A29D] line-clamp-2 leading-relaxed mb-3">
            {photo.caption || photo.description || 'Hands-on artisan crafting moment captured in Kathmandu.'}
          </p>
        </div>

        {isSeller && (
          <div className="flex items-center justify-between pt-2.5 border-t border-[#2D2A26] gap-2">
            {onGenerateAI && (
              <button
                type="button"
                onClick={() => onGenerateAI(photo)}
                disabled={isAiGenerating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#C5A880]/15 hover:bg-[#C5A880]/25 text-[#E6CA9E] border border-[#C5A880]/30 transition-all cursor-pointer"
              >
                <Sparkles className={`w-3 h-3 text-[#C5A880] ${isAiGenerating ? 'animate-spin' : ''}`} />
                <span>{isAiGenerating ? 'Generating...' : 'Generate with AI'}</span>
              </button>
            )}

            <div className="flex items-center gap-1 ml-auto">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(photo)}
                  title="Edit title & description"
                  className="p-1.5 rounded-lg text-[#A8A29D] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(photo.id)}
                  title="Permanently delete photo"
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const ArtifiedThreeWorkshopsPage: React.FC = () => {
  const { isSellerMode } = useCart();
  
  // Workshop classes (macrame, sunflower, pearl-bag)
  const [classesList, setClassesList] = useState<WorkshopClassDef[]>(() => getStoredClasses());
  const [mediaList, setMediaList] = useState<WorkshopMediaItem[]>([]);

  // UNIFIED EDIT FLOW (IMAGE 1 STYLE MODAL)
  const [editingWorkshop, setEditingWorkshop] = useState<WorkshopClassDef | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalSchedule, setModalSchedule] = useState('');
  const [modalLocation, setModalLocation] = useState('');
  const [modalInstructor, setModalInstructor] = useState('');
  const [modalCapacity, setModalCapacity] = useState(15);
  const [modalWhatsapp, setModalWhatsapp] = useState('');

  // Dropzone drag states for fast multi-file batch uploads
  const [isPhotoDragOver, setIsPhotoDragOver] = useState(false);
  const [isVideoDragOver, setIsVideoDragOver] = useState(false);
  const [isUnifiedDragOver, setIsUnifiedDragOver] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchUploadProgress, setBatchUploadProgress] = useState<string | null>(null);
  const [batchProgressPct, setBatchProgressPct] = useState<number>(0);

  // Single Item Editing inside Unified Modal
  const [editingMediaItem, setEditingMediaItem] = useState<WorkshopMediaItem | null>(null);
  const [itemEditTitle, setItemEditTitle] = useState('');
  const [itemEditDescription, setItemEditDescription] = useState('');

  // AI generating tracker
  const [aiGeneratingId, setAiGeneratingId] = useState<string | null>(null);

  // Toast feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Theater / Fullscreen Modal
  const [theaterMedia, setTheaterMedia] = useState<WorkshopMediaItem[]>([]);
  const [theaterIndex, setTheaterIndex] = useState<number | null>(null);

  // Unified File Picker Ref
  const unifiedMediaInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Initial Load & Firestore Realtime Sync
  useEffect(() => {
    const local = getStoredLocalMedia();
    setMediaList(local);

    const colRef = collection(db, 'workshop_gallery');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const tombstones = new Set(getTombstones());
      const cloudMap = new Map<string, WorkshopMediaItem>();

      local.forEach(item => {
        if (!tombstones.has(item.id)) cloudMap.set(item.id, item);
      });

      snapshot.forEach(docSnap => {
        const id = docSnap.id;
        if (!tombstones.has(id)) {
          const data = docSnap.data() as WorkshopMediaItem;
          cloudMap.set(id, { ...data, id });
        }
      });

      const updated = Array.from(cloudMap.values());
      setMediaList(updated);
      saveStoredLocalMedia(updated);
    }, (err) => {
      console.warn('Firestore snapshot notice, persisting offline cache:', err);
    });

    return () => unsubscribe();
  }, []);

  // Helper to get media for a specific workshop
  const getWorkshopMedia = (classKey: string) => {
    const tombstones = new Set(getTombstones());
    return mediaList.filter(item => {
      if (tombstones.has(item.id)) return false;
      const g = (item.groupId || '').toLowerCase().replace(/^ws-/, '').replace(/^ws-group-/, '');
      const key = classKey.toLowerCase();
      return g === key || g.includes(key) || key.includes(g);
    });
  };

  // Convert File to Persistent Base64 Data URL (guarantees media never breaks or uses temporary blob:)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // High-speed file uploader: First tries direct binary streaming route (/api/workshop-upload-binary), 
  // falls back to Firebase Storage with quick timeout, and finally persistent Base64
  const uploadSingleFileWithProgress = async (
    file: File | Blob, 
    fileName: string, 
    isVideo: boolean, 
    groupKey: string,
    onProgress: (pct: number) => void
  ): Promise<{ url: string; thumbnailUrl: string }> => {
    const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    
    // Map class key to proper folder
    let targetFolder = 'Macrame';
    const normKey = groupKey.toLowerCase();
    if (normKey.includes('sunflower') || normKey.includes('pipe')) {
      targetFolder = 'Pipecleaner Sunflower';
    } else if (normKey.includes('pearl')) {
      targetFolder = 'Pearls';
    }

    // 1. FAST TRACK: Try direct local server streaming route (instant speed, local disk write)
    try {
      onProgress(25);
      const serverRes = await fetch(
        `/api/workshop-upload-binary?folder=${encodeURIComponent(targetFolder)}&filename=${encodeURIComponent(cleanName)}&groupId=${encodeURIComponent(groupKey)}&type=${isVideo ? 'video' : 'image'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
            'x-filename': cleanName,
            'x-folder': targetFolder,
            'x-group-id': groupKey,
            'x-type': isVideo ? 'video' : 'image'
          },
          body: file
        }
      );

      if (serverRes.ok) {
        const data = await serverRes.json();
        onProgress(100);
        if (data && data.url) {
          return {
            url: data.url,
            thumbnailUrl: data.thumbnailUrl || data.url
          };
        }
      }
    } catch (serverErr) {
      console.warn('Fast server upload notice, attempting Firebase Storage fallback:', serverErr);
    }

    // 2. FALLBACK: Firebase Storage with 12-second timeout
    return new Promise(async (resolve) => {
      let isSettled = false;
      const fallbackToBase64 = async () => {
        if (isSettled) return;
        isSettled = true;
        onProgress(90);
        const b64 = await fileToBase64(file as File);
        onProgress(100);
        resolve({ url: b64, thumbnailUrl: b64 });
      };

      // 12s safety timer so it never hangs or freezes
      const timer = setTimeout(fallbackToBase64, 12000);

      try {
        const storagePath = `workshop_gallery/${Date.now()}_${cleanName}`;
        const storageRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg')
        });

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              onProgress(Math.min(99, progress));
            }
          },
          async () => {
            clearTimeout(timer);
            await fallbackToBase64();
          },
          async () => {
            clearTimeout(timer);
            if (isSettled) return;
            isSettled = true;
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              onProgress(100);
              resolve({ url: downloadUrl, thumbnailUrl: downloadUrl });
            } catch {
              await fallbackToBase64();
            }
          }
        );
      } catch {
        clearTimeout(timer);
        await fallbackToBase64();
      }
    });
  };

  // FAST MULTI-FILE BATCH UPLOAD WITH AUTOMATIC CLASSIFICATION & HIGH-SPEED STREAMING
  const handleBatchUpload = async (files: FileList | File[] | null, specificType?: 'image' | 'video') => {
    if (!files || !editingWorkshop) return;
    const rawFiles = Array.from(files);
    if (rawFiles.length === 0) return;

    // Filter valid image and video files
    const fileArray = rawFiles.filter(f => {
      const isVid = f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(f.name);
      const isImg = f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f.name);
      if (specificType === 'video') return isVid;
      if (specificType === 'image') return isImg;
      return isVid || isImg;
    });

    if (fileArray.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Please select valid photo (JPG, PNG, WebP) or video (MP4, WebM) files.'
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    setIsBatchUploading(true);
    const total = fileArray.length;
    setBatchUploadProgress(`Preparing ${total} media file(s) for fast upload...`);
    setBatchProgressPct(5);

    try {
      const uploadedItems: WorkshopMediaItem[] = [];

      // Process files concurrently in chunks of 4 for maximum speed
      const CONCURRENCY = 4;
      for (let i = 0; i < total; i += CONCURRENCY) {
        const batch = fileArray.slice(i, i + CONCURRENCY);

        const batchPromises = batch.map(async (file, idx) => {
          const globalIdx = i + idx;
          const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);
          const mediaLabel = isVideo ? 'video' : 'photo';

          setBatchUploadProgress(`Uploading ${globalIdx + 1}/${total}: "${file.name}" (${mediaLabel})...`);

          let persistentUrl = '';
          let persistentThumbUrl = '';

          if (!isVideo) {
            // Ultra-fast client-side compression: max 1280px / 0.78 quality (~80KB - 160KB)
            try {
              const comp = await compressImageToBlob(file, 1280, 960, 0.78);
              const compressedBlob = comp.blob;
              
              const res = await uploadSingleFileWithProgress(
                compressedBlob,
                file.name.replace(/\.[^/.]+$/, '.jpg'),
                false,
                editingWorkshop.key,
                (filePct) => {
                  const overall = Math.round(((globalIdx * 100) + filePct) / total);
                  setBatchProgressPct(Math.min(99, Math.max(5, overall)));
                  setBatchUploadProgress(`Uploading ${globalIdx + 1}/${total}: ${file.name}... ${filePct}%`);
                }
              );
              persistentUrl = res.url;
              persistentThumbUrl = res.thumbnailUrl || res.url;
            } catch (compErr) {
              const res = await uploadSingleFileWithProgress(
                file,
                file.name,
                false,
                editingWorkshop.key,
                (filePct) => {
                  const overall = Math.round(((globalIdx * 100) + filePct) / total);
                  setBatchProgressPct(Math.min(99, Math.max(5, overall)));
                }
              );
              persistentUrl = res.url;
              persistentThumbUrl = res.thumbnailUrl || res.url;
            }
          } else {
            // Video streaming directly to binary route
            const res = await uploadSingleFileWithProgress(
              file,
              file.name,
              true,
              editingWorkshop.key,
              (filePct) => {
                const overall = Math.round(((globalIdx * 100) + filePct) / total);
                setBatchProgressPct(Math.min(99, Math.max(5, overall)));
                setBatchUploadProgress(`Uploading ${globalIdx + 1}/${total}: ${file.name}... ${filePct}%`);
              }
            );
            persistentUrl = res.url;
            persistentThumbUrl = res.thumbnailUrl || res.url;
          }

          const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          const aiInitial = autoGenerateMediaCaption(file.name, editingWorkshop.title);

          const newItemId = `ws_${editingWorkshop.key}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newItem: WorkshopMediaItem = {
            id: newItemId,
            groupId: editingWorkshop.key,
            workshopTitle: editingWorkshop.title,
            type: isVideo ? 'video' : 'image',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            url: persistentUrl,
            thumbnailUrl: persistentThumbUrl || persistentUrl,
            title: aiInitial.title || `${cleanBaseName} - ${editingWorkshop.title}`,
            caption: aiInitial.caption || `Artisan training in Kathmandu for ${editingWorkshop.title}.`,
            description: aiInitial.caption || `Artisan training in Kathmandu for ${editingWorkshop.title}.`,
            craftTechnique: aiInitial.craftTechnique || editingWorkshop.techniques[0] || 'Handcrafted Technique',
            location: editingWorkshop.location,
            instructor: editingWorkshop.instructor,
            tags: [editingWorkshop.title, editingWorkshop.badge, cleanBaseName, isVideo ? 'Workshop Video' : 'Workshop Photo'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Save to Firestore
          try {
            await setDoc(doc(db, 'workshop_gallery', newItem.id), newItem);
          } catch (fsErr) {
            console.warn('Firestore write warning:', fsErr);
          }

          return newItem;
        });

        const batchResults = await Promise.all(batchPromises);
        uploadedItems.push(...batchResults);
      }

      setBatchProgressPct(100);
      setBatchUploadProgress(`Complete! Successfully processed ${uploadedItems.length} file(s).`);

      if (uploadedItems.length > 0) {
        setMediaList(prev => {
          const combined = [...uploadedItems, ...prev];
          saveStoredLocalMedia(combined);
          return combined;
        });

        const photoCount = uploadedItems.filter(i => i.type === 'image').length;
        const videoCount = uploadedItems.filter(i => i.type === 'video').length;

        setFeedback({
          type: 'success',
          message: `✨ Successfully uploaded & sorted ${uploadedItems.length} media items (${photoCount} photos, ${videoCount} videos) to "${editingWorkshop.title}"!`
        });
      }
    } catch (err: any) {
      console.error('Batch upload error:', err);
      setFeedback({
        type: 'error',
        message: err?.message || 'Upload failed. Please check files and network.'
      });
    } finally {
      setTimeout(() => {
        setIsBatchUploading(false);
        setBatchUploadProgress(null);
        setBatchProgressPct(0);
      }, 1000);

      setTimeout(() => setFeedback(null), 5000);
      if (unifiedMediaInputRef.current) unifiedMediaInputRef.current.value = '';
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // Open Unified Workshop Edit Modal (Image 1 Style)
  const handleOpenEditWorkshop = (cls: WorkshopClassDef) => {
    setEditingWorkshop(cls);
    setModalTitle(cls.title);
    setModalSubtitle(cls.tagline);
    setModalDescription(cls.description);
    setModalSchedule(cls.schedule);
    setModalLocation(cls.location);
    setModalInstructor(cls.instructor);
    setModalCapacity(cls.capacity);
    setModalWhatsapp(cls.whatsappMessage);
  };

  // Save Text Content Changes in Unified Modal
  const handleSaveWorkshopText = () => {
    if (!editingWorkshop) return;

    const updatedCls: WorkshopClassDef = {
      ...editingWorkshop,
      title: modalTitle.trim() || editingWorkshop.title,
      tagline: modalSubtitle.trim() || editingWorkshop.tagline,
      description: modalDescription.trim() || editingWorkshop.description,
      schedule: modalSchedule.trim() || editingWorkshop.schedule,
      location: modalLocation.trim() || editingWorkshop.location,
      instructor: modalInstructor.trim() || editingWorkshop.instructor,
      capacity: Number(modalCapacity) || editingWorkshop.capacity,
      whatsappMessage: modalWhatsapp.trim() || editingWorkshop.whatsappMessage
    };

    const nextClasses = classesList.map(c => c.key === editingWorkshop.key ? updatedCls : c);
    setClassesList(nextClasses);
    saveStoredClasses(nextClasses);
    setEditingWorkshop(updatedCls);

    setFeedback({
      type: 'success',
      message: `Saved details for "${updatedCls.title}".`
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Delete Individual Media Item (Seller only)
  const handleDeleteMedia = async (id: string) => {
    if (!isSellerMode) return;
    addTombstone(id);

    setMediaList(prev => {
      const remaining = prev.filter(m => m.id !== id);
      saveStoredLocalMedia(remaining);
      return remaining;
    });

    try {
      await deleteDoc(doc(db, 'workshop_gallery', id));
    } catch (fsErr) {
      console.warn('Firestore doc delete notice:', fsErr);
    }

    setFeedback({
      type: 'success',
      message: 'Media item permanently deleted.'
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // AI Title & Description Generation
  const handleGenerateAI = async (item: WorkshopMediaItem) => {
    if (!isSellerMode) return;
    setAiGeneratingId(item.id);

    try {
      let generatedTitle = '';
      let generatedCaption = '';

      try {
        const response = await fetch('/api/gemini/generate-caption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: item.title || item.id,
            masterclassTitle: item.workshopTitle || 'Artified Kathmandu Workshop',
            type: item.type
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success && resJson.data) {
            generatedTitle = resJson.data.title;
            generatedCaption = resJson.data.caption;
          }
        }
      } catch (apiErr) {
        console.warn('Backend AI route notice, fallback to artisan heuristics:', apiErr);
      }

      if (!generatedTitle || !generatedCaption) {
        const fallback = autoGenerateMediaCaption(item.title || item.id, item.workshopTitle || 'Artified Workshop');
        generatedTitle = fallback.title;
        generatedCaption = fallback.caption;
      }

      const updatedItem: WorkshopMediaItem = {
        ...item,
        title: generatedTitle,
        caption: generatedCaption,
        description: generatedCaption,
        updatedAt: new Date().toISOString()
      };

      setMediaList(prev => {
        const updatedList = prev.map(m => m.id === item.id ? updatedItem : m);
        saveStoredLocalMedia(updatedList);
        return updatedList;
      });

      try {
        await setDoc(doc(db, 'workshop_gallery', item.id), updatedItem, { merge: true });
      } catch {}

      setFeedback({
        type: 'success',
        message: `✨ AI generated title & description for "${generatedTitle}"!`
      });
      setTimeout(() => setFeedback(null), 3500);

    } catch (err: any) {
      console.error('AI generation error:', err);
    } finally {
      setAiGeneratingId(null);
    }
  };

  // Save manual editing for an individual item inside Unified modal
  const handleSaveSingleItemEdit = async () => {
    if (!editingMediaItem) return;

    const updatedItem: WorkshopMediaItem = {
      ...editingMediaItem,
      title: itemEditTitle.trim() || editingMediaItem.title,
      caption: itemEditDescription.trim(),
      description: itemEditDescription.trim(),
      updatedAt: new Date().toISOString()
    };

    setMediaList(prev => {
      const next = prev.map(m => m.id === editingMediaItem.id ? updatedItem : m);
      saveStoredLocalMedia(next);
      return next;
    });

    try {
      await setDoc(doc(db, 'workshop_gallery', editingMediaItem.id), updatedItem, { merge: true });
    } catch {}

    setEditingMediaItem(null);
    setFeedback({
      type: 'success',
      message: 'Item updated successfully.'
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // WhatsApp click handler
  const handleRegisterWhatsApp = (cls: WorkshopClassDef) => {
    const phone = '9779767573721';
    const text = encodeURIComponent(cls.whatsappMessage);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  // Full HD Theater Open
  const handleOpenTheaterForClass = (cls: WorkshopClassDef) => {
    const classMedia = getWorkshopMedia(cls.key);
    if (classMedia.length > 0) {
      setTheaterMedia(classMedia);
      setTheaterIndex(0);
    } else {
      setFeedback({
        type: 'error',
        message: 'No video reels uploaded for this workshop yet.'
      });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const editingClassMedia = editingWorkshop ? getWorkshopMedia(editingWorkshop.key) : [];
  const editingPhotos = editingClassMedia.filter(m => m.type === 'image');
  const editingVideos = editingClassMedia.filter(m => m.type === 'video');

  return (
    <div className="w-full flex flex-col space-y-10 sm:space-y-12 animate-fade-in font-sans text-[#FAF8F5]">

      {/* Global Feedback Toast */}
      {feedback && (
        <div className={`fixed top-6 right-6 z-[160] max-w-md p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-2xl animate-fade-in ${
          feedback.type === 'success' 
            ? 'bg-[#1C1B1A] text-emerald-400 border border-emerald-500/40' 
            : 'bg-[#1C1B1A] text-rose-400 border border-rose-500/40'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            className="text-white/60 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. PUBLIC-FACING WORKSHOP LAYOUT: 3 DISTINCT WORKSHOP MODULES (IMAGE 0 STYLE) */}
      <div className="space-y-10 sm:space-y-14">
        {classesList.map((cls, idx) => {
          const classMedia = getWorkshopMedia(cls.key);
          const classVideos = classMedia.filter(m => m.type === 'video');
          const classPhotos = classMedia.filter(m => m.type === 'image');

          return (
            <div 
              key={cls.key}
              className="relative w-full rounded-3xl bg-[#121110] border border-[#2D2A26] p-4 sm:p-7 shadow-2xl overflow-hidden transition-all duration-300"
            >
              {/* Subtle top gold accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C5A880]/60 to-transparent" />

              {/* SELLER EDIT BUTTON (Only shown when authenticated as Seller) */}
              {isSellerMode && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#C5A880]/20 text-[#E6CA9E] border border-[#C5A880]/30 hidden sm:inline-block">
                    Seller Admin
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenEditWorkshop(cls)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#121110] text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer hover:scale-103"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              )}

              {/* 2-Column Responsive Public Workshop Module matching Image 0 Style */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch pt-2">
                
                {/* LEFT CARD (Image 0 Style: Logo, UPCOMING WORKSHOP BATCH badge, Title, Description, Footer metadata) */}
                <div className="flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-[#181716] border border-[#2A2825] shadow-inner relative overflow-hidden">
                  <div className="space-y-5">
                    {/* Brand Logo & Class Batch indicator */}
                    <div className="flex items-center justify-between gap-3">
                      <ArtifiedLogo variant="light" size="sm" />
                      <span className="text-[10px] font-mono text-[#8C7A6B] uppercase tracking-widest">
                        Module 0{idx + 1}
                      </span>
                    </div>

                    {/* UPCOMING WORKSHOP BATCH Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#C5A880]/20 text-[#E6CA9E] border border-[#C5A880]/40">
                      <Award className="w-3 h-3 text-[#C5A880]" />
                      <span>{cls.badge || 'UPCOMING WORKSHOP BATCH'}</span>
                    </div>

                    {/* Workshop Heading */}
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                      {cls.title}
                    </h3>

                    {/* Tagline / Subtitle */}
                    <p className="text-xs sm:text-sm font-medium text-[#C5A880]">
                      {cls.tagline}
                    </p>

                    {/* Workshop Description */}
                    <p className="text-xs sm:text-sm text-[#A8A29D] leading-relaxed font-normal">
                      {cls.description}
                    </p>

                    {/* Technique Bullets */}
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {cls.techniques.map((tech, tIdx) => (
                        <span 
                          key={tIdx}
                          className="px-2.5 py-1 rounded-lg text-[11px] bg-black/40 text-neutral-300 border border-white/5 font-medium"
                        >
                          ✓ {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Left Card Metadata Footer */}
                  <div className="pt-6 mt-6 border-t border-[#2A2825] flex flex-wrap items-center justify-between gap-3 text-xs text-[#8C7A6B]">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <Calendar className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>{cls.schedule}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>{cls.location}</span>
                    </span>
                  </div>
                </div>

                {/* RIGHT CARD (Image 0 Style: WORKSHOP DETAILS & REGISTRATION, Green "Accepting Inquiries", Metadata, Buttons) */}
                <div className="flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-[#181716] border border-[#2A2825] shadow-inner space-y-6">
                  
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#C5A880]">
                        WORKSHOP DETAILS & REGISTRATION
                      </h4>
                      {/* Green Status Tag */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>Accepting Inquiries</span>
                      </span>
                    </div>

                    <p className="text-xs text-[#A8A29D] leading-relaxed">
                      Reserve a dedicated workstation in our small-batch masterclass atelier. All raw materials, specialized tension looms, and take-home craft kits are fully included.
                    </p>

                    {/* Metadata Specs Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-[#8C7A6B] block mb-0.5">
                          Lead Mentor
                        </span>
                        <span className="text-xs font-bold text-white">
                          {cls.instructor}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-[#8C7A6B] block mb-0.5">
                          Studio Capacity
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          {cls.capacity} Seats / Batch Max
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-[#8C7A6B] block mb-0.5">
                          Photos Available
                        </span>
                        <span className="text-xs font-bold text-[#C5A880]">
                          {classPhotos.length} High-Res Snapshots
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-[#8C7A6B] block mb-0.5">
                          Video Reels
                        </span>
                        <span className="text-xs font-bold text-[#C5A880]">
                          {classVideos.length} Hover-to-Play Reels
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Card Action Buttons */}
                  <div className="space-y-3 pt-4 border-t border-[#2A2825]">
                    {/* Green REGISTER ON WHATSAPP Button */}
                    <button
                      type="button"
                      onClick={() => handleRegisterWhatsApp(cls)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs uppercase tracking-wider transition-all transform active:scale-98 shadow-lg cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>REGISTER ON WHATSAPP</span>
                    </button>

                    {/* Full HD Theater Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenTheaterForClass(cls)}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs uppercase tracking-wider border border-white/10 transition-all cursor-pointer"
                    >
                      <Tv className="w-4 h-4 text-[#C5A880]" />
                      <span>Full HD Theater</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* PUBLIC MEDIA SHOWCASE (Hover-to-Play Videos & High-Res Photos) */}
              <div className="mt-8 pt-6 border-t border-[#2A2825] space-y-6">
                
                {/* Videos Row (Hover-to-Play Feature with explicit attributes & event listeners) */}
                {classVideos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-[#C5A880]" />
                        <h4 className="font-serif font-bold text-sm text-white">
                          Workshop Video Reels ({classVideos.length})
                        </h4>
                      </div>
                      <span className="text-[11px] text-[#8C7A6B]">
                        Hover mouse over video cards to play preview
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {classVideos.slice(0, 3).map(video => (
                        <HoverVideoCard
                          key={video.id}
                          video={video}
                          isSeller={isSellerMode}
                          onDelete={handleDeleteMedia}
                          onEdit={(item) => {
                            setEditingMediaItem(item);
                            setItemEditTitle(item.title);
                            setItemEditDescription(item.caption || item.description || '');
                          }}
                          onGenerateAI={handleGenerateAI}
                          isAiGenerating={aiGeneratingId === video.id}
                          onOpenTheater={(v) => {
                            setTheaterMedia(classMedia);
                            const idx = classMedia.findIndex(m => m.id === v.id);
                            setTheaterIndex(idx >= 0 ? idx : 0);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos Row */}
                {classPhotos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-[#C5A880]" />
                        <h4 className="font-serif font-bold text-sm text-white">
                          Atelier Photos ({classPhotos.length})
                        </h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {classPhotos.slice(0, 3).map(photo => (
                        <PhotoGridCard
                          key={photo.id}
                          photo={photo}
                          isSeller={isSellerMode}
                          onDelete={handleDeleteMedia}
                          onEdit={(item) => {
                            setEditingMediaItem(item);
                            setItemEditTitle(item.title);
                            setItemEditDescription(item.caption || item.description || '');
                          }}
                          onGenerateAI={handleGenerateAI}
                          isAiGenerating={aiGeneratingId === photo.id}
                          onOpenPhoto={(p) => {
                            setTheaterMedia(classMedia);
                            const idx = classMedia.findIndex(m => m.id === p.id);
                            setTheaterIndex(idx >= 0 ? idx : 0);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          );
        })}
      </div>

      {/* 2. UNIFIED WORKSHOP EDIT MODAL (IMAGE 1 STYLE UNIFIED MANAGEMENT INTERFACE) */}
      {isSellerMode && editingWorkshop && (
        <div 
          className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setEditingWorkshop(null)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[92vh] bg-[#141312] text-[#F5F2EB] rounded-2xl sm:rounded-3xl border border-[#2E2C29] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#262422] flex items-center justify-between gap-3 bg-[#1A1918] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C5A880]/20 flex items-center justify-center text-[#E6CA9E]">
                  <Sparkles className="w-5 h-5 text-[#C5A880]" />
                </div>
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <span>Manage Workshop: {editingWorkshop.title}</span>
                  </h2>
                  <p className="text-xs text-[#A8A29D]">
                    Unified management interface: Edit text fields, batch-upload photos & videos, and generate AI stories.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingWorkshop(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

              {/* PART A: UPDATE TEXT CONTENT (Heading, Subtitle, Full Description, Schedule, WhatsApp) */}
              <div className="bg-[#1A1918] p-4 sm:p-5 rounded-2xl border border-[#262422] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#262422]">
                  <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#C5A880]" />
                    <span>Workshop Text & Schedule Details</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleSaveWorkshopText}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#121110] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Text Changes</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#A8A29D] uppercase tracking-wider mb-1">
                      Workshop Heading *
                    </label>
                    <input
                      type="text"
                      value={modalTitle}
                      onChange={(e) => setModalTitle(e.target.value)}
                      placeholder="e.g. Macrame Wall Art & Planters Workshop"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#201E1C] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#A8A29D] uppercase tracking-wider mb-1">
                      Subtitle / Tagline
                    </label>
                    <input
                      type="text"
                      value={modalSubtitle}
                      onChange={(e) => setModalSubtitle(e.target.value)}
                      placeholder="e.g. Cotton Cord Tensioning • Planters & Wall Hangings"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#201E1C] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#A8A29D] uppercase tracking-wider mb-1">
                      Full Workshop Description
                    </label>
                    <textarea
                      rows={3}
                      value={modalDescription}
                      onChange={(e) => setModalDescription(e.target.value)}
                      placeholder="Comprehensive description of techniques, mentor guidance, and participant takeaways..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#201E1C] border border-white/10 text-xs text-white focus:outline-none focus:border-[#C5A880] leading-relaxed resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#A8A29D] uppercase tracking-wider mb-1">
                      Schedule & Frequency
                    </label>
                    <input
                      type="text"
                      value={modalSchedule}
                      onChange={(e) => setModalSchedule(e.target.value)}
                      placeholder="Every Saturday • 11:00 AM - 2:00 PM"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#201E1C] border border-white/10 text-xs text-white focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#A8A29D] uppercase tracking-wider mb-1">
                      Atelier Location
                    </label>
                    <input
                      type="text"
                      value={modalLocation}
                      onChange={(e) => setModalLocation(e.target.value)}
                      placeholder="Kathmandu Studio, Nepal"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#201E1C] border border-white/10 text-xs text-white focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#A8A29D] uppercase tracking-wider mb-1">
                      Instructor & Mentor
                    </label>
                    <input
                      type="text"
                      value={modalInstructor}
                      onChange={(e) => setModalInstructor(e.target.value)}
                      placeholder="Sahina Shrestha"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#201E1C] border border-white/10 text-xs text-white focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#A8A29D] uppercase tracking-wider mb-1">
                      Capacity (Max Seats)
                    </label>
                    <input
                      type="number"
                      value={modalCapacity}
                      onChange={(e) => setModalCapacity(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#201E1C] border border-white/10 text-xs text-white focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#A8A29D] uppercase tracking-wider mb-1">
                      WhatsApp Pre-filled Registration Text
                    </label>
                    <input
                      type="text"
                      value={modalWhatsapp}
                      onChange={(e) => setModalWhatsapp(e.target.value)}
                      placeholder="Namaste Sahina! I would like to reserve a seat..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#201E1C] border border-white/10 text-xs text-white focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>
              </div>

              {/* PART B: UNIFIED SINGLE UPLOAD ACTION BUTTON & AUTOMATIC CLASSIFICATION */}
              <div className="bg-[#1A1918] p-4 sm:p-5 rounded-2xl border border-[#262422] space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#262422]">
                  <div>
                    <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#C5A880]" />
                      <span>Unified Media Uploader (Photos & Videos)</span>
                    </h3>
                    <p className="text-[11px] text-[#A8A29D]">
                      Select both photos & videos together. Files are automatically classified into Photos and Videos with client compression.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Hidden Unified File Input accepting both images and videos simultaneously */}
                    <input
                      ref={unifiedMediaInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleBatchUpload(e.target.files)}
                    />

                    {/* UNIFIED SINGLE UPLOAD BUTTON */}
                    <button
                      type="button"
                      disabled={isBatchUploading}
                      onClick={() => unifiedMediaInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#E6CA9E] hover:from-[#b8986c] hover:to-[#d4b789] text-[#141312] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-98"
                    >
                      {isBatchUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#141312]" />
                          <span>Uploading Media ({batchProgressPct}%)...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-[#141312]" />
                          <span>UPLOAD MEDIA (PHOTOS & VIDEOS)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Real-time Progress Bar & Percentage */}
                {isBatchUploading && (
                  <div className="space-y-2 p-3.5 rounded-xl bg-black/50 border border-[#C5A880]/30 shadow-inner">
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <span className="flex items-center gap-2 truncate max-w-[80%]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A880] shrink-0" />
                        <span className="truncate">{batchUploadProgress || 'Processing files...'}</span>
                      </span>
                      <span className="text-[#C5A880] font-mono font-bold text-sm">{batchProgressPct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-[#C5A880] via-[#E6CA9E] to-[#25D366] transition-all duration-200 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, batchProgressPct))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Drag-and-Drop Unified Target Zone */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsUnifiedDragOver(true); }}
                  onDragLeave={() => setIsUnifiedDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsUnifiedDragOver(false);
                    if (e.dataTransfer.files) handleBatchUpload(e.dataTransfer.files);
                  }}
                  onClick={() => unifiedMediaInputRef.current?.click()}
                  className={`p-7 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isUnifiedDragOver 
                      ? 'border-[#C5A880] bg-[#C5A880]/15 scale-[1.01]' 
                      : 'border-white/15 bg-black/25 hover:border-[#C5A880]/50 hover:bg-black/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#C5A880]/20 flex items-center justify-center text-[#E6CA9E]">
                      <Camera className="w-5 h-5 text-[#C5A880]" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366]">
                      <Video className="w-5 h-5 text-[#25D366]" />
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                    Drag & Drop Batch Photos & Videos Here
                  </h4>
                  <p className="text-[11px] text-[#A8A29D] max-w-md mb-3">
                    Fast client-side image compression down to ~1400px / 0.82 quality & automatic video formatting. Permanent cloud storage paths are preserved.
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider">
                    <Upload className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>Or Click to Select 2-3+ Files</span>
                  </span>
                </div>
              </div>

              {/* PART C: EDITABLE MEDIA LISTINGS CATEGORIZED INTO PHOTOS & VIDEOS */}
              <div className="bg-[#1A1918] p-4 sm:p-5 rounded-2xl border border-[#262422] space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-[#262422]">
                  <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#C5A880]" />
                    <span>Workshop Media Collections ({editingClassMedia.length} Total Items)</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#C5A880]/15 text-[#E6CA9E] text-[11px] font-semibold">
                      {editingPhotos.length} Photos
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold">
                      {editingVideos.length} Videos
                    </span>
                  </div>
                </div>

                {editingClassMedia.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#A8A29D] border border-dashed border-white/10 rounded-2xl bg-black/20">
                    <p className="font-semibold text-white mb-1">No media items uploaded for this class yet.</p>
                    <p>Click "UPLOAD MEDIA (PHOTOS & VIDEOS)" above to upload multiple photos and videos simultaneously.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* SECTION 1: WORKSHOP PHOTOS */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#E6CA9E] mb-3 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Workshop Photos ({editingPhotos.length})</span>
                      </h4>

                      {editingPhotos.length === 0 ? (
                        <p className="text-[11px] text-[#A8A29D] italic py-2">No photos uploaded in this class yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {editingPhotos.map((item) => (
                            <div 
                              key={item.id}
                              className="p-3.5 rounded-2xl bg-[#201E1C] border border-white/10 flex flex-col justify-between space-y-3 shadow-md"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-24 h-24 rounded-xl overflow-hidden bg-black shrink-0 relative border border-white/10">
                                  <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                                </div>

                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/60 text-[#C5A880]">
                                      PHOTO
                                    </span>
                                    <span className="text-[10px] text-neutral-400">
                                      {item.craftTechnique || 'Technique'}
                                    </span>
                                  </div>

                                  {/* Direct Editable Title Field */}
                                  <div>
                                    <input
                                      type="text"
                                      value={item.title}
                                      onChange={(e) => {
                                        const newTitle = e.target.value;
                                        setMediaList(prev => prev.map(m => m.id === item.id ? { ...m, title: newTitle } : m));
                                      }}
                                      onBlur={async (e) => {
                                        try {
                                          await setDoc(doc(db, 'workshop_gallery', item.id), { title: e.target.value, updatedAt: new Date().toISOString() }, { merge: true });
                                          saveStoredLocalMedia(mediaList);
                                        } catch {}
                                      }}
                                      placeholder="Photo title..."
                                      className="w-full px-2.5 py-1 text-xs font-bold text-white bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-[#C5A880]"
                                    />
                                  </div>

                                  {/* Direct Editable Description Field */}
                                  <div>
                                    <textarea
                                      rows={2}
                                      value={item.caption || item.description || ''}
                                      onChange={(e) => {
                                        const newDesc = e.target.value;
                                        setMediaList(prev => prev.map(m => m.id === item.id ? { ...m, caption: newDesc, description: newDesc } : m));
                                      }}
                                      onBlur={async (e) => {
                                        try {
                                          await setDoc(doc(db, 'workshop_gallery', item.id), { caption: e.target.value, description: e.target.value, updatedAt: new Date().toISOString() }, { merge: true });
                                          saveStoredLocalMedia(mediaList);
                                        } catch {}
                                      }}
                                      placeholder="Photo story or description..."
                                      className="w-full px-2.5 py-1 text-[11px] text-[#C4BCB5] bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-[#C5A880] resize-none leading-relaxed"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons: AI Generate & Instant Delete */}
                              <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleGenerateAI(item)}
                                  disabled={aiGeneratingId === item.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#C5A880]/15 hover:bg-[#C5A880]/25 text-[#E6CA9E] border border-[#C5A880]/30 transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <Sparkles className={`w-3 h-3 text-[#C5A880] ${aiGeneratingId === item.id ? 'animate-spin' : ''}`} />
                                  <span>{aiGeneratingId === item.id ? 'Generating...' : 'AI Generate'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMedia(item.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-rose-400 hover:text-white hover:bg-rose-600/30 border border-rose-500/20 transition-colors cursor-pointer"
                                  title="Delete photo permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: WORKSHOP VIDEOS */}
                    <div className="pt-4 border-t border-white/10">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5" />
                        <span>Workshop Videos ({editingVideos.length}) - Hover to Play</span>
                      </h4>

                      {editingVideos.length === 0 ? (
                        <p className="text-[11px] text-[#A8A29D] italic py-2">No videos uploaded in this class yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {editingVideos.map((item) => (
                            <div 
                              key={item.id}
                              className="p-3.5 rounded-2xl bg-[#201E1C] border border-white/10 flex flex-col justify-between space-y-3 shadow-md"
                            >
                              <div className="flex items-start gap-3">
                                {/* Interactive Hover-to-Play Video Thumbnail in Modal */}
                                <div 
                                  className="w-24 h-24 rounded-xl overflow-hidden bg-black shrink-0 relative border border-white/10 cursor-pointer group"
                                  onMouseEnter={(e) => {
                                    const vid = e.currentTarget.querySelector('video');
                                    if (vid) vid.play().catch(() => {});
                                  }}
                                  onMouseLeave={(e) => {
                                    const vid = e.currentTarget.querySelector('video');
                                    if (vid) {
                                      vid.pause();
                                      vid.currentTime = 0;
                                    }
                                  }}
                                >
                                  <video 
                                    src={item.url} 
                                    className="w-full h-full object-cover" 
                                    muted 
                                    loop 
                                    playsInline 
                                    preload="metadata"
                                  />
                                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:opacity-0 transition-opacity pointer-events-none">
                                    <Play className="w-5 h-5 text-white/90 fill-white" />
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
                                      VIDEO
                                    </span>
                                    <span className="text-[10px] text-neutral-400">
                                      {item.craftTechnique || 'Technique'}
                                    </span>
                                  </div>

                                  {/* Direct Editable Title Field */}
                                  <div>
                                    <input
                                      type="text"
                                      value={item.title}
                                      onChange={(e) => {
                                        const newTitle = e.target.value;
                                        setMediaList(prev => prev.map(m => m.id === item.id ? { ...m, title: newTitle } : m));
                                      }}
                                      onBlur={async (e) => {
                                        try {
                                          await setDoc(doc(db, 'workshop_gallery', item.id), { title: e.target.value, updatedAt: new Date().toISOString() }, { merge: true });
                                          saveStoredLocalMedia(mediaList);
                                        } catch {}
                                      }}
                                      placeholder="Video title..."
                                      className="w-full px-2.5 py-1 text-xs font-bold text-white bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-[#C5A880]"
                                    />
                                  </div>

                                  {/* Direct Editable Description Field */}
                                  <div>
                                    <textarea
                                      rows={2}
                                      value={item.caption || item.description || ''}
                                      onChange={(e) => {
                                        const newDesc = e.target.value;
                                        setMediaList(prev => prev.map(m => m.id === item.id ? { ...m, caption: newDesc, description: newDesc } : m));
                                      }}
                                      onBlur={async (e) => {
                                        try {
                                          await setDoc(doc(db, 'workshop_gallery', item.id), { caption: e.target.value, description: e.target.value, updatedAt: new Date().toISOString() }, { merge: true });
                                          saveStoredLocalMedia(mediaList);
                                        } catch {}
                                      }}
                                      placeholder="Video technique description..."
                                      className="w-full px-2.5 py-1 text-[11px] text-[#C4BCB5] bg-black/40 border border-white/10 rounded-lg focus:outline-none focus:border-[#C5A880] resize-none leading-relaxed"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons: AI Generate & Instant Delete */}
                              <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleGenerateAI(item)}
                                  disabled={aiGeneratingId === item.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#C5A880]/15 hover:bg-[#C5A880]/25 text-[#E6CA9E] border border-[#C5A880]/30 transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <Sparkles className={`w-3 h-3 text-[#C5A880] ${aiGeneratingId === item.id ? 'animate-spin' : ''}`} />
                                  <span>{aiGeneratingId === item.id ? 'Generating...' : 'AI Generate'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMedia(item.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-rose-400 hover:text-white hover:bg-rose-600/30 border border-rose-500/20 transition-colors cursor-pointer"
                                  title="Delete video permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-[#262422] flex items-center justify-between gap-3 bg-[#1A1918] shrink-0">
              <span className="text-xs text-[#A8A29D]">
                Editing class <strong>{editingWorkshop.key}</strong> • Artified Kathmandu
              </span>

              <button
                type="button"
                onClick={() => setEditingWorkshop(null)}
                className="px-5 py-2.5 rounded-xl bg-white text-[#121110] text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer shadow-md"
              >
                Close Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. INDIVIDUAL MEDIA ITEM TITLE/DESCRIPTION EDIT MODAL */}
      {isSellerMode && editingMediaItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#1C1B1A] rounded-2xl max-w-md w-full p-5 sm:p-6 border border-[#2D2A26] shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2D2A26]">
              <h3 className="font-serif font-bold text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#C5A880]" />
                <span>Edit Title & Story</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingMediaItem(null)} 
                className="text-[#A8A29D] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A8A29D] mb-1.5">
                  Media Title
                </label>
                <input
                  type="text"
                  value={itemEditTitle}
                  onChange={(e) => setItemEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#262422] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A8A29D] mb-1.5">
                  Story & Description
                </label>
                <textarea
                  rows={4}
                  value={itemEditDescription}
                  onChange={(e) => setItemEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#262422] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#C5A880] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMediaItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A8A29D] hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSingleItemEdit}
                  className="px-4 py-2 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#121110] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FULL HD THEATER LIGHTBOX MODAL */}
      <WorkshopLightboxModal
        isOpen={theaterIndex !== null}
        onClose={() => setTheaterIndex(null)}
        items={theaterMedia}
        initialIndex={theaterIndex || 0}
      />

    </div>
  );
};
