let offlineDb;
const offlineDbId = 'restaurant-offline-reviews';

function openOfflineDatabase() {
  if (!offlineDb) {
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }

    return idb.open(offlineDbId, 1, upgradeDb => {
      var store = upgradeDb.createObjectStore(offlineDbId, {
        keyPath: 'timestamp'
      });
      store.createIndex('by-timestamp', 'timestamp');
    });
  }
  return offlineDb;
}

/**
 * Common offline db functions.
 */
class OfflineDBHelper {

  /**
   * Store review in IndexedDB.
   */
  static storeReview(review) {
    return openOfflineDatabase().then(db => {
      // Only if it's possible to open idb.
      if (!db) return false;
      const tx = db.transaction(offlineDbId, 'readwrite');
      const store = tx.objectStore(offlineDbId);
      review.timestamp = new Date().getTime();
      store.put(review);
    });
  }

  /**
   * Get reviews index from IndexedDB.
   */
  static getReviewsIndex() {
    return openOfflineDatabase().then(db => {
      // Act only if it's possible to open idb.
      if (db) {
        return db.transaction(offlineDbId, 'readwrite').objectStore(offlineDbId).index('by-timestamp');
      }
      return false;
    });
  }

}