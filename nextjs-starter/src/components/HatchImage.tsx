import type { HatchFeatures } from './types';
import { imgSrc } from '@/lib/features';

interface Props {
  features?: HatchFeatures | null;
  src: string | null | undefined;
  alt?: string;
  width?: number;
  height?: number;
  format?: 'webp' | 'avif';
  quality?: number;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  className?: string;
  style?: React.CSSProperties;
  retina?: number;
}

export default function HatchImage({
  features = null, src, alt = '', width, height, format = 'webp',
  quality, loading = 'lazy', decoding = 'async', className, style, retina = 2,
}: Props) {
  if (!src) return null;
  const opts = { w: width, h: height, format, q: quality };
  const optimized = features ? imgSrc(features, src, opts) : src;
  const optimized2x = features && width
    ? imgSrc(features, src, { ...opts, w: width * retina, h: height ? height * retina : undefined })
    : optimized;
  const srcset = width && optimized !== optimized2x ? `${optimized} 1x, ${optimized2x} ${retina}x` : undefined;
  return (
    <img
      src={optimized}
      {...(srcset ? { srcSet: srcset } : {})}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      className={className}
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
    />
  );
}
