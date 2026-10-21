// Static workshop media fallbacks pointing to local high-speed assets
export const WORKSHOP_EMBEDDED_FALLBACKS: Record<string, string> = {
  "/workshops/Macrame/macrame_desk.jpg": "/workshops/Macrame/macrame_desk_thumb.jpg",
  "/workshops/Macrame/macrame_student.jpeg": "/workshops/Macrame/macrame_student_thumb.jpg",
  "/workshops/Macrame/macrame_group.jpeg": "/workshops/Macrame/macrame_group_thumb.jpg",
  "/workshops/Macrame/macrame_cloud.mp4": "/workshops/Macrame/macrame_cloud_thumb.jpg",
  "/workshops/Macrame/macrame_me_teaching.mp4": "/workshops/Macrame/macrame_me_teaching_thumb.jpg",
  "/workshops/Macrame/macrame_pot.mp4": "/workshops/Macrame/macrame_pot_thumb.jpg",
  "/workshops/Macrame/macrame_pot_teaching.mp4": "/workshops/Macrame/macrame_pot_teaching_thumb.jpg",
  "/workshops/Macrame/macrame_snap.mp4": "/workshops/Macrame/macrame_snap_thumb.jpg",
  "/workshops/Pipecleaner Sunflower/pipe_sunflower_video.mp4": "/workshops/Pipecleaner Sunflower/pipe_sunflower_video_thumb.jpg",
  "/workshops/Pipecleaner Sunflower/pipe_sunflower_group_photo.jpeg": "/workshops/Pipecleaner Sunflower/pipe_sunflower_group_photo_thumb.jpg",
  "/workshops/Pipecleaner Sunflower/pipe_sunflower_portrait_group.jpeg": "/workshops/Pipecleaner Sunflower/pipe_sunflower_portrait_group_thumb.jpg",
  "/workshops/Pipecleaner Sunflower/pipe_sunflower_portrait.jpeg": "/workshops/Pipecleaner Sunflower/pipe_sunflower_portrait_thumb.jpg",
  "/workshops/Pipecleaner Sunflower/pipe_sunflower_table.jpeg": "/workshops/Pipecleaner Sunflower/pipe_sunflower_table_thumb.jpg",
  "/workshops/Pipecleaner Sunflower/pipe_sunflower_training.jpeg": "/workshops/Pipecleaner Sunflower/pipe_sunflower_training_thumb.jpg",
  "/workshops/Pearls/pearl_bag_05_1791990522616.mp4": "/workshops/Pearls/pearl_bag_05_thumb.jpg",
  "/workshops/Pearls/pearl_bag_23_1791990557260.mp4": "/workshops/Pearls/pearl_bag_23_thumb.jpg"
};

export function getWorkshopEmbeddedFallback(urlOrPath?: string): string | null {
  if (!urlOrPath) return null;
  const cleanUrl = urlOrPath.trim();
  if (WORKSHOP_EMBEDDED_FALLBACKS[cleanUrl]) {
    return WORKSHOP_EMBEDDED_FALLBACKS[cleanUrl];
  }
  const filename = cleanUrl.replace(/\?.*$/, "").replace(/^.*\//, "");
  if (WORKSHOP_EMBEDDED_FALLBACKS[filename]) {
    return WORKSHOP_EMBEDDED_FALLBACKS[filename];
  }
  let decodedFilename = filename;
  try {
    const decoded = decodeURIComponent(cleanUrl);
    if (WORKSHOP_EMBEDDED_FALLBACKS[decoded]) {
      return WORKSHOP_EMBEDDED_FALLBACKS[decoded];
    }
  } catch {}
  try {
    decodedFilename = decodeURIComponent(filename);
    if (WORKSHOP_EMBEDDED_FALLBACKS[decodedFilename]) {
      return WORKSHOP_EMBEDDED_FALLBACKS[decodedFilename];
    }
  } catch {}

  // Check matching by base filename
  for (const [key, val] of Object.entries(WORKSHOP_EMBEDDED_FALLBACKS)) {
    if (key.endsWith(filename) || (decodedFilename && key.endsWith(decodedFilename))) {
      return val;
    }
  }

  return null;
}
