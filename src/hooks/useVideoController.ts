import { useEffect, useRef, useCallback, useState } from 'react';

export interface UseVideoControllerOptions {
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
}

export function useVideoController(options: UseVideoControllerOptions = {}) {
  const {
    autoPlay = true,
    muted = true,
    loop = true,
    playsInline = true
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(muted);

  // Strictly enforce browser autoplay policy compliance
  const applyPolicies = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = muted;
    video.defaultMuted = muted;
    if (muted) {
      video.setAttribute('muted', '');
    } else {
      video.removeAttribute('muted');
    }

    video.loop = loop;
    video.playsInline = playsInline;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
  }, [muted, loop, playsInline]);

  // Robust play implementation complying with browser playback policies
  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure muted is properly configured for autoplay compliance
    video.muted = muted;
    video.defaultMuted = muted;
    if (muted) {
      video.setAttribute('muted', '');
    } else {
      video.removeAttribute('muted');
    }

    try {
      await video.play();
      setIsPlaying(true);
    } catch {
      // Browser blocked unmuted autoplay: enforce muted policy and retry
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute('muted', '');
      setIsAudioMuted(true);
      try {
        await video.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  }, [muted]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
    }
  }, []);

  // Sync muted state dynamically whenever muted prop changes
  useEffect(() => {
    setIsAudioMuted(muted);
    const video = videoRef.current;
    if (video) {
      video.muted = muted;
      video.defaultMuted = muted;
      if (muted) {
        video.setAttribute('muted', '');
      } else {
        video.removeAttribute('muted');
      }
    }
  }, [muted]);

  // Handle initialization and automatic playback with event listeners for delayed buffering (e.g. 4th video)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    applyPolicies();

    const handleCanPlay = () => {
      if (autoPlay && video.paused) {
        play();
      }
    };

    const handlePlayState = () => setIsPlaying(true);
    const handlePauseState = () => setIsPlaying(false);

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleCanPlay);
    video.addEventListener('loadedmetadata', handleCanPlay);
    video.addEventListener('play', handlePlayState);
    video.addEventListener('pause', handlePauseState);

    if (autoPlay) {
      play();
    } else {
      pause();
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleCanPlay);
      video.removeEventListener('loadedmetadata', handleCanPlay);
      video.removeEventListener('play', handlePlayState);
      video.removeEventListener('pause', handlePauseState);
    };
  }, [autoPlay, applyPolicies, play, pause]);

  return {
    videoRef,
    play,
    pause,
    seek,
    isPlaying,
    isAudioMuted
  };
}

