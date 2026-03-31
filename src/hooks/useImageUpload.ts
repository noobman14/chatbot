import { useState, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

export function useImageUpload() {
  const { t } = useTranslation();
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 压缩图片到指定大小（KB）
  async function compressImage(file: File, maxSizeKB: number = 50): Promise<{ base64: string; mimeType: string; preview: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDimension = 512;
          let { width, height } = img;

          if (width > maxDimension || height > maxDimension) {
            const scale = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建Canvas上下文'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          const maxSize = maxSizeKB * 1024;
          let quality = 0.8;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          let sizeInBytes = (dataUrl.split(',')[1].length * 3) / 4;

          while (sizeInBytes > maxSize && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            sizeInBytes = (dataUrl.split(',')[1].length * 3) / 4;
          }

          let currentWidth = width;
          let currentHeight = height;
          while (sizeInBytes > maxSize && currentWidth > 100) {
            currentWidth = Math.round(currentWidth * 0.7);
            currentHeight = Math.round(currentHeight * 0.7);
            canvas.width = currentWidth;
            canvas.height = currentHeight;
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
            dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            sizeInBytes = (dataUrl.split(',')[1].length * 3) / 4;
          }

          const [prefix, base64Data] = dataUrl.split(',');
          const mimeMatch = prefix.match(/data:(.*);base64/);
          if (mimeMatch && base64Data) {
            console.log(`图片压缩完成: ${Math.round(sizeInBytes / 1024)}KB, 尺寸: ${currentWidth}x${currentHeight}`);
            resolve({
              base64: base64Data,
              mimeType: mimeMatch[1],
              preview: dataUrl
            });
          } else {
            reject(new Error('无法解析压缩后的图片'));
          }
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  async function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(t('chat.imageTooLarge'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert(t('chat.invalidImageType'));
      return;
    }

    try {
      if (file.size > 500 * 1024) {
        const compressed = await compressImage(file, 500);
        setImageData(compressed.base64);
        setImageMimeType(compressed.mimeType);
        setImagePreview(compressed.preview);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const [prefix, base64Data] = result.split(',');
          const mimeMatch = prefix.match(/data:(.*);base64/);
          if (mimeMatch && base64Data) {
            setImageData(base64Data);
            setImageMimeType(mimeMatch[1]);
            setImagePreview(result);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('图片处理失败:', error);
      alert(t('chat.imageProcessError'));
    }

    event.target.value = '';
  }

  function removeImage() {
    setImageData(null);
    setImageMimeType(null);
    setImagePreview(null);
  }

  function handleImageButtonClick() {
    fileInputRef.current?.click();
  }

  return {
    imageData,
    imageMimeType,
    imagePreview,
    fileInputRef,
    handleImageSelect,
    removeImage,
    handleImageButtonClick
  };
}
