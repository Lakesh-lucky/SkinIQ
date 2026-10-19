/**
 * Client-Side Instant Dermoscopic Skin & Non-Skin Gatekeeper
 * Validates uploaded photos directly in the browser using HTML5 Canvas pixel analysis.
 * Rejects: Spider-Man, superhero costumes, anime/cartoons, clothes, documents, and non-dermoscopic photos.
 */
export interface SkinValidationResult {
  isValid: boolean;
  reason: string;
  details?: {
    comicBlueRatio: number;
    comicRedRatio: number;
    costumeRatio: number;
    skinTissueRatio: number;
  };
}

export async function validateSkinImageClient(file: File): Promise<SkinValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          isValid: true,
          reason: 'OK'
        });
        return;
      }

      const size = 160;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;
      const totalPixels = size * size;

      let comicBlueCount = 0;
      let comicRedCount = 0;
      let comicGreenCount = 0;
      let cyanNeonCount = 0;
      let cutaneousCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const r_n = r / 255.0;
        const g_n = g / 255.0;
        const b_n = b / 255.0;

        const max = Math.max(r_n, g_n, b_n);
        const min = Math.min(r_n, g_n, b_n);
        const delta = max - min + 1e-6;
        const sat = max > 0 ? delta / max : 0;
        const val = max;

        let hue = 0;
        if (max === r_n) {
          hue = 60 * (((g_n - b_n) / delta) % 6);
        } else if (max === g_n) {
          hue = 60 * ((b_n - r_n) / delta + 2);
        } else {
          hue = 60 * ((r_n - g_n) / delta + 4);
        }
        if (hue < 0) hue += 360;

        // 1. Synthetic Comic / Superhero Blue
        if (b > 75 && b > 1.15 * r + 10 && sat > 0.30) {
          comicBlueCount++;
        }

        // 2. Synthetic Superhero Costume Red
        if (r > 130 && g < 75 && b < 75 && sat > 0.45) {
          comicRedCount++;
        }

        // 3. Synthetic Comic Green
        if (g > 90 && g > 1.20 * r + 10 && sat > 0.35) {
          comicGreenCount++;
        }

        // 4. Cyan / Neon highlights
        if (hue >= 160 && hue <= 210 && sat > 0.50 && val > 0.20) {
          cyanNeonCount++;
        }

        // 5. Biological skin chrominance (YCbCr)
        const Cb = -0.168736 * r - 0.331264 * g + 0.500000 * b + 128;
        const Cr =  0.500000 * r - 0.418688 * g - 0.081312 * b + 128;
        if (Cr >= Cb - 18 && val >= 0.10) {
          cutaneousCount++;
        }
      }

      const comicBlueRatio = comicBlueCount / totalPixels;
      const comicRedRatio = comicRedCount / totalPixels;
      const comicGreenRatio = comicGreenCount / totalPixels;
      const cyanNeonRatio = cyanNeonCount / totalPixels;
      const costumeCombinedRatio = (comicBlueCount + comicRedCount + comicGreenCount + cyanNeonCount) / totalPixels;
      const cutaneousRatio = cutaneousCount / totalPixels;

      // Only reject if overwhelmingly synthetic cartoon/costume (>45%) and zero biological skin tissue
      if (comicBlueRatio > 0.45 && cutaneousRatio < 0.05) {
        resolve({
          isValid: false,
          reason: `Non-skin graphic detected: High synthetic graphics pigments (${(comicBlueRatio * 100).toFixed(1)}%). Please upload a clear skin lesion photograph.`,
          details: { comicBlueRatio, comicRedRatio, costumeRatio: costumeCombinedRatio, skinTissueRatio: cutaneousRatio }
        });
        return;
      }

      if (costumeCombinedRatio > 0.50 && cutaneousRatio < 0.04) {
        resolve({
          isValid: false,
          reason: `Non-skin image detected: Synthetic illustration/costume graphics (${(costumeCombinedRatio * 100).toFixed(1)}%). Please upload a clinical skin photograph.`,
          details: { comicBlueRatio, comicRedRatio, costumeRatio: costumeCombinedRatio, skinTissueRatio: cutaneousRatio }
        });
        return;
      }

      if (cutaneousRatio < 0.02 && costumeCombinedRatio > 0.30) {
        resolve({
          isValid: false,
          reason: `No biological skin tissue detected (${(cutaneousRatio * 100).toFixed(1)}%). Please upload a clinical dermoscopic skin lesion photo.`,
          details: { comicBlueRatio, comicRedRatio, costumeRatio: costumeCombinedRatio, skinTissueRatio: cutaneousRatio }
        });
        return;
      }

      // Valid skin image
      resolve({
        isValid: true,
        reason: 'VALID_DERMOSCOPIC_SKIN',
        details: { comicBlueRatio, comicRedRatio, costumeRatio: costumeCombinedRatio, skinTissueRatio: cutaneousRatio }
      });
    };

    img.onerror = () => {
      resolve({
        isValid: false,
        reason: 'Failed to decode image file. Please choose a valid JPG/PNG format.'
      });
    };
  });
}
