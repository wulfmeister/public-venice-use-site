// IndexedDB image store — keeps generated/pasted images out of localStorage
// (which has a ~5 MB limit) while keeping them entirely client-side.
const DB_NAME = "venice-community-proxy";
import { generateScopedId } from "./id-generator";

const STORE_NAME = "images";
const DB_VERSION = 1;

type ImageRecord = {
  id: string;
  blob: Blob;
  mime: string;
  createdAt: string;
};

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Failed to open IndexedDB."));
  });

// Opens a transaction, runs the callback, waits for commit, then closes the DB.
const withStore = async <T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T>,
) => {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, mode);
  const store = transaction.objectStore(STORE_NAME);
  try {
    const result = await callback(store);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return result;
  } finally {
    db.close();
  }
};

export const storeImageBlob = async (blob: Blob, mime: string) => {
  const id = generateScopedId("img");
  const record: ImageRecord = {
    id,
    blob,
    mime,
    createdAt: new Date().toISOString(),
  };

  await withStore(
    "readwrite",
    (store) =>
      new Promise<void>((resolve, reject) => {
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );

  return { id, mime };
};

export const getImageBlob = async (id: string) =>
  withStore(
    "readonly",
    (store) =>
      new Promise<Blob | null>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
          const result = request.result as ImageRecord | undefined;
          resolve(result?.blob || null);
        };
        request.onerror = () => reject(request.error);
      }),
  );

export const deleteImages = async (ids: string[]) => {
  if (ids.length === 0) return;
  await withStore("readwrite", (store) =>
    Promise.all(
      ids.map(
        (id) =>
          new Promise<void>((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          }),
      ),
    ).then(() => undefined),
  );
};

const dataUrlToBlob = (dataUrl: string) => {
  const [header, data] = dataUrl.split(",");
  if (!header || !data) {
    throw new Error("Invalid image data.");
  }

  const mimeMatch = header.match(/data:(.*?)(;base64)?$/);
  const mime = mimeMatch?.[1] || "application/octet-stream";
  const isBase64 = header.includes(";base64");
  let decoded: string;
  try {
    decoded = isBase64 ? atob(data) : decodeURIComponent(data);
  } catch {
    throw new Error("Invalid image data encoding.");
  }
  const bytes = new Uint8Array(decoded.length);

  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i);
  }

  return {
    blob: new Blob([bytes], { type: mime }),
    mime,
  };
};

export const storeImageDataUrl = async (dataUrl: string) => {
  const { blob, mime } = dataUrlToBlob(dataUrl);
  return storeImageBlob(blob, mime);
};
