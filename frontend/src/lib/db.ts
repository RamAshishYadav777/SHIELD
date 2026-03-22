import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'shield_offline';
const VERSION = 1;

export interface ShieldDB extends IDBPDatabase {
  contacts: any;
  safezones: any;
}

export const initDB = async () => {
  return openDB(DB_NAME, VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('contacts')) {
        db.createObjectStore('contacts', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('safezones')) {
        db.createObjectStore('safezones', { keyPath: '_id' });
      }
    },
  });
};

export const cacheData = async (storeName: 'contacts' | 'safezones', data: any[]) => {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  
  // Clear old data and insert new
  await store.clear();
  for (const item of data) {
    await store.put(item);
  }
  await tx.done;
};

export const getCachedData = async (storeName: 'contacts' | 'safezones') => {
  const db = await initDB();
  return db.getAll(storeName);
};
