import { InstagramJournalItem } from '../types';

export const sanitizeInstagramItemsList = (items: InstagramJournalItem[]): InstagramJournalItem[] => {
  if (!Array.isArray(items)) return [];

  const signatureVideos = [
    '/instagram_videos/DdMRgKdP4HK.mp4',
    '/instagram_videos/DdjhhazvaRr.mp4',
    '/instagram_videos/DdMRgKdP4HK.mp4',
    '/instagram_videos/DdIUMC4BqFr.mp4',
    '/instagram_videos/DY6OqqfPyJu.mp4'
  ];

  return items.map((item, idx) => {
    const text = (
      (item.title || '') + ' ' + 
      (item.caption || '') + ' ' + 
      (item.postUrl || '') + ' ' + 
      (item.thumbnail || '')
    ).toLowerCase();

    let cleanVideo = item.videoUrl?.trim() || '';

    // If video is wrongly set to DdjhhazvaRr on a macrame, kalashala, or bag post, self-heal it
    const isGenericDdj = !cleanVideo || cleanVideo === '/instagram_videos/DdjhhazvaRr.mp4';

    if (text.includes('macrame') || text.includes('workshop')) {
      cleanVideo = '/instagram_videos/DdMRgKdP4HK.mp4';
    } else if (text.includes('kalashala')) {
      cleanVideo = '/instagram_videos/DdIUMC4BqFr.mp4';
    } else if (text.includes('tote') || text.includes('bag') || text.includes('clutch') || text.includes('maya')) {
      cleanVideo = '/instagram_videos/DY6OqqfPyJu.mp4';
    } else if (text.includes('tourmaline') || text.includes('gemstone') || text.includes('necklace') || text.includes('choker')) {
      cleanVideo = '/instagram_videos/DdjhhazvaRr.mp4';
    } else if (isGenericDdj) {
      cleanVideo = signatureVideos[idx % signatureVideos.length];
    }

    return {
      ...item,
      videoUrl: cleanVideo
    };
  });
};
