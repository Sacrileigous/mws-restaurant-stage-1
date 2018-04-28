let db;
const dbId = 'restaurant-reviews';

function openDatabase() {
  if (!db) {
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }

    return idb.open(dbId, 1, function(upgradeDb) {
      var store = upgradeDb.createObjectStore(dbId, {
        keyPath: 'id'
      });
      store.createIndex('by-id', 'id');
    });
  }
  return db;
}

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return new Promise((resolve, reject) => {
      // First we check idb for restaurants.
      openDatabase().then((db) => {
        // Act only if it's possible to open idb.
        if (db) {
          var index = db.transaction(dbId)
            .objectStore(dbId).index('by-id');

          return index.getAll().then(function(restaurants) {
            // If idb is empty we fallback to fetch request.
            if (!restaurants.length) {
              return false;
            }
            return restaurants;
          });
        }
        return false;
      }).then((restaurants) => {
        if (restaurants) {
          // Resolve with data from idb.
          console.info('Fetched all restaurants: retreived from idb.');
          resolve(restaurants);
        } else {
          // If no restaurants are received from idb, we make a request.
          fetch(DBHelper.DATABASE_URL)
          .then((response) => {
            if (response.status === 200) {
              const jsonResponse = response.json();
              // Received restaurant info, lets store it in idb.
              openDatabase().then(function(db) {
                // Again, only if it's possible to open idb.
                if (!db) return;
                jsonResponse.then((restaurants) => {
                  const tx = db.transaction(dbId, 'readwrite');
                  const store = tx.objectStore(dbId);
                  restaurants.forEach(function(restaurant) {
                    store.put(restaurant);
                  });
                });
              });
              console.info('Fetched all restaurants: retreived via fetch.');
              resolve(jsonResponse);
            } else {
              // Error during fetch.
              response.text()
              .then((message) => {
                reject(message);
              });
            }
          })
          .catch((e) => {
            // Error during fetch.
            const error = (`Request failed. ${e.message}`);
            reject(error);
          });
        }
      });
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    return new Promise((resolve, reject) => {
      // First we check idb for the restaurant.
      openDatabase().then((db) => {
        // Act only if it's possible to open idb.
        if (db) {
          var index = db.transaction(dbId)
            .objectStore(dbId).index('by-id');

          return index.getAll().then(function(restaurants) {
            const restaurant = restaurants.filter(r => r.id == id);
            return restaurant.length ? restaurant[0] : false;
          });
        }
        return false;
      }).then((restaurant) => {
        if (restaurant) {
          // Resolve with data from idb.
          console.info(`Fetched restaurant ${id}: retreived from idb.`);
          resolve(restaurant);
        } else {
          // If no restaurant is received from idb, we make a request.
          fetch(`${DBHelper.DATABASE_URL}/${id}`)
          .then((response) => {
            if (response.status === 200) {
              const jsonResponse = response.json();
              // Received restaurant info, lets store it in idb.
              openDatabase().then(function(db) {
                // Again, only if it's possible to open idb.
                if (!db) return;
                jsonResponse.then((restaurant) => {
                  const tx = db.transaction(dbId, 'readwrite');
                  const store = tx.objectStore(dbId);
                  store.put(restaurant);
                });
              });
              console.info(`Fetched restaurant ${id}: retreived via fetch.`);
              resolve(jsonResponse);
            } else {
              // Error during fetch.
              response.text()
              .then((message) => {
                reject(message);
              });
            }
          })
          .catch((e) => {
            // Error during fetch.
            const error = (`Request failed. ${e.message}`);
            reject(error);
          });
        }
      });
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine) {
    return new Promise((resolve, reject) => {
      // Fetch all restaurants  with proper error handling
      DBHelper.fetchRestaurants()
      .then((restaurants) => {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        resolve(results);
      })
      .catch((error) => {
        reject(error);
      });
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    return new Promise((resolve, reject) => {
      // Fetch all restaurants
      DBHelper.fetchRestaurants()
      .then((restaurants) => {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        resolve(results);
      })
      .catch((error) => {
        reject(error);
      });
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    return new Promise((resolve, reject) => {
      // Fetch all restaurants
      DBHelper.fetchRestaurants()
      .then((restaurants) => {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        resolve(results);
      })
      .catch((error) => {
        reject(error);
      });
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods() {
    return new Promise((resolve, reject) => {
      // Fetch all restaurants
      DBHelper.fetchRestaurants()
      .then((restaurants) => {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        resolve(uniqueNeighborhoods);
      })
      .catch((error) => {
        reject(error);
      });
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines() {
    return new Promise((resolve, reject) => {
      // Fetch all restaurants
      DBHelper.fetchRestaurants()
      .then((restaurants) => {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        resolve(uniqueCuisines);
      })
      .catch((error) => {
        reject(error);
      });
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    return new google.maps.Marker({
          position: restaurant.latlng,
          title: restaurant.name,
          url: DBHelper.urlForRestaurant(restaurant),
          map: map,
          animation: google.maps.Animation.DROP
    });
  }

}
