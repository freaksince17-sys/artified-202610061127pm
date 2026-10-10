import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  RefreshCw, 
  Sparkles, 
  Video, 
  Camera, 
  Check, 
  AlertCircle,
  FileCheck,
  Zap
} from 'lucide-react';
import { WorkshopMediaItem } from '../types';
import { uploadSingleFileFast, compressImageToBlob, extractVideoMetadata } from '../utils/fastMediaUploader';
import { saveWorkshopMediaItem, ALL_WORKSHOP_FOLDER_ASSETS } from '../data/workshops';
import { isVideoMedia, getStandardMimeType } from '../services/firebaseWorkshopStorageService';

interface ReplaceMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: WorkshopMediaItem | null;
  onItemReplaced: (updatedItem: WorkshopMediaItem) => void;
}

export const ReplaceMediaModal: React.FC<ReplaceMediaModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  onItemReplaced
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [craftTechnique, setCraftTechnique] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (targetItem && isOpen) {
      setTitle(targetItem.title);
      setCaption(targetItem.caption || '');
      setCraftTechnique(targetItem.craftTechnique || '');
      setPreviewUrl(targetItem.url);
      setFile(null);
      setErrorMsg(null);
      setProgressStatus(null);
    }
  }, [targetItem, isOpen]);

  if (!isOpen || !targetItem) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;

    setFile(picked);
    const objUrl = URL.createObjectURL(picked);
    setPreviewUrl(objUrl);

    // Fast pre-fill
    if (!title || title === targetItem.title) {
      setTitle(`Updated: ${picked.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')}`);
    }
  };

  const handleSaveReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !previewUrl) {
      setErrorMsg('Please select a replacement photo or video file.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setProgressStatus('Optimizing media & uploading to permanent cloud storage...');

    try {
      let finalUrl = targetItem.url;
      let finalThumbnail = targetItem.thumbnailUrl || targetItem.url;
      let duration = targetItem.duration;
      let isVideo = isVideoMedia(targetItem.url, targetItem.title);

      const targetGroupKey = (targetItem.groupId || 'macrame').toLowerCase();
      const destFolder = targetGroupKey.includes('sunflower') || targetGroupKey.includes('pipe') ? 'Pipecleaner Sunflower' : targetGroupKey.includes('pearl') ? 'Pearls' : 'Macrame';

      if (file) {
        isVideo = isVideoMedia(file, file.name);
        if (isVideo) {
          const meta = await extractVideoMetadata(file);
          if (meta.duration) duration = meta.duration;
          const uploadedVidUrl = await uploadSingleFileFast(
            file,
            file.name,
            getStandardMimeType(file, file.name),
            previewUrl,
            undefined,
            destFolder,
            targetGroupKey
          );
          finalUrl = uploadedVidUrl;
          if (meta.thumbnailBlob) {
            finalThumbnail = await uploadSingleFileFast(
              meta.thumbnailBlob,
              `thumb_${file.name}.jpg`,
              'image/jpeg',
              meta.thumbnailUrl,
              undefined,
              destFolder,
              targetGroupKey
            );
          } else {
            finalThumbnail = meta.thumbnailUrl;
          }
        } else {
          const compressed = await compressImageToBlob(file);
          const uploadedImgUrl = await uploadSingleFileFast(
            compressed.blob,
            file.name,
            'image/jpeg',
            compressed.dataUrl,
            undefined,
            destFolder,
            targetGroupKey
          );
          finalUrl = uploadedImgUrl;
          finalThumbnail = uploadedImgUrl;
        }
      }

      const updatedItem: WorkshopMediaItem = {
        ...targetItem,
        type: isVideo ? 'video' : 'image',
        url: finalUrl,
        thumbnailUrl: finalThumbnail,
        title: title.trim() || targetItem.title,
        caption: caption.trim() || targetItem.caption,
        craftTechnique: craftTechnique.trim() || targetItem.craftTechnique,
        duration: duration || targetItem.duration
      };

      await saveWorkshopMediaItem(updatedItem);
      onItemReplaced(updatedItem);
      setProgressStatus('Replacement complete!');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Failed to replace media item:', err);
      setErrorMsg(err?.message || 'Failed to replace media. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-[#FAF8F5] dark:bg-[#181615] rounded-3xl shadow-2xl border border-[#C5A880]/30 overflow-hidden text-[#1C1B1A] dark:text-[#F5F2EB]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8DFD8] dark:border-white/10 bg-white dark:bg-[#1E1C1A]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#C5A880]/15 text-[#C5A880]">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold">
                Replace Workshop Media
              </h3>
              <p className="text-xs text-[#7A746E] dark:text-[#A8A29D]">
                Swap photo/video while keeping masterclass links intact
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A746E] hover:text-[#1C1B1A] dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSaveReplacement} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Media Picker / Dropzone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#7A746E] dark:text-[#A8A29D] mb-1.5">
              Select New Photo or Video File
            </label>
            <input 
              type="file"
              ref={fileInputRef}
              accept="image/*,video/mp4,video/quicktime,video/webm"
              onChange={handleFileChange}
              className="hidden"
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-[#C5A880]/40 hover:border-[#C5A880] rounded-2xl p-4 text-center cursor-pointer transition-all bg-white dark:bg-[#1E1C1A]"
            >
              {previewUrl ? (
                <div className="flex flex-col items-center">
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black flex items-center justify-center mb-2">
                    {file?.type.startsWith('video/') || targetItem.type === 'video' ? (
                      <video src={previewUrl} className="absolute inset-0 w-full h-full object-cover" muted controls={false} />
                    ) : (
                      <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-[#C5A880] flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{file ? file.name : 'Current media (Click to replace file)'}</span>
                  </span>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center">
                  <Upload className="w-8 h-8 text-[#C5A880] mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">Click to choose replacement photo or video</span>
                  <span className="text-[11px] text-[#7A746E] dark:text-[#A8A29D] mt-1">Supports MP4, MOV, JPEG, WebP</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Picker from Workshops Folder */}
          <div className="p-3 rounded-2xl bg-white dark:bg-[#1E1C1A] border border-[#E8DFD8] dark:border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs text-[#1C1B1A] dark:text-white flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Or Select from Workshop Folder Videos & Photos</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {ALL_WORKSHOP_FOLDER_ASSETS.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(asset.url);
                    setTitle(asset.title);
                    setCaption(asset.description);
                    setCraftTechnique(asset.suggestedCraftTechnique);
                  }}
                  className={`flex items-center gap-2 p-1.5 rounded-xl text-left transition-all cursor-pointer border ${
                    previewUrl === asset.url
                      ? 'bg-[#C5A880]/20 border-[#C5A880] text-[#1C1B1A] dark:text-white'
                      : 'bg-[#FAF8F5] dark:bg-[#141312] border-transparent hover:border-[#C5A880]/40 text-[#7A746E] dark:text-[#A8A29D]'
                  }`}
                >
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.name}
                    className="w-8 h-8 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold truncate leading-tight">
                      {asset.name}
                    </p>
                    <p className="text-[9px] opacity-75 truncate">
                      {asset.type === 'video' ? `Video (${asset.duration || '0:30'})` : 'Photo'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title & Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#7A746E] dark:text-[#A8A29D] mb-1">
              Title
            </label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1C1A] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
              placeholder="e.g. Spiral Knot Demonstration"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#7A746E] dark:text-[#A8A29D] mb-1">
              Craft Technique
            </label>
            <input 
              type="text"
              value={craftTechnique}
              onChange={(e) => setCraftTechnique(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1C1A] border border-[#E8DFD8] dark:border-white/10 text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
              placeholder="e.g. Cord Tensioning & Knotting"
            />
          </div>

          {progressStatus && (
            <div className="p-2.5 rounded-xl bg-[#C5A880]/15 text-xs text-[#A38253] dark:text-[#E6CA9E] flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{progressStatus}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8DFD8] dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7A746E] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#C5A880] hover:bg-[#B39366] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isUploading ? 'Replacing...' : 'Confirm Replace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
