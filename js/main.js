let restaurants, neighborhoods, cuisines, osberver;
var map;
var markers = [];

/**
 * Register service worker.
 */
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('sw.js', {
    scope: './'
  }).then(function(reg) {
    console.log('Service worker has been registered for scope: ' + reg.scope);
  });
}

/**
 * Initialize observer for image lazy load.
 */
if ('IntersectionObserver' in window) {
  observer = new IntersectionObserver(function(images) {
    images.forEach(image => {
      if (image.intersectionRatio > 0) {
        observer.unobserve(image.target);
        image.target.src = image.target.dataset.src;
      }
    });
  }, {
    rootMargin: '10px 0px'
  });
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  const script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyClViRpLh2mA3D_Gn5PYcjXsTo2v91ujMs&libraries=places&callback=initMap';
  document.getElementsByTagName('body')[0].appendChild(script);

  fetchNeighborhoods();
  fetchCuisines();
  updateRestaurants();

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 992 && !self.map) {
        self.initMap();
    }
  });
});

/**
 * Show map on small devices (< 992px).
 */
showMapModal = () => {
  const body = document.getElementsByTagName('body')[0];
  body.classList.add('map-visible');
  self.initMap(true);
};

/**
 * Hide map on small devices (< 992px).
 */
hideMapModal = () => {
  const body = document.getElementsByTagName('body')[0];
  body.classList.remove('map-visible');
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods()
  .then((neighborhoods) => {
    self.neighborhoods = neighborhoods;
    fillNeighborhoodsHTML();
  })
  .catch((error) => {
    // Got an error!
    console.error(error);
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines()
  .then((cuisines) => {
    self.cuisines = cuisines;
    fillCuisinesHTML();
  })
  .catch((error) => {
    // Got an error!
    console.error(error);
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = (forceRender = false) => {
  if (window.innerWidth >= 992 || (forceRender && !self.map)) {
    let loc = {
      lat: 40.722216,
      lng: -73.987501
    };
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      center: loc,
      scrollwheel: false
    });
    if (!self.markers.length) {
      addMarkersToMap();
    }
  }
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
  .then((restaurants) => {
    resetRestaurants(restaurants);
    fillRestaurantsHTML();
  })
  .catch((error) => {
    // Got an error!
    console.error(error);
  });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  if (restaurants.length) {
    restaurants.forEach(restaurant => {
      ul.append(createRestaurantHTML(restaurant));
    });
    addMarkersToMap();
  } else {
    const li = document.createElement('li');
    const message = document.createElement('p');
    message.innerHTML = 'Sorry, we could\'nt find any restaurants based on your filter criteria.';
    li.append(message);
    ul.append(li);
  }
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = '/img/placeholder.webp';
  if (restaurant.photograph) {
    if (observer) {
      image.dataset.src = DBHelper.imageUrlForRestaurant(restaurant);
      observer.observe(image);
    } else {
      image.src = DBHelper.imageUrlForRestaurant(restaurant);
    }
  }
  image.alt = restaurant.name;

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'restaurant-img-wrapper';
  imageWrapper.append(image);
  li.append(imageWrapper);

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  if (self.map && restaurants) {
    restaurants.forEach(restaurant => {
      // Add marker to the map
      const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
      google.maps.event.addListener(marker, 'click', () => {
        window.location.href = marker.url;
      });
      self.markers.push(marker);
    });
  }
};
