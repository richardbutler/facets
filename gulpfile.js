var gulp    = require('gulp'),
    uglify  = require('gulp-uglify'),
    rename  = require('gulp-rename'),
    mocha   = require('gulp-mocha');

gulp.task('scripts', function() {
    return gulp.src('facet.js')
        .pipe(rename('facet.min.js'))
        .pipe(uglify({
            outSourceMap: true,
            preserveComments: 'some'
        }))
        .pipe(gulp.dest('.'));
});

gulp.task('tests', function() {
    return gulp.src('test/*.spec.js')
        .pipe(mocha({ reporter: 'spec' }));
});

gulp.task('default', ['tests', 'scripts']);