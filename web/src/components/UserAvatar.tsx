import AvatarView from './AvatarView';
import type { AvatarConfig } from '../avatar';

export default function UserAvatar({
  name,
  avatarConfig,
  size,
  testId,
}: {
  name?: string | null;
  avatarConfig?: AvatarConfig | null;
  size?: 'lg' | 'xl';
  testId?: string;
}) {
  return (
    <div className={`avatar${size ? ` ${size}` : ''}`} data-testid={testId}>
      {avatarConfig ? <AvatarView config={avatarConfig} /> : (name || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}
