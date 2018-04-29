let restaurant, osberver, mapLoaded = false;
var map;

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
 * Fetch restaurant as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchRestaurantFromURL()
  .then((restaurant) => {
    fillBreadcrumb();
    if (!self.map && mapLoaded) {
      self.initMap();
    }
  })
  .catch((error) => {
    // Got an error!
    console.error(error);
  });
});

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  if (!self.map && self.restaurant) {
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 16,
      center: self.restaurant.latlng,
      scrollwheel: false
    });
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
  }
  mapLoaded = true;
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = () => {
  return new Promise((resolve, reject) => {
    if (self.restaurant) { // restaurant already fetched!
      resolve(self.restaurant);
      return;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
      const error = 'No restaurant id in URL';
      reject(error);
    } else {
      DBHelper.fetchRestaurantById(id)
      .then((restaurant) => {
        self.restaurant = restaurant;
        fillRestaurantHTML();
        resolve(restaurant);
      })
      .catch((error) => {
        reject(error);
      });
    }
  });
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.src = '/img/placeholder.png';
  if (restaurant.photograph) {
    if (observer) {
      image.dataset.src = DBHelper.imageUrlForRestaurant(restaurant);
      observer.observe(image);
    } else {
      image.src = DBHelper.imageUrlForRestaurant(restaurant);
    }
  }
  image.alt = restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
