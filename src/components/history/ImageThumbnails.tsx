import { Image } from "lucide-react";
import { useTranslation } from 'react-i18next';
import './ImageThumbnails.css';

// 图片数据接口
export interface ImageItem {
  id: string;
  url: string;
  time: number;
}

interface ImageThumbnailsProps {
  images: ImageItem[];
  onViewAll: () => void;
}

/**
 * 侧边栏缩略图组件
 * 
 * 在侧边栏显示最多3张最新的历史图片
 */
export function ImageThumbnails({ images, onViewAll }: ImageThumbnailsProps) {
  const { t } = useTranslation();

  // 如果没有图片，不显示任何内容
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="image-thumbnails">
      <div className="thumbnails-header">
        <div className="thumbnails-title">
          <Image className="h-4 w-4" />
          <span>{t('sidebar.historyImages')}</span>
        </div>
      </div>
      <div className="thumbnails-grid" onClick={onViewAll}>
        {images.slice(0, 3).map((image) => (
          <div key={image.id} className="thumbnail-item">
            <img src={image.url} alt="Generated" loading="lazy" />
          </div>
        ))}
      </div>
      {images.length > 0 && (
        <button className="view-all-button" onClick={onViewAll}>
          {t('sidebar.viewAll')} ({images.length})
        </button>
      )}
    </div>
  );
}
