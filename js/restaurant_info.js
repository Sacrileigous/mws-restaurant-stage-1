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
  const script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyClViRpLh2mA3D_Gn5PYcjXsTo2v91ujMs&libraries=places&callback=initMap';
  document.getElementsByTagName('body')[0].appendChild(script);

  // Request restaurant to render.
  fetchRestaurantFromURL()
  .then(restaurant => {
    fillBreadcrumb();
    if (!self.map && mapLoaded) {
      self.initMap();
    }
    fetchRestaurantReviewsFromURL()
    .then(reviews => {
        // fill reviews
        fillReviewsHTML();
    });
  })
  .catch((error) => {
    // Got an error!
    console.error(error);
  });

  // Map initialization on resize.
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 992 && !self.map) {
        self.initMap();
    }
  });

  // Add form handlers.
  const form = document.getElementById('add-review');
  form.addEventListener('submit', submitForm);

  // Add offline reviews handlers.
  if (navigator.onLine) {
    processOfflineReviews();
  }
  window.addEventListener('online', e => {
    processOfflineReviews();
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
 * Initialize Google map, called from HTML.
 */
window.initMap = (forceRender = false) => {
  if (!self.map && self.restaurant) {
    if (window.innerWidth >= 992 || forceRender) {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: self.restaurant.latlng,
        scrollwheel: false
      });
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
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
 * Get current restaurant from page URL.
 */
fetchRestaurantReviewsFromURL = () => {
  return new Promise((resolve, reject) => {
    if (self.restaurant.reviews) { // restaurant reviews already fetched!
      resolve(self.restaurant.reviews);
      return;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
      const error = 'No restaurant id in URL';
      reject(error);
    } else {
      DBHelper.fetchRestaurantReviewsById(id)
      .then((reviews) => {
        self.restaurant.reviews = reviews;
        resolve(reviews);
      })
      .catch((error) => {
        reject(error);
      });
    }
  });
};

/**
 * Create restaurant HTML and add it to the webpage.
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

  const formRestaurantId = document.getElementById('form-restaurant-id');
  formRestaurantId.value = restaurant.id;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  updateFavouriteToggleHTML();
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
  date.innerHTML = new Date(review.createdAt).toLocaleString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}/5`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu.
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Toggle restaurant favorite state.
 */
toogleFavourite = (restaurant = self.restaurant) => {
  restaurant.is_favorite = restaurant.is_favorite === 'true' ? 'false' : 'true';
  DBHelper.toogleRestaurantFavourite(restaurant.id, restaurant.is_favorite);
  updateFavouriteToggleHTML();
};

/**
 * Update favourite toogle button html.
 */
updateFavouriteToggleHTML = (restaurant = self.restaurant) => {
  const button = document.getElementById('restaurant-favourite');
  const text = button.getElementsByClassName('.visually-hidden');
  if (restaurant.is_favorite === 'true') {
    button.classList.add('active');
    text.innerHTML = 'Unmark as favourite';
  } else {
    button.classList.remove('active');
    text.innerHTML = 'Mark as favourite';
  }
};

/**
 * Form submit handler.
 */
submitForm = e => {
  e.preventDefault();
  const formData = new FormData(e.srcElement);
  const data = {};
  formData.forEach(function(value, key) {
    data[key] = value;
  });

  DBHelper.postRestaurantReview(data.restaurant_id, formData)
  .then(review => {
    const ul = document.getElementById('reviews-list');
    ul.appendChild(createReviewHTML(review));

    const message = document.createElement('p');
    message.classList.add('message');
    message.classList.add('message--success');
    message.innerHTML = 'Review has been successfully submited!';

    const formContainer = document.getElementById('add-review-container');
    formContainer.appendChild(message);

    const form = document.getElementById('add-review');
    form.remove();
  })
  .catch(error => {
    const message = document.createElement('p');
    message.classList.add('message');
    message.classList.add('message--error');
    if (navigator.onLine) {
      message.innerHTML = 'Faled to submit review! Please try again later.';
    } else {
      message.innerHTML = 'You are offline. Review will be autosubmited when you go online.';
      OfflineDBHelper.storeReview(data);
    }
    const formContainer = document.getElementById('add-review-container');
    formContainer.appendChild(message);

    const form = document.getElementById('add-review');
    form.remove();
  });
};

/**
 * Process offline reviews.
 */
processOfflineReviews = () => {
  OfflineDBHelper.getReviewsIndex()
  .then(index => {
    if (index) {
      index.count()
      .then(count => {
        if (count) {
          index.openCursor()
          .then(postReview = (cursor) => {
            if (!cursor) return;
            const values = cursor.value;
            DBHelper.postRestaurantReview(values.restaurant_id, JSON.stringify(values))
            .then(review => {
              if (review) {
                const ul = document.getElementById('reviews-list');
                ul.appendChild(createReviewHTML(review));
              }
            })
            .then(() => {
              // We have to redo all the rpocess because transaction has already been complete.
              processOfflineReviews();
            });
            cursor.delete();
          });
        }
      });
    }
  });
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