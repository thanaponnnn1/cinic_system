import type { GalleryTileInput } from '../src/content/schema.ts';
import type { ImageId } from './images.ts';

/** ลำดับในไฟล์คือลำดับบนหน้าแกลเลอรี alt อยู่ที่ images.ts */
type Tile = Omit<GalleryTileInput, 'image'> & { image: ImageId };

export const gallery = [
  { image: 'hero-lounge', category: 'space' },
  { image: 'space-treatment-room', category: 'space' },
  { image: 'lounge-arch-niche', category: 'space' },
  { image: 'space-twin-room', category: 'space' },
  { image: 'space-pedicure-lounge', category: 'space' },
  { image: 'treatment-room-vanity', category: 'space' },
  { image: 'space-hair-studio', category: 'space' },
  { image: 'lounge-candle-table', category: 'space' },
  { image: 'twin-room-candles', category: 'space' },
  { image: 'space-counter', category: 'space' },
  { image: 'treatment-room-bed', category: 'space' },
  { image: 'facial-treatment', category: 'face' },
  { image: 'facial-cleansing', category: 'face' },
  { image: 'eye-care', category: 'face' },
  { image: 'facial-treatment-tray', category: 'face' },
  { image: 'facial-cleansing-hands', category: 'face' },
  { image: 'face-massage', category: 'face' },
  { image: 'eye-care-tray', category: 'face' },
  { image: 'facial-treatment-therapist', category: 'face' },
  { image: 'eye-care-mask', category: 'face' },
  { image: 'hair-treatment', category: 'hair' },
  { image: 'haircut', category: 'hair' },
  { image: 'wash-blowdry', category: 'hair' },
  { image: 'hair-treatment-wash', category: 'hair' },
  { image: 'haircut-scissors', category: 'hair' },
  { image: 'hair-styling', category: 'hair' },
  { image: 'haircut-client', category: 'hair' },
  { image: 'hair-studio-chair', category: 'hair' },
  { image: 'styling-shelves', category: 'hair' },
  { image: 'staff-nan', category: 'team' },
  { image: 'facial-cleansing-therapist', category: 'team' },
  { image: 'staff-best', category: 'team' },
  { image: 'staff-fah', category: 'team' },
  { image: 'hair-studio-bed', category: 'space' },
] satisfies Tile[];
