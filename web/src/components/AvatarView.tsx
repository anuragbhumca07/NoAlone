import type { AvatarConfig } from '../avatar';

// A small stylized "sticker" avatar — deliberately simple (flat shapes, no
// photorealism) so it stays cute and fast to render regardless of config.
export default function AvatarView({ config }: { config: AvatarConfig }) {
  const { gender, skinTone, hairStyle, hairColor, outfitStyle, outfitColor, accessory, bgColor } = config;

  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill={bgColor} />

      {/* torso / outfit */}
      {outfitStyle === 'dress' ? (
        <path d="M32 100 L38 62 Q50 68 62 62 L68 100 Z" fill={outfitColor} />
      ) : outfitStyle === 'hoodie' ? (
        <path d="M26 100 L33 58 Q50 68 67 58 L74 100 Z" fill={outfitColor} />
      ) : outfitStyle === 'jacket' ? (
        <>
          <path d="M28 100 L35 60 Q50 68 65 60 L72 100 Z" fill={outfitColor} />
          <rect x="47" y="60" width="6" height="40" fill="rgba(255,255,255,0.35)" />
        </>
      ) : (
        <path d="M30 100 L36 60 Q50 67 64 60 L70 100 Z" fill={outfitColor} />
      )}

      {/* neck */}
      <rect x="43" y="52" width="14" height="14" fill={skinTone} />

      {/* head */}
      <circle cx="50" cy="40" r="22" fill={skinTone} />

      {/* ears */}
      <circle cx="28" cy="40" r="4" fill={skinTone} />
      <circle cx="72" cy="40" r="4" fill={skinTone} />

      {/* hair (back layers, behind face — long/ponytail) */}
      {hairStyle === 'long' && <path d="M26 40 Q24 70 32 80 L34 44 Q50 30 66 44 L68 80 Q76 70 74 40 Q74 16 50 16 Q26 16 26 40 Z" fill={hairColor} />}
      {hairStyle === 'ponytail' && (
        <>
          <path d="M74 40 Q84 46 78 62 Q74 56 70 50 Z" fill={hairColor} />
          <path d="M28 40 Q26 20 50 18 Q74 20 72 40 Q64 26 50 26 Q36 26 28 40 Z" fill={hairColor} />
        </>
      )}

      {/* eyes */}
      <circle cx="42" cy="40" r="2.6" fill="#2a2438" />
      <circle cx="58" cy="40" r="2.6" fill="#2a2438" />

      {/* smile */}
      <path d="M42 48 Q50 54 58 48" stroke="#2a2438" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* cheeks */}
      <circle cx="36" cy="45" r="3" fill="#ff9db3" opacity="0.4" />
      <circle cx="64" cy="45" r="3" fill="#ff9db3" opacity="0.4" />

      {/* hair (front layers, on top of forehead) */}
      {hairStyle === 'short' && <path d="M28 38 Q26 16 50 16 Q74 16 72 38 Q68 24 50 24 Q32 24 28 38 Z" fill={hairColor} />}
      {hairStyle === 'buzz' && <path d="M29 34 Q28 18 50 18 Q72 18 71 34 Q68 26 50 26 Q32 26 29 34 Z" fill={hairColor} />}
      {hairStyle === 'curly' && (
        <>
          <circle cx="32" cy="26" r="7" fill={hairColor} />
          <circle cx="42" cy="20" r="8" fill={hairColor} />
          <circle cx="52" cy="18" r="8" fill={hairColor} />
          <circle cx="62" cy="20" r="8" fill={hairColor} />
          <circle cx="70" cy="27" r="7" fill={hairColor} />
        </>
      )}
      {hairStyle === 'long' && <path d="M28 36 Q26 16 50 16 Q74 16 72 36 Q68 22 50 22 Q32 22 28 36 Z" fill={hairColor} />}
      {hairStyle === 'ponytail' && <path d="M28 36 Q26 18 50 18 Q74 18 72 36 Q68 24 50 24 Q32 24 28 36 Z" fill={hairColor} />}

      {/* accessories */}
      {accessory === 'glasses' && (
        <g stroke="#2a2438" strokeWidth="1.6" fill="rgba(255,255,255,0.08)">
          <circle cx="42" cy="40" r="6" />
          <circle cx="58" cy="40" r="6" />
          <line x1="48" y1="40" x2="52" y2="40" />
        </g>
      )}
      {accessory === 'earrings' && (
        <>
          <circle cx="28" cy="46" r="1.8" fill="#ffd54a" />
          <circle cx="72" cy="46" r="1.8" fill="#ffd54a" />
        </>
      )}
      {accessory === 'cap' && (
        <>
          <path d="M27 32 Q28 14 50 14 Q72 14 73 32 Q62 26 50 26 Q38 26 27 32 Z" fill={outfitColor} />
          <ellipse cx="66" cy="30" rx="14" ry="4" fill={outfitColor} />
        </>
      )}
    </svg>
  );
}
