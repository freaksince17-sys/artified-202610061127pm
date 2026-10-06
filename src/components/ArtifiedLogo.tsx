import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface ArtifiedLogoProps {
  className?: string;
  variant?: 'auto' | 'dark' | 'light' | 'gold';
  showTagline?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showEmblem?: boolean;
}

export const ArtifiedLogo: React.FC<ArtifiedLogoProps> = ({
  className = '',
  variant = 'auto',
  showTagline = true,
  size = 'md',
  showEmblem = false
}) => {
  const { isDarkMode } = useTheme();

  // Resolve effective variant if 'auto'
  const resolvedVariant = 
    variant === 'auto'
      ? (isDarkMode ? 'light' : 'dark')
      : variant;

  // High-contrast Theme colors
  const primaryTextColor = 
    resolvedVariant === 'light' 
      ? '#FFFFFF' 
      : resolvedVariant === 'gold' 
      ? '#D4AF37' 
      : '#0D0C0B';

  const taglineColor = '#D4AF37';

  const goldAccentColor =
    resolvedVariant === 'light'
      ? '#F59E0B'
      : resolvedVariant === 'gold'
      ? '#D4AF37'
      : '#C5A880';

  // Responsive height map for balanced, elegant logo presentation
  const sizeMap = {
    xs: 'h-7 sm:h-8',
    sm: 'h-8.5 sm:h-9.5',
    md: 'h-11 sm:h-12.5 md:h-13.5',
    lg: 'h-14 sm:h-16 md:h-18',
    xl: 'h-20 sm:h-24'
  };

  const idSuffix = `${resolvedVariant}-${size}-${isDarkMode ? 'dark' : 'light'}`;

  return (
    <div className={`inline-flex flex-col select-none transition-transform duration-200 group ${className}`}>
      <svg
        viewBox="0 0 520 148"
        className={`w-auto max-w-full ${sizeMap[size]} overflow-visible drop-shadow-2xs`}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Artified_np - Handcrafted Elegance Nepal"
      >
        <defs>
          {/* Handcrafted brush texture filter */}
          <filter id={`brush-filter-${idSuffix}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={resolvedVariant === 'light' ? 0.8 : 1.2} xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* Natural Pearl Luster Radial Gradient */}
          <radialGradient id={`pearl-shimmer-${idSuffix}`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="35%" stopColor="#FFF9F2" stopOpacity="1" />
            <stop offset="70%" stopColor="#EFE4D6" stopOpacity="1" />
            <stop offset="90%" stopColor="#DFCDB8" stopOpacity="1" />
            <stop offset="100%" stopColor="#C4B097" stopOpacity="1" />
          </radialGradient>

          {/* Pearl highlight gloss */}
          <linearGradient id={`pearl-gloss-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Soft shadow for pearls */}
          <filter id={`pearl-shadow-${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000000" floodOpacity={resolvedVariant === 'light' ? 0.4 : 0.18} />
          </filter>
        </defs>

        {/* ============================================================== */}
        {/* WORDMARK: "ARTIFIED" (ICONIC ORIGINAL CALLIGRAPHIC BRUSHWORK)  */}
        {/* ============================================================== */}
        <g 
          fill={primaryTextColor} 
          filter={`url(#brush-filter-${idSuffix})`}
          style={resolvedVariant === 'light' ? { filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' } : undefined}
        >
          
          {/* Letter 'A' */}
          <path d="M 52 14 C 47 18 36 48 24 82 C 21 91 19 96 17 99 C 15 101 19 103 24 100 C 27 98 32 86 35 77 C 38 68 47 43 51 28 C 53 23 54 18 52 14 Z" />
          <path d="M 50 14 C 54 13 60 17 64 26 C 70 41 81 72 87 88 C 90 96 93 100 95 101 C 98 102 96 97 93 90 C 86 73 75 42 66 23 C 61 14 55 12 50 14 Z" />
          <path d="M 48 11 C 51 9 58 11 58 15 C 57 19 50 20 46 17 C 45 14 46 12 48 11 Z" />
          <path d="M 12 73 C 14 69 22 69 35 69 C 48 69 66 69 76 68 C 80 68 83 71 80 74 C 77 76 68 76 54 75 C 38 75 22 76 14 77 C 10 77 9 75 12 73 Z" />

          {/* Letter 'R' */}
          <path d="M 112 18 C 108 17 106 24 106 38 C 106 58 106 79 107 93 C 107 98 111 99 114 96 C 117 93 118 84 118 69 C 118 49 118 28 116 20 C 115 17 114 18 112 18 Z" />
          <path d="M 103 22 C 105 16 114 14 122 15 C 133 16 137 17 132 20 C 124 21 113 22 103 22 Z" />
          <path d="M 114 16 C 128 14 148 15 158 24 C 166 31 166 43 158 51 C 148 59 133 60 116 59 C 113 59 113 54 116 54 C 129 54 144 53 151 47 C 156 42 156 34 150 29 C 143 23 129 22 115 22 C 112 22 112 17 114 16 Z" />
          <path d="M 134 56 C 137 54 143 59 149 68 C 156 79 164 91 169 96 C 172 99 174 100 171 102 C 167 103 162 98 157 91 C 150 81 142 69 135 60 C 132 57 132 57 134 56 Z" />

          {/* Letter 'T' */}
          <path d="M 182 18 C 180 14 188 13 205 13 C 224 13 245 14 256 16 C 261 17 261 21 256 22 C 243 22 225 21 206 21 C 193 21 184 21 182 18 Z" />
          <path d="M 178 19 C 182 15 192 14 189 20 C 187 23 182 23 178 19 Z" />
          <path d="M 218 17 C 223 17 225 22 225 35 C 225 54 224 78 223 93 C 223 98 219 99 216 97 C 213 94 213 85 213 69 C 213 49 214 26 216 19 C 217 17 217 17 218 17 Z" />

          {/* Letter 'I' (first) */}
          <path d="M 276 18 C 281 17 284 21 284 34 C 284 53 283 77 282 92 C 282 97 278 98 275 96 C 272 93 272 84 272 68 C 272 48 273 26 275 19 C 275 17 276 17 276 18 Z" />
          <path d="M 271 20 C 274 15 281 14 286 16 C 288 18 284 21 278 22 C 274 23 271 22 271 20 Z" />

          {/* Letter 'F' */}
          <path d="M 307 18 C 312 17 314 22 314 36 C 314 55 313 78 312 93 C 312 98 308 99 305 96 C 302 93 302 84 302 68 C 302 48 303 26 305 19 C 306 17 307 17 307 18 Z" />
          <path d="M 308 17 C 316 15 334 15 348 16 C 354 17 355 21 350 22 C 339 23 324 22 311 22 C 307 22 306 19 308 17 Z" />
          <path d="M 309 51 C 317 49 330 49 341 50 C 346 51 346 55 342 56 C 333 57 322 56 311 56 C 307 56 307 53 309 51 Z" />

          {/* Letter 'I' (second) */}
          <path d="M 374 18 C 379 17 382 21 382 34 C 382 53 381 77 380 92 C 380 97 376 98 373 96 C 370 93 370 84 370 68 C 370 48 371 26 373 19 C 373 17 374 17 374 18 Z" />

          {/* Letter 'E' */}
          <path d="M 404 18 C 409 17 411 22 411 36 C 411 55 410 78 409 93 C 409 98 405 99 402 96 C 399 93 399 84 399 68 C 399 48 400 26 402 19 C 403 17 404 17 404 18 Z" />
          <path d="M 405 17 C 414 15 431 15 444 16 C 449 17 449 21 445 22 C 435 23 421 22 408 22 C 404 22 403 19 405 17 Z" />
          <path d="M 406 52 C 414 50 425 50 435 51 C 439 52 439 56 435 57 C 427 58 418 57 408 57 C 404 57 404 54 406 52 Z" />
          <path d="M 403 91 C 412 90 429 89 444 91 C 449 92 449 96 444 97 C 431 98 416 97 404 96 C 401 96 401 93 403 91 Z" />

          {/* Letter 'D' */}
          <path d="M 466 18 C 471 17 473 22 473 36 C 473 55 472 78 471 93 C 471 98 467 99 464 96 C 461 93 461 84 461 68 C 461 48 462 26 464 19 C 465 17 466 17 466 18 Z" />
          <path d="M 467 16 C 485 14 509 20 514 43 C 518 63 510 88 488 95 C 478 98 468 97 466 94 C 465 91 468 89 473 88 C 493 84 503 66 501 49 C 498 33 483 23 469 22 C 465 22 465 18 467 16 Z" />
        </g>

        {/* ============================================================== */}
        {/* SUBTLE HANDCRAFTED ACCENTS: PEARL LUSTER ON 'A' & 'I's        */}
        {/* ============================================================== */}
        <g filter={`url(#pearl-shadow-${idSuffix})`}>
          {/* Micro Pearl on 'A' crossbar */}
          <circle cx="53" cy="72" r="3.2" fill={`url(#pearl-shimmer-${idSuffix})`} />
          <ellipse cx="52" cy="70.8" rx="1.2" ry="0.7" fill={`url(#pearl-gloss-${idSuffix})`} />

          {/* Micro Pearl highlight on first 'I' */}
          <circle cx="278" cy="16" r="3.6" fill={`url(#pearl-shimmer-${idSuffix})`} />
          <ellipse cx="277" cy="14.8" rx="1.3" ry="0.8" fill={`url(#pearl-gloss-${idSuffix})`} />

          {/* Micro Pearl highlight on second 'I' */}
          <circle cx="376" cy="16" r="3.6" fill={`url(#pearl-shimmer-${idSuffix})`} />
          <ellipse cx="375" cy="14.8" rx="1.3" ry="0.8" fill={`url(#pearl-gloss-${idSuffix})`} />
        </g>

        {/* Optional Hallmark Macrame Loop on left when requested */}
        {showEmblem && (
          <g transform="translate(10, 118)" opacity="0.8">
            <path
              d="M 0 0 C 8 -6, 18 -6, 26 0 C 18 6, 8 6, 0 0 Z"
              fill="none"
              stroke={goldAccentColor}
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* ============================================================== */}
        {/* TAGLINE: "(Art made with love)" (HIGH VISIBILITY & CONTRAST)  */}
        {/* ============================================================== */}
        {showTagline && (
          <text
            x="514"
            y="139"
            textAnchor="end"
            fill={taglineColor}
            style={{
              fontFamily: '"Playfair Display", Georgia, serif, system-ui',
              fontSize: '36px',
              fontWeight: 700,
              fontStyle: 'italic',
              letterSpacing: '0.6px',
              filter: resolvedVariant === 'light' ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' : undefined
            }}
          >
            -Art made with love
          </text>
        )}
      </svg>
    </div>
  );
};
