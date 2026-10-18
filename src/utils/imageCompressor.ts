/**
 * Compresses an image file or base64 string to a web-optimized JPEG format
 * to ensure ultra-fast loading on mobile and safe storage in cloud databases.
 */
export async function compressImage(
  fileOrBase64: File | string,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : '');
        return;
      }

      // Fill with clean white background in case of transparent PNGs
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      console.warn('Failed to compress image, using fallback', err);
      if (typeof fileOrBase64 === 'string') {
        resolve(fileOrBase64);
      } else {
        reject(err);
      }
    };

    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    }
  });
}

/**
 * Compresses a customer payment screenshot to a lightweight ~25KB-40KB JPEG
 * and permanently stamps an official verification bar at the bottom with the
 * exact Order ID, Buyer Name, Phone, Payment Method, and Total Amount so that
 * screenshots can never be confused or swapped between orders.
 */
export async function compressAndStampPaymentScreenshot(
  fileOrBase64: File | string,
  meta: {
    orderId: string;
    customerName: string;
    phone: string;
    total: number;
    paymentMethod: string;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const maxWidth = 600;
      const maxHeight = 820;
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      width = Math.max(width, 360);

      const stampHeight = 48;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height + stampHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : '');
        return;
      }

      // Draw white background and screenshot
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height + stampHeight);
      ctx.drawImage(img, 0, 0, width, height);

      // Draw anti-swap Order ID & Buyer verification stamp bar at bottom
      ctx.fillStyle = '#1C1B1A';
      ctx.fillRect(0, height, width, stampHeight);

      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(0, height, width, 2);

      const formattedOrderId = meta.orderId.startsWith('#') ? meta.orderId : `#${meta.orderId}`;
      const line1 = `ORDER ${formattedOrderId}  •  ${(meta.paymentMethod || 'QR').toUpperCase()}  •  NPR ${(meta.total || 0).toLocaleString()}`;
      const line2 = `Buyer: ${meta.customerName || 'Customer'} (${meta.phone || 'N/A'})`;

      ctx.font = 'bold 12px monospace, sans-serif';
      ctx.fillStyle = '#D4AF37';
      ctx.fillText(line1, 10, height + 20, width - 20);

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#FAF8F5';
      ctx.fillText(line2, 10, height + 38, width - 20);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.68);
      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      if (typeof fileOrBase64 === 'string') {
        resolve(fileOrBase64);
      } else {
        reject(err);
      }
    };

    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    }
  });
}

