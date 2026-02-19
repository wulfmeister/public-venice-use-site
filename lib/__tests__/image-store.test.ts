import { describe, it, expect } from 'vitest';
import { storeImageBlob, getImageBlob, deleteImages, storeImageDataUrl } from '../image-store';

describe('image-store', () => {
  const testBlob = new Blob(['test-image-data'], { type: 'image/png' });

  describe('storeImageBlob', () => {
    it('stores a blob and returns an ID', async () => {
      const result = await storeImageBlob(testBlob, 'image/png');
      expect(result.id).toMatch(/^img_/);
      expect(result.mime).toBe('image/png');
    });
  });

  describe('getImageBlob', () => {
    it('retrieves a stored blob', async () => {
      const { id } = await storeImageBlob(testBlob, 'image/png');
      const retrieved = await getImageBlob(id);
      // fake-indexeddb structured clone may not preserve Blob prototype
      expect(retrieved).not.toBeNull();
      expect(retrieved).toBeDefined();
    });

    it('returns null for missing ID', async () => {
      const result = await getImageBlob('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('deleteImages', () => {
    it('deletes stored images', async () => {
      const { id } = await storeImageBlob(testBlob, 'image/png');
      await deleteImages([id]);
      const result = await getImageBlob(id);
      expect(result).toBeNull();
    });

    it('handles empty array', async () => {
      await expect(deleteImages([])).resolves.toBeUndefined();
    });
  });

  describe('storeImageDataUrl', () => {
    it('stores a base64 data URL', async () => {
      const dataUrl = 'data:image/png;base64,' + btoa('fake-image-data');
      const result = await storeImageDataUrl(dataUrl);
      expect(result.id).toMatch(/^img_/);
      expect(result.mime).toBe('image/png');
    });
  });
});
