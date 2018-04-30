let db;
const dbId = 'restaurant-reviews';

function openDatabase() {
  if (!db) {
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }

    return idb.open(dbId, 1, upgradeDb => {
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
   * Database port.
   */
  static get port() {
    return 1337;
  }

  /**
   * Database URL for restaurants.
   */
  static get DATABASE_URL() {
    return `http://localhost:${DBHelper.port}/restaurants`;
  }

  /**
   * Database URL for reviews.
   */
  static get DATABASE_URL_REVIEWS() {
    return `http://localhost:${DBHelper.port}/reviews`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return new Promise((resolve, reject) => {
      // First we check idb for restaurants.
      openDatabase().then(db => {
        // Act only if it's possible to open idb.
        if (db) {
          var index = db.transaction(dbId)
            .objectStore(dbId).index('by-id');

          return index.getAll().then(restaurants => {
            // If idb is empty we fallback to fetch request.
            if (!restaurants.length) {
              return false;
            }
            return restaurants;
          });
        }
        return false;
      }).then(restaurants => {
        if (restaurants) {
          // Resolve with data from idb.
          console.info('Fetched all restaurants: retreived from idb.');
          resolve(restaurants);
        } else {
          // If no restaurants are received from idb, we make a request.
          fetch(DBHelper.DATABASE_URL)
          .then(response => {
            if (response.status === 200) {
              const jsonResponse = response.json();
              // Received restaurant info, lets store it in idb.
              openDatabase().then(db => {
                // Again, only if it's possible to open idb.
                if (!db) return;
                jsonResponse.then(restaurants => {
                  const tx = db.transaction(dbId, 'readwrite');
                  const store = tx.objectStore(dbId);
                  restaurants.forEach(restaurant => {
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
          .catch(e => {
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
      DBHelper.getRestaurantFromIdbById(id)
      .then(restaurant => {
        if (restaurant) {
          // Resolve with data from idb.
          console.info(`Fetched restaurant ${id}: retreived from idb.`);
          resolve(restaurant);
        } else {
          // If no restaurant is received from idb, we make a request.
          fetch(`${DBHelper.DATABASE_URL}/${id}`)
          .then(response => {
            if (response.status === 200) {
              const jsonResponse = response.json();
              jsonResponse.then(restaurant => {
                DBHelper.storeRestaurantInIdb(restaurant);
              });
              console.info(`Fetched restaurant ${id}: retreived via fetch.`);
              resolve(jsonResponse);
            } else {
              // Error during fetch.
              response.text()
              .then(message => {
                reject(message);
              });
            }
          })
          .catch(e => {
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
  static fetchRestaurantReviewsById(id) {
    return new Promise((resolve, reject) => {
      // First we check idb for the restaurant reviews.
      DBHelper.getRestaurantFromIdbById(id)
      .then(restaurant => {
        if (restaurant.reviews) {
          return restaurant.reviews;
        }
        return false;
      })
      .then(reviews => {
        if (reviews) {
          // Resolve with data from idb.
          console.info(`Fetched restaurant ${id} reviews: retreived from idb.`);
          resolve(restaurant);
        } else {
          // If no restaurant reviews are received from idb, we make a request.
          fetch(`${DBHelper.DATABASE_URL_REVIEWS}/?restaurant_id=${id}`)
          .then(response => {
            if (response.status === 200) {
              const jsonResponse = response.json();
              // Received restaurant reviews, lets store it in idb.
              jsonResponse.then(reviews => {
                DBHelper.getRestaurantFromIdbById(id)
                .then(restaurant => {
                  if (restaurant) {
                    restaurant.reviews = reviews;
                    DBHelper.storeRestaurantInIdb(restaurant);
                  }
                });
              });
              console.info(`Fetched restaurant ${id} reviews: retreived via fetch.`);
              resolve(jsonResponse);
            } else {
              // Error during fetch.
              response.text()
              .then(message => {
                reject(message);
              });
            }
          })
          .catch(e => {
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
      .then(restaurants => {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        resolve(results);
      })
      .catch(error => {
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
      .then(restaurants => {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        resolve(results);
      })
      .catch(error => {
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
      .then(restaurants => {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        resolve(results);
      })
      .catch(error => {
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
      .then(restaurants => {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        resolve(uniqueNeighborhoods);
      })
      .catch(error => {
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
      .then(restaurants => {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        resolve(uniqueCuisines);
      })
      .catch(error => {
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
    return (`/img/${restaurant.photograph}.webp`);
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

  /**
   * Toogle restaurant favourite state.
   */
  static toogleRestaurantFavourite(id, state) {
    return new Promise((resolve, reject) => {
      fetch(`${DBHelper.DATABASE_URL}/${id}/?is_favorite=${state}`, {
        method: 'PUT'
      })
      .then(response => {
        if (response.status === 200) {
          const jsonResponse = response.json();
          // Received restaurant info, lets store it in idb.
          openDatabase().then(db => {
            // Again, only if it's possible to open idb.
            if (!db) return;
            jsonResponse.then(restaurant => {
              const tx = db.transaction(dbId, 'readwrite');
              const store = tx.objectStore(dbId);
              store.put(restaurant);
            });
          });
          resolve(jsonResponse);
        } else {
          // Error during fetch.
          response.text()
          .then((message) => {
            reject(message);
          });
        }
      })
      .catch(e => {
        // Error during fetch.
        const error = (`Request failed. ${e.message}`);
        reject(error);
      });
    });
  }

  /**
   * Get restaurant from IndexedDB.
   */
  static getRestaurantFromIdbById(id) {
    return openDatabase().then(db => {
      // Act only if it's possible to open idb.
      if (db) {
        const index = db.transaction(dbId)
          .objectStore(dbId).index('by-id');

        return index.getAll().then(restaurants => {
          const restaurant = restaurants.filter(r => r.id == id);
          return restaurant.length ? restaurant[0] : false;
        });
      }
      return false;
    });
  }

  /**
   * Store restaurant in IndexedDB.
   */
  static storeRestaurantInIdb(restaurant) {
    return openDatabase().then(db => {
      // Only if it's possible to open idb.
      if (!db) return false;
      const tx = db.transaction(dbId, 'readwrite');
      const store = tx.objectStore(dbId);
      store.put(restaurant);
    });
  }

  /**
   * Post restaurant review to server.
   */
  static postRestaurantReview(id, formData) {
    return new Promise((resolve, reject) => {
      fetch(`${DBHelper.DATABASE_URL_REVIEWS}`, {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (response.status === 201) {
          const jsonResponse = response.json();
          // Restaurant review was created, lets store it in idb.
          jsonResponse.then(review => {
            DBHelper.getRestaurantFromIdbById(id)
            .then(restaurant => {
              if (restaurant) {
                if (!restaurant.reviews) {
                  restaurant.reviews = [];
                }
                restaurant.reviews.push(review);
                DBHelper.storeRestaurantInIdb(restaurant);
              }
            });
          });
          resolve(jsonResponse);
        } else {
          // Error during fetch.
          response.text()
          .then(message => {
            reject(message);
          });
        }
      })
      .catch(e => {
        // Error during fetch.
        const error = (`Request failed. ${e.message}`);
        reject(error);
      });
    });
  }

}
