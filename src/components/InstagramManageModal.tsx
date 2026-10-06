import React, { useState, useEffect } from 'react';
import { 
  X, 
  Instagram, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Check, 
  Sparkles, 
  Link as LinkIcon, 
  AlertCircle, 
  Upload, 
  Image as ImageIcon,
  AtSign,
  Globe,
  RotateCcw,
  ClipboardPaste,
  Play,
  Loader2,
  Download
} from 'lucide-react';
import { InstagramReelDownloaderSection } from './InstagramReelDownloaderSection';
import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  getDocFromServer,
  collection, 
  getDocs,
  getDocsFromServer,
  serverTimestamp
} from 'firebase/firestore';
import {
  safeSetDoc as setDoc,
  safeUpdateDoc as updateDoc,
  safeDeleteDoc as deleteDoc,
  safeOnSnapshot as onSnapshot
} from '../utils/safeFirestore';
import { useCart } from '../context/CartContext';
import { InstagramJournalItem } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { getFreshAssetUrl, getCacheBustedThumbnailUrl } from '../utils/storageAssetUtils';
import { uploadVideoToFirebaseStorage, getFirebaseStorageVideoUrl } from '../utils/firebaseVideoStorage';
import { getPlayableInstagramCover, getInstagramShortcode, KNOWN_LOCAL_VIDEOS, KNOWN_LOCAL_COVERS } from './InstagramShowcase';

// Helper to sanitize payload for Cloud Firestore storage
const sanitizeItemForFirestore = (item: Partial<InstagramJournalItem>): Record<string, any> => {
  const result: Record<string, any> = {
    id: item.id || `ig-${Date.now()}`,
    title: item.title || '',
    caption: item.caption || '',
    thumbnail: item.thumbnail || '',
    postUrl: item.postUrl || '',
    handle: item.handle || '@artified_np',
    updatedAt: serverTimestamp()
  };
  if (item.videoUrl && item.videoUrl.trim()) {
    result.videoUrl = item.videoUrl.trim();
  }
  if (item.date) {
    result.date = item.date;
  }
  if (item.likes) {
    result.likes = item.likes;
  }
  if (item.comments) {
    result.comments = item.comments;
  }
  if (item.taggedProductId && item.taggedProductId.trim()) {
    result.taggedProductId = item.taggedProductId.trim();
    result.taggedProductName = item.taggedProductName || '';
    result.taggedProductPrice = Number(item.taggedProductPrice) || 0;
  }
  if (item.isLocked !== undefined) {
    result.isLocked = item.isLocked;
  }
  return result;
};

export const InstagramManageModal: React.FC = () => {
  const { 
    isInstagramManagerOpen, 
    setIsInstagramManagerOpen, 
    instagramItems, 
    updateInstagramItem, 
    addInstagramItem, 
    deleteInstagramItem, 
    deleteAllInstagramItems,
    products,
    editingInstagramItem,
    setEditingInstagramItem,
    instagramHandle,
    instagramProfileUrl,
    updateInstagramSettings
  } = useCart();

  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'downloader' | 'settings'>('list');
  
  // Post editor form states
  const [itemId, setItemId] = useState('');
  const [title, setTitle] = useState('');
  const [handle, setHandle] = useState(instagramHandle || '@artified_np');
  const [postUrl, setPostUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [taggedProductId, setTaggedProductId] = useState('');
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  // Available local .mp4 videos in public/instagram_videos/
  const [availableLocalVideos, setAvailableLocalVideos] = useState<{ filename: string; path: string; name: string }[]>([
    { filename: 'DdjhhazvaRr.mp4', path: '/instagram_videos/DdjhhazvaRr.mp4', name: 'DdjhhazvaRr (Tourmaline & Baroque Pearl Necklace)' },
    { filename: 'DdMRgKdP4HK.mp4', path: '/instagram_videos/DdMRgKdP4HK.mp4', name: 'DdMRgKdP4HK (Macrame Workshop Glimpse)' },
    { filename: 'DdIUMC4BqFr.mp4', path: '/instagram_videos/DdIUMC4BqFr.mp4', name: 'DdIUMC4BqFr (Saturday Macrame Workshop Announcement)' },
    { filename: 'DY6OqqfPyJu.mp4', path: '/instagram_videos/DY6OqqfPyJu.mp4', name: 'DY6OqqfPyJu (Packing a Special Order for Pyarii Maya)' },
  ]);

  const fetchAvailableVideos = async () => {
    try {
      const res = await fetch('/api/instagram-videos-list');
      if (res.ok) {
        const data = await res.json();
        if (data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
          setAvailableLocalVideos(data.videos);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (isInstagramManagerOpen) {
      fetchAvailableVideos();
    }
  }, [isInstagramManagerOpen]);

  // Global settings state
  const [globalHandleInput, setGlobalHandleInput] = useState(instagramHandle || '@artified_np');
  const [globalUrlInput, setGlobalUrlInput] = useState(instagramProfileUrl || 'https://www.instagram.com/artified_np/');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Inline delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Handle pasting screenshot directly from clipboard (e.g. Snipping tool, Win+Shift+S, Cmd+Shift+4)
  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) {
        setClipboardNotice('Press Ctrl+V to paste your screenshot directly.');
        setTimeout(() => setClipboardNotice(null), 3500);
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              try {
                const compressed = await compressImage(dataUrl, 1000, 0.85);
                setThumbnail(compressed);
              } catch {
                setThumbnail(dataUrl);
              }
              setClipboardNotice('Screenshot pasted as cover photo!');
              setTimeout(() => setClipboardNotice(null), 3000);
            }
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      setClipboardNotice('No image in clipboard. Snip a screenshot first (Win+Shift+S or Cmd+Shift+4).');
      setTimeout(() => setClipboardNotice(null), 4000);
    } catch (err) {
      console.warn('Clipboard read error:', err);
      setClipboardNotice('Clipboard access denied. You can press Ctrl+V directly.');
      setTimeout(() => setClipboardNotice(null), 4000);
    }
  };

  // Global paste handler on modal container
  const handleModalPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = async (evt) => {
            const dataUrl = evt.target?.result as string;
            if (dataUrl) {
              try {
                const compressed = await compressImage(dataUrl, 1000, 0.85);
                setThumbnail(compressed);
              } catch {
                setThumbnail(dataUrl);
              }
              setClipboardNotice('Screenshot pasted from clipboard!');
              setTimeout(() => setClipboardNotice(null), 3000);
            }
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  // Paste caption directly from clipboard
  const handlePasteCaptionFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const clean = text.trim();
        setCaption(clean);
        if (!title.trim()) {
          const withoutTags = clean.replace(/#\S+/g, '').replace(/https?:\/\/\S+/g, '').trim();
          const firstSentence = withoutTags.split(/[.\n!?]+/)[0]?.trim();
          if (firstSentence && firstSentence.length > 5) {
            setTitle(firstSentence.length > 65 ? firstSentence.slice(0, 62) + '...' : firstSentence);
          }
        }
        setClipboardNotice('📋 Exact Instagram caption pasted from clipboard!');
        setTimeout(() => setClipboardNotice(null), 3000);
        return;
      }
      setClipboardNotice('No text in clipboard. Copy caption on Instagram first (Ctrl+C).');
      setTimeout(() => setClipboardNotice(null), 3500);
    } catch (err) {
      console.warn('Clipboard read error:', err);
      setClipboardNotice('Click the caption box and press Ctrl+V to paste.');
      setTimeout(() => setClipboardNotice(null), 3500);
    }
  };

  // Automatically update cover photo, headline, and caption from tagged product
  const handleAutoFillFromProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (!thumbnail && prod.images && prod.images.length > 0) {
      setThumbnail(prod.images[0]);
    }

    if (!title.trim()) {
      setTitle(`${prod.title} • Handcrafted in Kathmandu, Nepal`);
    }

    if (!caption.trim()) {
      const materialsStr = prod.materials && prod.materials.length > 0 
        ? prod.materials.join(', ') 
        : 'lustrous freshwater pearls and durable cord';
      const subtitlePart = prod.subtitle ? `${prod.subtitle}. ` : '';
      const generatedCaption = `${subtitlePart}Handcrafted elegance by Sahina Shrestha at our workshop in Kathmandu, Nepal with ${materialsStr}. Individually hand-knotted for lifetime durability and brilliant luster.\n\n✨ Price: NPR ${prod.price.toLocaleString()} (${prod.category})\n📍 Handcrafted in Kathmandu, Nepal\n🛍️ Tap the piece to shop or message us to order! #artified_np #KathmanduCraft #pearljewelry #necklace`;
      setCaption(generatedCaption);
    }
  };

  // Smart generation for any Instagram link, post shortcode, or tagged piece
  const handleAutoGenerateDetails = async (customUrl?: string) => {
    const targetUrl = (customUrl || postUrl || '').trim();
    if (!targetUrl) {
      setClipboardNotice('Please enter an Instagram post or reel link first.');
      setTimeout(() => setClipboardNotice(null), 3000);
      return;
    }

    // 1. Fetch live details from Instagram API endpoint (cover screenshot, real caption, and derived headline)
    if (targetUrl.includes('instagram.com') || targetUrl.includes('/p/') || targetUrl.includes('/reel/') || targetUrl.includes('/reels/')) {
      setIsAutoGenerating(true);
      try {
        const res = await fetch(`/api/instagram-info?url=${encodeURIComponent(targetUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            let extractedSomething = false;

            if (data.headline && data.headline.trim()) {
              setTitle(data.headline);
              extractedSomething = true;
            }
            if (data.caption && data.caption.trim()) {
              setCaption(data.caption);
              extractedSomething = true;
            }
            if (data.thumbnail && data.thumbnail.trim()) {
              setThumbnail(data.thumbnail);
              extractedSomething = true;
            }
            if (data.videoUrl && data.videoUrl.trim()) {
              setVideoUrl(data.videoUrl);
            } else if (data.directCdnUrl) {
              setVideoUrl(data.directCdnUrl);
            } else {
              setVideoUrl(targetUrl);
            }

            // Trigger immediate local physical video download and save to public/instagram_videos/ folder
            const sc = getInstagramShortcode(targetUrl) || getInstagramShortcode(data.videoUrl);
            if (sc) {
              fetch(`/api/instagram-video/${sc}`).catch(() => {});
            }

            if (data.hasCaption && data.hasThumbnail) {
              setClipboardNotice('✨ Auto-extracted exact Instagram caption & cover photo!');
            } else if (data.hasCaption) {
              setClipboardNotice('✨ Extracted exact caption! Use "Paste Screenshot (Ctrl+V)" to set cover.');
            } else if (data.hasThumbnail) {
              setClipboardNotice('✨ Extracted exact reel cover! You can paste your caption directly.');
            } else {
              setClipboardNotice('Instagram blocked bot scraping for this link. You can paste caption & press Ctrl+V to paste screenshot!');
            }

            setTimeout(() => setClipboardNotice(null), 4000);
            setIsAutoGenerating(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch from Instagram API:', err);
      } finally {
        setIsAutoGenerating(false);
      }
    }

    // 2. Specific exact presets for the 4 signature atelier reels
    if (targetUrl.includes('DdjhhazvaRr')) {
      setTitle('Tourmaline Gemstone & Baroque Pearl Necklace ✨');
      setCaption('Me: When my husband says no to the necklace 😭 Individually knotted natural freshwater baroque pearls with genuine tourmaline gemstones. Handcrafted at our workshop in Kathmandu, Nepal.\n\n✨ Pure Nepal Handcrafted\n📍 Store: Kathmandu, Nepal\n🛍️ Tap to shop or DM on Instagram #artified_np #smallbusiness #necklace #pearls');
      setVideoUrl('/instagram_videos/DdjhhazvaRr.mp4');
      setThumbnail('/instagram_videos/DdjhhazvaRr_cover.jpg');
      setClipboardNotice('Loaded Tourmaline & Pearl Necklace exact reel video & details!');
      setTimeout(() => setClipboardNotice(null), 3000);
      return;
    }

    if (targetUrl.includes('DdMRgKdP4HK')) {
      setTitle('Some glimpse of todays Macrame Workshop ✨');
      setCaption("Behind the scenes at today's macrame craft workshop in Kathmandu! Each knot and weave is created by hand with natural cord and ancestral techniques.\n\n✨ 100% Handcrafted in Kathmandu, Nepal\n📍 Store: Kathmandu, Nepal\n🛍️ Tap or double-click to view on Instagram #artified_np #macrame #workshop #handmade");
      setVideoUrl('/instagram_videos/DdMRgKdP4HK.mp4');
      setThumbnail('/instagram_videos/DdMRgKdP4HK_cover.jpg');
      setClipboardNotice('Loaded Macrame Workshop Behind-The-Scenes reel & details!');
      setTimeout(() => setClipboardNotice(null), 3000);
      return;
    }

    if (targetUrl.includes('DdIUMC4BqFr')) {
      setTitle('Macrame Workshop Happening This Saturday !!! ✨');
      setCaption('Macrame Workshop Happening This Saturday at Kalashala! Join Sahina Shrestha to learn the tactile art of macrame cord knotting, bag crafting, and sustainable wearable art in Kathmandu.\n\n✨ Workshop by Artified Nepal\n📍 Location: Kalashala, Kathmandu\n🛍️ DM us to book your seat! #artified_np #macrameworkshop #kalashala #kathmandu');
      setVideoUrl('/instagram_videos/DdIUMC4BqFr.mp4');
      setThumbnail('/instagram_videos/DdIUMC4BqFr_cover.jpg');
      setClipboardNotice('Loaded Saturday Macrame Workshop at Kalashala reel & details!');
      setTimeout(() => setClipboardNotice(null), 3000);
      return;
    }

    if (targetUrl.includes('DY6OqqfPyJu')) {
      setTitle('Packing a Special Order for Pyarii Maya 🌸');
      setCaption("Let's pack a very special order for her! 🌸 Packing the handcrafted pearl bag and custom necklace for someone's pyarii Maya ❤️ Individually packed with love at our Kathmandu workshop.\n\n✨ Handcrafted in Kathmandu, Nepal\n📍 Store: Kathmandu, Nepal\n🛍️ DM to purchase this for your pyarii maya! #artified_np #pyariimaya #pearlbag #smallbusiness");
      setVideoUrl('/instagram_videos/DY6OqqfPyJu.mp4');
      setThumbnail('/instagram_videos/DY6OqqfPyJu_cover.jpg');
      setClipboardNotice('Loaded Packing Order for Pyarii Maya reel & details!');
      setTimeout(() => setClipboardNotice(null), 3000);
      return;
    }

    // 3. If a catalog product is tagged, use product details if title is empty
    if (taggedProductId && !title) {
      handleAutoFillFromProduct(taggedProductId);
      setClipboardNotice('Auto-generated details from tagged catalog product!');
      setTimeout(() => setClipboardNotice(null), 3000);
      return;
    }

    const shortcode = getInstagramShortcode(targetUrl);
    if (shortcode) {
      setVideoUrl(`/instagram_videos/${shortcode}.mp4`);
      setClipboardNotice('Instagram Reel shortcode extracted & linked to local video path!');
    } else {
      setVideoUrl(targetUrl);
      setClipboardNotice('Instagram link linked! You can paste your caption & screenshot directly.');
    }
    setTimeout(() => setClipboardNotice(null), 3000);
  };

  const handleProductSelect = (prodId: string) => {
    setTaggedProductId(prodId);
    if (prodId) {
      handleAutoFillFromProduct(prodId);
    }
  };

  // Listener-based real-time onSnapshot sync with Firestore to prevent stale or default content from overwriting the view
  useEffect(() => {
    if (!isInstagramManagerOpen) return;

    // 1. Real-time listener for Instagram handle and profile URL settings
    const settingsDocRef = doc(db, 'store_settings', 'instagram');
    const unsubscribeSettings = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const sData = snapshot.data();
          if (sData?.handle) {
            setGlobalHandleInput(sData.handle);
            setHandle((prev) => prev || sData.handle);
          }
          if (sData?.profileUrl) {
            setGlobalUrlInput(sData.profileUrl);
          }
        }
      },
      (error) => {
        console.warn('Instagram settings onSnapshot listener notice:', error);
      }
    );

    // 2. Real-time listener for Instagram journal entries collection
    const journalColRef = collection(db, 'instagram_journal');
    const unsubscribeJournal = onSnapshot(
      journalColRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const items: InstagramJournalItem[] = [];
          const nowTs = Date.now();
          snapshot.forEach((d: any) => {
            const data = d.data() as InstagramJournalItem;
            if (data && (data.id || d.id)) {
              const uniqueVersion = `${nowTs}_${d.id}`;
              const bustedThumbnail = getCacheBustedThumbnailUrl(data.thumbnail, uniqueVersion);
              items.push({
                ...data,
                id: data.id || d.id,
                thumbnail: bustedThumbnail
              });
            }
          });
          if (items.length > 0) {
            // Synchronize real-time updates to local storage mirror
            try {
              localStorage.setItem('artified_instagram_journal_items', JSON.stringify(items));
            } catch {}
          }
        }
      },
      (error) => {
        console.warn('Instagram journal onSnapshot listener notice:', error);
      }
    );

    return () => {
      unsubscribeSettings();
      unsubscribeJournal();
    };
  }, [isInstagramManagerOpen]);

  // When opening for edit
  useEffect(() => {
    if (editingInstagramItem) {
      setItemId(editingInstagramItem.id);
      setTitle(editingInstagramItem.title || '');
      setHandle(editingInstagramItem.handle || instagramHandle || '@artified_np');
      setPostUrl(editingInstagramItem.postUrl || '');
      setCaption(editingInstagramItem.caption || '');
      setThumbnail(getCacheBustedThumbnailUrl(editingInstagramItem.thumbnail));
      setVideoUrl(editingInstagramItem.videoUrl || '');
      setTaggedProductId(editingInstagramItem.taggedProductId || '');
      setActiveTab('editor');
    }
  }, [editingInstagramItem]);

  // Keep global handle state in sync
  useEffect(() => {
    setGlobalHandleInput(instagramHandle);
    setGlobalUrlInput(instagramProfileUrl);
  }, [instagramHandle, instagramProfileUrl, isInstagramManagerOpen]);

  const resetForm = () => {
    setItemId('');
    setTitle('');
    setHandle(instagramHandle || '@artified_np');
    setPostUrl('');
    setCaption('');
    setThumbnail('');
    setVideoUrl('');
    setTaggedProductId('');
    setErrorMessage('');
  };

  if (!isInstagramManagerOpen) return null;

  const handleCreateNew = () => {
    setEditingInstagramItem(null);
    resetForm();
    setActiveTab('editor');
  };

  const handleEditClick = (item: InstagramJournalItem) => {
    setEditingInstagramItem(item);
    setActiveTab('editor');
  };

  // Custom photo upload with compression
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

  // Upload MP4 Video File directly to public/instagram_videos/ folder
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const shortcode = getInstagramShortcode(postUrl) || cleanBaseName || `reel_${Date.now()}`;
      
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/save-instagram-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoBufferBase64: base64,
              shortcode,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const localVidPath = data.videoUrl || `/instagram_videos/${shortcode}.mp4`;
            setVideoUrl(localVidPath);
            if (data.coverUrl && !thumbnail) {
              setThumbnail(data.coverUrl);
            }
            setClipboardNotice(`✅ Video saved directly to public/instagram_videos/${shortcode}.mp4!`);
            fetchAvailableVideos();
          } else {
            const errData = await res.json().catch(() => ({}));
            setErrorMessage(errData.error || 'Failed to save video to local directory');
          }
        } catch (uploadErr: any) {
          setErrorMessage(uploadErr.message || 'Error uploading video');
        } finally {
          setIsSubmitting(false);
          setTimeout(() => setClipboardNotice(null), 4000);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.warn('Video upload error:', err);
      setIsSubmitting(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter a post title.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const rawThumbnail = thumbnail.trim() || '/instagram_videos/DdjhhazvaRr_cover.jpg';
      const uniqueSaveVersion = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const cacheBustedThumb = getCacheBustedThumbnailUrl(rawThumbnail, uniqueSaveVersion);

      let finalVid = videoUrl.trim();
      const extractedSC = getInstagramShortcode(postUrl) || getInstagramShortcode(finalVid);
      
      if (!finalVid || finalVid === '/instagram_videos/DdjhhazvaRr.mp4') {
        const text = (title + ' ' + caption + ' ' + postUrl).toLowerCase();
        if (extractedSC && KNOWN_LOCAL_VIDEOS[extractedSC]) {
          finalVid = KNOWN_LOCAL_VIDEOS[extractedSC];
        } else if (text.includes('macrame') || text.includes('workshop')) {
          finalVid = '/instagram_videos/DdMRgKdP4HK.mp4';
        } else if (text.includes('kalashala')) {
          finalVid = '/instagram_videos/DdIUMC4BqFr.mp4';
        } else if (text.includes('bag') || text.includes('tote') || text.includes('clutch') || text.includes('maya')) {
          finalVid = '/instagram_videos/DY6OqqfPyJu.mp4';
        } else if (text.includes('tourmaline') || text.includes('gemstone') || text.includes('necklace') || text.includes('choker')) {
          finalVid = '/instagram_videos/DdjhhazvaRr.mp4';
        } else if (extractedSC) {
          finalVid = `/instagram_videos/${extractedSC}.mp4`;
        } else {
          finalVid = '/instagram_videos/DdMRgKdP4HK.mp4';
        }
      }

      const payload: InstagramJournalItem = {
        id: itemId || `ig-post-${Date.now()}`,
        title: title.trim(),
        handle: handle.trim() || instagramHandle || '@artified_np',
        postUrl: postUrl.trim() || instagramProfileUrl,
        caption: caption.trim() || 'Latest handcrafted release from @artified_np on Instagram.',
        thumbnail: cacheBustedThumb,
        videoUrl: finalVid,
        isLocked: true,
      };

      // STEP 1: Apply immediate update to CartContext, LocalStorage, and Express Server API
      if (itemId) {
        await updateInstagramItem(payload);
      } else {
        await addInstagramItem(payload);
      }

      // STEP 1.5: Trigger direct, instant local physical video download and save to public/instagram_videos/ folder
      if (extractedSC) {
        fetch(`/api/instagram-video/${extractedSC}`).catch(() => {});
      }

      // STEP 2: Asynchronous Non-blocking Firestore Write (Never blocks UI or hangs on quota backoff)
      const firestorePayload = sanitizeItemForFirestore(payload);
      const itemDocRef = doc(db, 'instagram_journal', payload.id);
      setDoc(itemDocRef, firestorePayload, { merge: true }).catch((fsErr) => {
        console.warn('Notice: Firestore save background notice:', fsErr);
      });

      setItemId(payload.id);
      setThumbnail(payload.thumbnail);
      setEditingInstagramItem(payload);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTab('list');
      }, 300);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save Instagram item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsSubmitting(true);
    try {
      // STEP 1: Apply immediate deletion to CartContext & local state
      await deleteAllInstagramItems();

      // STEP 2: Non-blocking Firestore cleanup
      const journalColRef = collection(db, 'instagram_journal');
      getDocs(journalColRef).then((snap) => {
        if (snap && !snap.empty) {
          snap.docs.forEach((docSnap) => {
            deleteDoc(docSnap.ref).catch(() => {});
          });
        }
      }).catch(() => {});

      setShowDeleteAllConfirm(false);
      setEditingInstagramItem(null);
      setActiveTab('list');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1200);
    } catch (err: any) {
      setErrorMessage('Failed to delete all items: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsSubmitting(true);
    try {
      // STEP 1: Apply immediate deletion to CartContext & local state
      await deleteInstagramItem(id);

      // STEP 2: Non-blocking Firestore deletion
      const docRef = doc(db, 'instagram_journal', id);
      deleteDoc(docRef).catch(() => {});

      setDeleteConfirmId(null);
      if (editingInstagramItem?.id === id || itemId === id) {
        setEditingInstagramItem(null);
        setActiveTab('list');
      }
    } catch (err: any) {
      setErrorMessage('Failed to delete: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const cleanHandle = globalHandleInput.trim().startsWith('@') 
        ? globalHandleInput.trim() 
        : `@${globalHandleInput.trim()}`;
      const cleanUrl = (globalUrlInput.trim() || `https://www.instagram.com/${cleanHandle.replace('@', '')}/`);

      // STEP 1: Apply immediate update to CartContext & local state
      setGlobalHandleInput(cleanHandle);
      setGlobalUrlInput(cleanUrl);
      setHandle(cleanHandle);
      await updateInstagramSettings(cleanHandle, cleanUrl);

      // STEP 2: Non-blocking Firestore write
      const settingsDocRef = doc(db, 'store_settings', 'instagram');
      setDoc(settingsDocRef, {
        handle: cleanHandle,
        profileUrl: cleanUrl,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(() => {});

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update Instagram settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div 
        onPaste={handleModalPaste}
        className="bg-[#FAF8F5] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#E8DFD8] flex flex-col max-h-[92vh] overflow-hidden"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8DFD8] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white shadow-xs">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-semibold text-[#1C1B1A]">
                  Instagram Journal Manager
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F4EFEB] text-[#8C7A6B] px-2 py-0.5 rounded-full border border-[#E8DFD8]">
                  Seller Studio
                </span>
              </div>
              <p className="text-xs text-[#736C65]">
                Manage visual journal posts, update your Instagram handle & link, and attach catalog products.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsInstagramManagerOpen(false);
              setEditingInstagramItem(null);
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
            Your Active Posts ({instagramItems.length})
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (!editingInstagramItem && !itemId) {
                resetForm();
              }
              setActiveTab('editor');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'editor'
                ? 'bg-white text-[#1C1B1A] border-t-2 border-[#1C1B1A] shadow-xs'
                : 'text-[#8C7A6B] hover:text-[#1C1B1A]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingInstagramItem || itemId ? 'Edit Post Details' : 'Add New Instagram Post'}</span>
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

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-white text-[#1C1B1A] border-t-2 border-[#1C1B1A] shadow-xs'
                : 'text-[#8C7A6B] hover:text-[#1C1B1A]'
            }`}
          >
            <AtSign className="w-3.5 h-3.5" />
            <span>Handle & Profile Link</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: LIST VIEW */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#736C65]">Active Handle:</span>
                  <span className="px-2 py-0.5 bg-[#FAF8F5] border border-[#E8DFD8] text-[11px] font-semibold text-[#1C1B1A] rounded-full flex items-center gap-1">
                    <Instagram className="w-3 h-3 text-[#E1306C]" />
                    {instagramHandle}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="text-xs text-[#8C7A6B] hover:text-[#1C1B1A] underline transition-colors"
                  >
                    Edit Handle / Link
                  </button>

                  {instagramItems.length > 0 && (
                    <>
                      {showDeleteAllConfirm ? (
                        <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 px-2 py-1 rounded-lg">
                          <span className="text-[11px] text-rose-700 font-semibold">Delete all?</span>
                          <button
                            type="button"
                            onClick={handleDeleteAll}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold"
                          >
                            Yes, Delete All
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDeleteAllConfirm(false)}
                            className="px-1 text-[10px] text-zinc-600 hover:text-black"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowDeleteAllConfirm(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                          title="Delete all existing journal entries"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete All Journals</span>
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1B1A] text-white rounded-lg text-xs font-semibold hover:bg-[#34312F] shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Add Instagram Post</span>
                  </button>
                </div>
              </div>

              {instagramItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-[#D5C7BC] rounded-2xl bg-white/50 p-6">
                  <div className="w-12 h-12 rounded-full bg-[#FAF8F5] flex items-center justify-center mx-auto mb-3 text-[#8C7A6B]">
                    <Instagram className="w-6 h-6 text-[#E1306C]" />
                  </div>
                  <h4 className="font-serif text-sm font-semibold text-[#1C1B1A]">No Instagram Journal Posts Yet</h4>
                  <p className="text-xs text-[#736C65] max-w-sm mx-auto mt-1 mb-4">
                    All existing journals have been deleted. You can link fresh posts from your Instagram account ({instagramHandle}) or auto-generate posts from your catalog products.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    {products.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCreateNew();
                          handleProductSelect(products[0].id);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] hover:bg-[#c29f2e] text-[#1C1B1A] rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Auto-Create from {products[0].title.slice(0, 20)}...</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCreateNew}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1C1B1A] text-white rounded-lg text-xs font-semibold hover:bg-[#34312F] shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Journal Post</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {instagramItems.map((item) => {
                    const isConfirming = deleteConfirmId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-[#E8DFD8] rounded-xl p-3 flex gap-3 shadow-xs hover:border-[#8C7A6B] transition-all group relative cursor-pointer"
                        onClick={() => handleEditClick(item)}
                      >
                        {/* Thumbnail without metric badges */}
                        <div className="w-20 h-28 rounded-lg overflow-hidden bg-black shrink-0 relative flex items-center justify-center">
                          {item.thumbnail?.trim() ? (
                            <img
                              src={item.thumbnail.trim()}
                              alt={item.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80';
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white p-1 text-center">
                              <Instagram className="w-5 h-5 text-[#E1306C] mb-1" />
                              <span className="text-[8px] text-zinc-400">No Photo</span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <Instagram className="w-4 h-4 text-white drop-shadow-md" />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-[10px] font-semibold text-[#8C7A6B] truncate">
                                {item.handle || instagramHandle}
                              </span>
                              
                              {/* Inline Delete Button */}
                              <div onClick={(e) => e.stopPropagation()}>
                                {isConfirming ? (
                                  <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 p-1 rounded">
                                    <button
                                      type="button"
                                      onClick={(e) => handleConfirmDelete(item.id, e)}
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
                                    onClick={() => setDeleteConfirmId(item.id)}
                                    className="text-zinc-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                    title="Delete post"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <h4 className="text-xs font-semibold text-[#1C1B1A] line-clamp-2 mt-1 leading-snug">
                              {item.title}
                            </h4>

                            <p className="text-[10px] text-[#736C65] line-clamp-1 mt-0.5">
                              {item.caption}
                            </p>
                          </div>

                          <div className="mt-2 pt-2 border-t border-[#F4EFEB] flex items-center justify-between text-[10px]">
                            <span className="text-[#554E48] truncate pr-2">
                              {item.taggedProductId && item.taggedProductName ? (
                                <>🛍️ {item.taggedProductName}</>
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

          {/* TAB 2: POST EDITOR */}
          {activeTab === 'editor' && (
            <form onSubmit={handleSaveItem} className="space-y-4">
              
              <div className="p-3 bg-[#EAE0D5]/50 border border-[#D5C7BC] rounded-xl flex items-start gap-2.5 text-xs text-[#4A423B]">
                <Sparkles className="w-4 h-4 text-[#8C7A6B] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1C1B1A]">Instagram Journal Entry:</p>
                  <p className="text-[11px] text-[#554E48] mt-0.5 leading-relaxed">
                    Set up your Instagram post with high-resolution imagery, captivating handmade storytelling, and direct links to your product catalog.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Saved to Cloud Firestore and live across all devices!</span>
                </div>
              )}



              {/* Post URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#1C1B1A]">
                    Instagram Post / Reel URL
                  </label>
                  {isAutoGenerating && (
                    <span className="text-[11px] font-medium text-[#C5A880] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Fetching cover photo & caption...</span>
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={postUrl}
                      onChange={(e) => setPostUrl(e.target.value)}
                      placeholder="https://www.instagram.com/p/... or https://www.instagram.com/reel/..."
                      className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-[#1C1B1A] placeholder:text-[#8C7A6B] bg-white border border-[#D5C7BC] rounded-lg focus:outline-hidden focus:border-[#1C1B1A]"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isAutoGenerating || !postUrl.trim()}
                    onClick={() => handleAutoGenerateDetails(postUrl)}
                    className="px-3 py-2 bg-[#1C1B1A] hover:bg-[#34312F] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
                    title="Automatically fetch screenshot, headline, and real Instagram caption"
                  >
                    {isAutoGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                        <span className="hidden sm:inline">Fetching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Auto-Fetch</span>
                      </>
                    )}
                  </button>

                  {postUrl && (
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-white border border-[#D5C7BC] hover:border-[#1C1B1A] rounded-lg text-xs font-semibold text-[#1C1B1A] flex items-center gap-1.5 transition-colors shrink-0"
                      title="Open link in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#8C7A6B]" />
                    </a>
                  )}
                </div>
              </div>

              {/* Title & Author Handle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#1C1B1A]">
                      Journal Headline / Title *
                    </label>
                    <span className="text-[9px] text-[#736C65]">Editable</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Maya Aurelia Pearl Bag • Handcrafted in Nepal"
                    className="w-full px-3 py-2 text-xs font-bold text-[#1C1B1A] placeholder:text-[#8C7A6B] bg-white border border-[#BFAFA2] rounded-lg focus:outline-hidden focus:border-[#1C1B1A] focus:ring-1 focus:ring-[#1C1B1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Author Handle
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@artified_np"
                    className="w-full px-3 py-2 text-xs font-bold text-[#1C1B1A] placeholder:text-[#8C7A6B] bg-white border border-[#BFAFA2] rounded-lg focus:outline-hidden focus:border-[#1C1B1A] focus:ring-1 focus:ring-[#1C1B1A]"
                  />
                </div>
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#1C1B1A]">
                    Story Caption / Excerpt
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePasteCaptionFromClipboard}
                      className="inline-flex items-center gap-1 text-[11px] text-[#1C1B1A] hover:text-[#D4AF37] font-semibold transition-colors cursor-pointer bg-white px-2 py-0.5 rounded border border-[#D5C7BC] shadow-2xs"
                      title="Paste caption copied from Instagram"
                    >
                      <ClipboardPaste className="w-3 h-3 text-[#D4AF37]" />
                      <span>Paste Caption</span>
                    </button>
                    <span className="text-[9px] text-[#736C65]">Editable</span>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Paste or write your story, styling tips, materials, or Instagram caption..."
                  className="w-full px-3 py-2 text-xs font-semibold text-[#1C1B1A] placeholder:text-[#8C7A6B] bg-white border border-[#BFAFA2] rounded-lg focus:outline-hidden focus:border-[#1C1B1A] focus:ring-1 focus:ring-[#1C1B1A] resize-none"
                />
              </div>

              {/* Cover Photo / Artwork */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#1C1B1A]">
                    Cover Photo / Artwork *
                  </label>
                  <span className="text-[10px] text-[#736C65]">Editable</span>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  {/* Photo Preview Box */}
                  <div className="w-24 h-32 rounded-xl border border-[#D5C7BC] overflow-hidden bg-black/5 relative shrink-0 flex items-center justify-center">
                    {thumbnail?.trim() ? (
                      <img
                        src={thumbnail.trim()}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const fallback = getPlayableInstagramCover({ id: 'ig-preview', title: '', caption: '', postUrl, videoUrl, thumbnail: '' });
                          (e.currentTarget as HTMLImageElement).src = fallback;
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#8C7A6B] p-2 text-center">
                        <ImageIcon className="w-6 h-6 mb-1 text-[#C5A880]" />
                        <span className="text-[9px] text-[#A39990]">Upload or Paste</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    {/* Action buttons: Upload and Paste Screenshot */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] border border-[#D5C7BC] hover:border-[#1C1B1A] hover:bg-white rounded-lg text-xs font-medium text-[#1C1B1A] transition-colors shadow-2xs cursor-pointer"
                        title="Paste screenshot directly from clipboard (or press Ctrl+V anywhere)"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Paste Screenshot (Ctrl+V)</span>
                      </button>

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#D5C7BC] hover:border-[#1C1B1A] rounded-lg text-xs font-medium text-[#1C1B1A] cursor-pointer transition-colors shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-[#8C7A6B]" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCustomPhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {clipboardNotice && (
                      <div className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        {clipboardNotice}
                      </div>
                    )}

                    {/* Or Image URL */}
                    <div>
                      <span className="text-[10px] text-[#8C7A6B] block mb-0.5">Or paste direct image URL:</span>
                      <input
                        type="text"
                        value={thumbnail.startsWith('data:') ? '✅ Exact Screenshot loaded into memory' : thumbnail}
                        onChange={(e) => setThumbnail(e.target.value)}
                        placeholder="https://images.unsplash.com/... or image URL"
                        className="w-full px-3 py-1.5 text-xs font-semibold text-[#1C1B1A] placeholder:text-[#8C7A6B] bg-white border border-[#BFAFA2] rounded-lg focus:outline-hidden focus:border-[#1C1B1A]"
                      />
                      {thumbnail && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-emerald-700 font-medium">
                            {thumbnail.startsWith('data:') ? '✨ Exact reel screenshot loaded!' : 'Image URL linked'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setThumbnail('')}
                            className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Source & MP4 File Upload */}
              <div className="p-3 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1B1A]">
                      Reel MP4 Video File / Source
                    </label>
                    <span className="text-[10px] text-[#736C65]">Directly links to physical .mp4 video files</span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#D5C7BC] hover:border-[#1C1B1A] rounded-lg text-xs font-semibold text-[#1C1B1A] cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Upload .mp4 Video</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/*"
                      onChange={handleVideoFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Dropdown to select existing video in public/instagram_videos/ */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#8C7A6B] mb-1">
                    Select video inside public/instagram_videos/:
                  </label>
                  <select
                    value={videoUrl}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      setVideoUrl(selectedVal);
                      const sc = getInstagramShortcode(selectedVal) || selectedVal.replace('/instagram_videos/', '').replace('.mp4', '');
                      if (sc && KNOWN_LOCAL_COVERS[sc] && !thumbnail) {
                        setThumbnail(KNOWN_LOCAL_COVERS[sc]);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-[#1C1B1A] bg-white border border-[#D5C7BC] rounded-lg focus:outline-hidden focus:border-[#1C1B1A]"
                  >
                    <option value="">-- Choose video in public/instagram_videos/ --</option>
                    {availableLocalVideos.map((v) => (
                      <option key={v.path} value={v.path}>
                        🎬 {v.name || v.filename} ({v.path})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Or type/edit path directly */}
                <div>
                  <span className="text-[10px] text-[#8C7A6B] block mb-0.5">Linked video path:</span>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="/instagram_videos/DdjhhazvaRr.mp4 or video URL"
                    className="w-full px-3 py-1.5 text-xs font-semibold text-[#1C1B1A] bg-white border border-[#D5C7BC] rounded-lg focus:outline-hidden focus:border-[#1C1B1A]"
                  />
                </div>

                <p className="text-[10px] text-[#736C65]">
                  Videos are linked directly from <code>public/instagram_videos/</code>. Uploaded MP4 files are physically stored on disk and will play instantly offline or online without remote dependencies.
                </p>
              </div>

              {/* Pro-Tip guidance box */}
              <div className="p-3 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-[11px] text-[#736C65] space-y-1">
                <p className="font-semibold text-[#1C1B1A] flex items-center gap-1">
                  💡 How to guarantee 100% exact caption & cover photo:
                </p>
                <p>
                  1. <strong>Snip Cover</strong>: On Instagram, snip a quick screenshot (Windows: <code>Win+Shift+S</code>, Mac: <code>Cmd+Shift+4</code>), then press <code>Ctrl+V</code> anywhere in this modal.
                </p>
                <p>
                  2. <strong>Copy Caption</strong>: Copy the reel caption on Instagram, then click <strong>"Paste Caption"</strong> above.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E8DFD8]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    setEditingInstagramItem(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#736C65] hover:text-[#1C1B1A] transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#1C1B1A] hover:bg-[#34312F] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{itemId ? 'Update Journal Post' : 'Save & Publish Post'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: REEL DOWNLOADER */}
          {activeTab === 'downloader' && (
            <InstagramReelDownloaderSection onSuccessPublished={() => setActiveTab('list')} />
          )}

          {/* TAB 4: SETTINGS (HANDLE & PROFILE LINK) */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="p-3 bg-gradient-to-r from-[#FAF0E6] to-[#F4EFEB] border border-[#E8DFD8] rounded-xl flex items-start gap-2.5 text-xs text-[#4A423B]">
                <Instagram className="w-4 h-4 text-[#E1306C] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1C1B1A]">Official Instagram Handle & Link:</p>
                  <p className="text-[11px] text-[#554E48] mt-0.5 leading-relaxed">
                    Updating this here will update all links, buttons, and badges across the entire website (headers, footers, showcase bars, and follow buttons).
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Instagram handle and link updated successfully across all devices!</span>
                </div>
              )}

              <div className="space-y-3 bg-white p-4 rounded-xl border border-[#E8DFD8]">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Instagram Handle (Username)
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={globalHandleInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGlobalHandleInput(val);
                        // Auto-fill profile URL if it matches standard Instagram pattern
                        const clean = val.replace('@', '').trim();
                        if (clean) {
                          setGlobalUrlInput(`https://www.instagram.com/${clean}/`);
                        }
                      }}
                      placeholder="@artified_np"
                      className="w-full pl-9 pr-3 py-2 text-xs font-bold text-[#1C1B1A] placeholder:text-[#8C7A6B] bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg focus:outline-hidden focus:border-[#1C1B1A] font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-[#736C65] mt-1">
                    Include '@' (e.g. <code>@artified_np</code>)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Official Instagram Profile Link (URL)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        required
                        value={globalUrlInput}
                        onChange={(e) => setGlobalUrlInput(e.target.value)}
                        placeholder="https://www.instagram.com/artified_np/"
                        className="w-full pl-9 pr-3 py-2 text-xs font-bold text-[#1C1B1A] placeholder:text-[#8C7A6B] bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg focus:outline-hidden focus:border-[#1C1B1A]"
                      />
                    </div>
                    {globalUrlInput && (
                      <a
                        href={globalUrlInput}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 bg-white border border-[#D5C7BC] hover:border-[#1C1B1A] rounded-lg text-xs font-semibold text-[#1C1B1A] flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <span>Test Link</span>
                        <ExternalLink className="w-3 h-3 text-[#8C7A6B]" />
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-[#736C65] mt-1">
                    Direct web URL opened when customers click "Follow on Instagram" or click any post.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E8DFD8]">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-xs font-semibold text-[#736C65] hover:text-[#1C1B1A] transition-colors"
                >
                  Back to Posts List
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#1C1B1A] hover:bg-[#34312F] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Save Handle & Profile Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
