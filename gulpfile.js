var gulp = require('gulp');
var uglify = require('gulp-uglifyes');
var concat = require('gulp-concat');

var js = {
  main: [
    './vendor/idb/idb.js',
    './js/dbhelper.js',
    './js/main.js'
  ],
  restaurant: [
    './vendor/idb/idb.js',
    './js/dbhelper.js',
    './js/offlinedbhelper.js',
    './js/restaurant_info.js'
  ]
}

gulp.task('scripts_main', function() {
    return gulp.src(js.main)
        .pipe(concat('main.js'))
        .pipe(uglify({ 
          mangle: false, 
          ecma: 6 
        }))
        .pipe(gulp.dest('dist/js'));
});

gulp.task('scripts_restaurant', function() {
    return gulp.src(js.restaurant)
        .pipe(concat('restaurant.js'))
        .pipe(uglify({ 
          mangle: false, 
          ecma: 6 
        }))
        .pipe(gulp.dest('dist/js'));
});

gulp.task('build', ['scripts_main', 'scripts_restaurant']);