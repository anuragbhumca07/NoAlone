import AvatarView from './AvatarView';
import {
  ACCESSORIES,
  BG_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  OUTFIT_STYLES,
  SKIN_TONES,
  type AvatarConfig,
  type AvatarGender,
} from '../avatar';

function Swatches({ colors, value, onChange, testidPrefix }: { colors: string[]; value: string; onChange: (c: string) => void; testidPrefix: string }) {
  return (
    <div className="swatch-row">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className={`swatch${value === c ? ' selected' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          data-testid={`${testidPrefix}-${c.replace('#', '')}`}
          aria-label={c}
        />
      ))}
    </div>
  );
}

function Options<T extends string>({ options, value, onChange, testidPrefix, labels }: { options: T[]; value: T; onChange: (o: T) => void; testidPrefix: string; labels?: Record<string, string> }) {
  return (
    <div className="option-row">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`option-btn${value === o ? ' selected' : ''}`}
          onClick={() => onChange(o)}
          data-testid={`${testidPrefix}-${o}`}
        >
          {labels?.[o] || o}
        </button>
      ))}
    </div>
  );
}

export default function AvatarBuilder({
  config,
  onChange,
  size = 'xl',
}: {
  config: AvatarConfig;
  onChange: (next: AvatarConfig) => void;
  size?: 'lg' | 'xl';
}) {
  const set = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => onChange({ ...config, [key]: value });

  return (
    <div className="avatar-builder" data-testid="avatar-builder">
      <div className="avatar-builder-preview">
        <div className={`avatar ${size}`} data-testid="avatar-preview">
          <AvatarView config={config} />
        </div>
      </div>

      <div style={{ minWidth: 260 }}>
        <label>Gender presentation</label>
        <Options<AvatarGender>
          options={['GIRL', 'BOY']}
          value={config.gender}
          onChange={(g) => set('gender', g)}
          testidPrefix="avatar-gender"
          labels={{ GIRL: 'Girl', BOY: 'Boy' }}
        />

        <label>Skin tone</label>
        <Swatches colors={SKIN_TONES} value={config.skinTone} onChange={(c) => set('skinTone', c)} testidPrefix="avatar-skin" />

        <label>Hairstyle</label>
        <Options options={HAIR_STYLES} value={config.hairStyle} onChange={(h) => set('hairStyle', h)} testidPrefix="avatar-hair-style" />

        <label>Hair color</label>
        <Swatches colors={HAIR_COLORS} value={config.hairColor} onChange={(c) => set('hairColor', c)} testidPrefix="avatar-hair-color" />

        <label>Outfit</label>
        <Options options={OUTFIT_STYLES} value={config.outfitStyle} onChange={(o) => set('outfitStyle', o)} testidPrefix="avatar-outfit-style" />

        <label>Outfit color</label>
        <Swatches colors={OUTFIT_COLORS} value={config.outfitColor} onChange={(c) => set('outfitColor', c)} testidPrefix="avatar-outfit-color" />

        <label>Accessory</label>
        <Options options={ACCESSORIES} value={config.accessory} onChange={(a) => set('accessory', a)} testidPrefix="avatar-accessory" />

        <label>Background</label>
        <Swatches colors={BG_COLORS} value={config.bgColor} onChange={(c) => set('bgColor', c)} testidPrefix="avatar-bg" />
      </div>
    </div>
  );
}
