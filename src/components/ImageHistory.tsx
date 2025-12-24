import { Download, X, ArrowLeft } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { useState } from "react";
import './ImageHistory.css';

// 图片数据接口
export interface ImageItem {
  id: string;
  url: string;
  time: number;
}

interface ImageHistoryProps {
  images: ImageItem[];
  onBack: () => void;
}

/**
 * 历史图片组件
 * 
 * 在主页面展示所有历史生成的图片
 */
export function ImageHistory({ images, onBack }: ImageHistoryProps) {
  const { t } = useTranslation();
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // 下载图片
  const downloadImage = async (url: string, _id: string) => {
    try {
      // 由于没有服务器跨域权限，直接打开链接下载
      window.open(url, '_self');

      // 以下代码需要服务器支持跨域，暂时注释
      // const response = await fetch(url);
      // const blob = await response.blob();
      // const blobUrl = window.URL.createObjectURL(blob);
      // const link = document.createElement('a');
      // link.href = blobUrl;
      // link.download = `image-${id}.png`;
      // link.target = '_self';//解决弹出新窗口
      // document.body.appendChild(link);
      // link.click();
      // document.body.removeChild(link);
      // window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // 如果 fetch 失败，尝试直接打开链接
      window.open(url, '_blank');
    }
  };

  return (
    <div className="image-history">
      {/* 头部 */}
      <div className="image-history-header">
        <Button variant="ghost" onClick={onBack} className="back-button">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('images.backToChat')}
        </Button>
        <h2 className="image-history-title">{t('images.title')}</h2>
      </div>

      {/* 图片网格 */}
      {images.length === 0 ? (
        <div className="no-images">
          <p>{t('images.noImages')}</p>
        </div>
      ) : (
        <div className="image-grid">
          {images.map((image) => (
            <div key={image.id} className="image-card">
              <div
                className="image-wrapper"
                onClick={() => setPreviewImage(image.url)}
              >
                <img src={image.url} alt="Generated" loading="lazy" />
              </div>
              <div className="image-info">
                <span className="image-time">{formatTime(image.time)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadImage(image.url, image.id)}
                  title={t('images.download')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 图片预览弹窗 */}
      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-container" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="preview-close-button"
              onClick={() => setPreviewImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img src={previewImage} alt="Preview" />
          </div>
        </div>
      )}
    </div>
  );
}
