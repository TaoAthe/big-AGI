/**
 * Copyright (c) 2024 Enrico Ros
 *
 * Functions to deal with images from the frontend.
 * Also see videoUtils.ts for more image-related functions.
 */

import { asyncCanvasToBlob, canvasToDataURLAndMimeType } from './canvasUtils';
import { convert_Base64DataURL_To_Base64WithMimeType, convert_Base64WithMimeType_To_Blob, } from '~/common/util/blobUtils';


/**
 * Opens an image Data URL in a new tab
 */
export async function showImageDataURLInNewTab(imageDataURL: string) {
  try {
    const { base64Data, mimeType } = convert_Base64DataURL_To_Base64WithMimeType(imageDataURL, 'showImageDataURLInNewTab');
    const imageBlob = await convert_Base64WithMimeType_To_Blob(base64Data, mimeType, 'showImageDataURLInNewTab')
    // NOTE: we don't really know when to release this, as the user may still be viewing the image in the new tab
    return URL.createObjectURL(imageBlob);
  } catch (error) {
    console.warn('showImageDataURLInNewTab: Failed to convert image Data URL to Blob URL.', error);
    return false;
  }
}

export function showBlobURLInNewTab(blobURL: string) {
  if (typeof window !== 'undefined') {
    window.open(blobURL, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false;
}


/**
 * Converts an SVG string to a PNG Blob via an intermediate canvas.
 */
export async function renderSVGToPNGBlob(svgCode: string, transparentBackground: boolean, renderScale: number = 2.0): Promise<Blob | null> {
  if (!svgCode) return null;

  // Create a Blob URL for the SVG
  const svgBlob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  // Load the SVG image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => {
      console.error('Error loading SVG image:', e);
      reject(e);
    };
  });

  // Prepare canvas @[Scale]x, e.g. @2x
  const canvasWidth = img.width * renderScale;
  const canvasHeight = img.height * renderScale;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(url);
    return null;
  }

  // Handle background
  if (!transparentBackground) {
    // TODO: make it responsive, such as with:
    // document.querySelector('html')?.getAttribute('data-joy-color-scheme') === 'dark'
    // ctx.fillStyle = '#FFFFFF';
    // ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    // clear the canvas to ensure transparency
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  }

  // Draw the SVG image @2x
  ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

  // Convert canvas to PNG Blob, and we're done
  const pngBlob = await asyncCanvasToBlob(canvas, 'image/png');
  URL.revokeObjectURL(url);
  return pngBlob;
}


/**
 * Asynchronously gets the dimensions of a base64DataURL image.
 */
export async function getImageDimensions(base64DataUrl: string): Promise<{ width: number, height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'Anonymous';
    image.onload = () => {
      resolve({
        width: image.width,
        height: image.height,
      });
    };
    image.onerror = (error) => {
      console.warn('Failed to load image for dimension extraction.', error);
      reject(new Error('Failed to load image for dimension extraction.'));
    };
    image.src = base64DataUrl;
  });
}


/**
 * Converts an image buffer to WebP format and returns the base64 encoded string.
 */
export async function convertBase64Image(base64DataUrl: string, destMimeType: string /*= 'image/webp'*/, destQuality: number /*= 0.90*/): Promise<{
  mimeType: string,
  base64: string,
  width: number,
  height: number,
}> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'Anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(image, 0, 0);

      // Convert canvas image to a DataURL string
      try {
        const { mimeType: actualMimeType, base64Data } = canvasToDataURLAndMimeType(canvas, destMimeType, destQuality, 'image-convert');
        resolve({
          mimeType: actualMimeType,
          base64: base64Data,
          width: image.width,
          height: image.height,
        });
      } catch (error) {
        console.warn(`imageUtils: failed to convert image to ${destMimeType}.`, { error });
        reject(new Error(`Failed to convert image to '${destMimeType}'.`));
      }
    };
    image.onerror = (error) => {
      console.warn('Failed to load image for conversion.', error);
      reject(new Error('Failed to load image for conversion.'));
    };
    image.src = base64DataUrl;
  });
}


export type LLMImageResizeMode = 'openai-low-res' | 'openai-high-res' | 'google' | 'anthropic' | 'thumbnail-128' | 'thumbnail-256';

export async function resizeBase64ImageIfNeeded(inputMimeType: string, inputBase64Data: string, resizeMode: LLMImageResizeMode, destMimeType: string /*= 'image/webp'*/, destQuality: number /*= 0.90*/): Promise<{
  mimeType: string,
  base64: string,
} | null> {
  const image = new Image();
  image.crossOrigin = 'Anonymous';

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const originalWidth = image.width;
      const originalHeight = image.height;

      let newWidth: number = originalWidth;
      let newHeight: number = originalHeight;
      let shouldResize = false;

      switch (resizeMode) {
        case 'anthropic':
          // Resize to fit within 1568px on the long edge
          const maxSideAnthropic = 1568;
          if (originalWidth > maxSideAnthropic || originalHeight > maxSideAnthropic) {
            shouldResize = true;
            if (originalWidth > originalHeight) {
              newWidth = maxSideAnthropic;
              newHeight = Math.round((originalHeight / originalWidth) * maxSideAnthropic);
            } else {
              newHeight = maxSideAnthropic;
              newWidth = Math.round((originalWidth / originalHeight) * maxSideAnthropic);
            }
          }
          break;

        case 'google':
          // Google: Resize to fit within 3072x3072
          const maxSideGoogle = 3072;
          if (originalWidth > maxSideGoogle || originalHeight > maxSideGoogle) {
            shouldResize = true;
            if (originalWidth > originalHeight) {
              newWidth = maxSideGoogle;
              newHeight = Math.round((originalHeight / originalWidth) * maxSideGoogle);
            } else {
              newHeight = maxSideGoogle;
              newWidth = Math.round((originalWidth / originalHeight) * maxSideGoogle);
            }
          }
          break;

        case 'openai-high-res':
          // OpenAI:
          // 1. Scale down to fit within 2048x2048
          const maxSideOpenAI = 2048;
          if (originalWidth > maxSideOpenAI || originalHeight > maxSideOpenAI) {
            shouldResize = true;
            if (originalWidth > originalHeight) {
              newWidth = maxSideOpenAI;
              newHeight = Math.round((originalHeight / originalWidth) * maxSideOpenAI);
            } else {
              newHeight = maxSideOpenAI;
              newWidth = Math.round((originalWidth / originalHeight) * maxSideOpenAI);
            }
          }

          // 2. Scale down to 768px on the shortest side (if larger) - maintain aspect ratio
          const minSideOpenAI = 768;
          if (newWidth > newHeight && newHeight > minSideOpenAI) {
            shouldResize = true;
            newWidth = Math.round((newWidth / newHeight) * minSideOpenAI);
            newHeight = minSideOpenAI;
          } else if (newWidth < newHeight && newWidth > minSideOpenAI) {
            shouldResize = true;
            newHeight = Math.round((newHeight / newWidth) * minSideOpenAI);
            newWidth = minSideOpenAI;
          }
          break;

        case 'openai-low-res':
          // Resize to 512x512 if any side is larger
          if (originalWidth <= 512 && originalHeight <= 512) {
            resolve(null);
            return;
          }

          const lrScaleMode = 'keep-aspect-ratio' as ('stretch' | 'keep-aspect-ratio');
          switch (lrScaleMode) {
            case 'stretch':
              newWidth = 512;
              newHeight = 512;
              shouldResize = true;
              break;

            case 'keep-aspect-ratio':
              if (originalWidth > originalHeight) {
                newWidth = 512;
                newHeight = Math.round((originalHeight / originalWidth) * 512);
              } else {
                newHeight = 512;
                newWidth = Math.round((originalWidth / originalHeight) * 512);
              }
              shouldResize = true;
              break;
          }
          break;

        case 'thumbnail-128':
        case 'thumbnail-256':
          shouldResize = true;
          const maxSideThumbnail = resizeMode === 'thumbnail-128' ? 128 : 256;
          if (originalWidth > maxSideThumbnail || originalHeight > maxSideThumbnail) {
            if (originalWidth > originalHeight) {
              newWidth = maxSideThumbnail;
              newHeight = Math.round((originalHeight / originalWidth) * maxSideThumbnail);
            } else {
              newHeight = maxSideThumbnail;
              newWidth = Math.round((originalWidth / originalHeight) * maxSideThumbnail);
            }
          }
          break;

        default:
          reject(new Error('Unsupported resize mode'));
          return;
      }

      if (!shouldResize) {
        resolve(null);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(image, 0, 0, newWidth, newHeight);

      // Convert canvas image to a DataURL string
      try {
        const { mimeType: actualMimeType, base64Data } = canvasToDataURLAndMimeType(canvas, destMimeType, destQuality, 'image-resize');
        resolve({
          mimeType: actualMimeType,
          base64: base64Data,
        });
      } catch (error) {
        console.warn(`imageUtils: failed to resize image to '${resizeMode}' as ${destMimeType}.`, { error });
        reject(new Error(`Failed to resize image to '${resizeMode}' as '${destMimeType}'.`));
      }
    };

    image.onerror = (error) => {
      console.warn('Failed to load image for resizing.', error);
      reject(new Error('Failed to load image for resizing.'));
    };

    // this starts the decoding
    image.src = `data:${inputMimeType};base64,${inputBase64Data}`;
  });
}