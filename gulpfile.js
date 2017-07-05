var gulp = require('gulp');
// 將只要屬於gulp-xxxx的套件，都不用在require，當要用到的時候使用$.xxxx就可以
var $ = require('gulp-load-plugins')();

// jade 轉 html
// var jade = require('gulp-jade');
// sass 轉 css
// var sass = require('gulp-sass');
// 當執行watch時候，若有錯誤不會中斷
// var plumber = require('gulp-plumber');
// 前綴詞
// var postcss = require('gulp-postcss');
// 前綴詞
var autoprefixer = require('autoprefixer');
// 合併bower
var mainBowerFiles = require('main-bower-files');
// 伺服器建立
var browserSync = require('browser-sync').create();


var minimist = require('minimist')
/**
 * minimist 使用方法
 * 會先宣告環境參數
 */
var envOptions = {
    string: 'env',
    default: {
        env: 'develop'
    }
}

var options = minimist(process.argv.slice(2), envOptions)

console.log(options);



/**
 * src是指來源，dest是指輸出
 * gulp執行的時候幾乎是每個task都同時執行
 */

// 清除資料夾
gulp.task('clean', function () {
    return gulp.src(['./.temp', './public'], {
            read: false
        })
        .pipe($.clean());
});

gulp.task('copyHtml', function () {
    return gulp.src('./source/**/index.html')
        .pipe($.plumber())
        // html 壓縮
        .pipe($.if(options.env == 'prod', $.htmlMinifier({collapseWhitespace: true})))
        .pipe($.fileInclude())
        .pipe(gulp.dest('./public/'))
        // 偵測重新整理
        .pipe(browserSync.stream());
})

gulp.task('jade', function () {
    return gulp.src('./source/**/*.jade')
        .pipe($.plumber())
        // 轉html
        .pipe($.jade({
            // 壓縮設定
            // pretty: true
        }))
        .pipe(gulp.dest('./public/'))
        // 偵測重新整理
        .pipe(browserSync.stream());
});



//autoprefixer要搭配postcss
gulp.task('sass', function () {
    // 前綴詞
    var plugins = [
        autoprefixer({
            browsers: ['last 3 version', '>5%', 'ie 8']
        })
    ];

    return gulp.src('./source/scss/**/*.scss')
        .pipe($.plumber())
        // sourcemap 功能是可以再bowser下看到你原本程式的位置
        .pipe($.sourcemaps.init())
        // 轉css
        .pipe($.sass().on('error', $.sass.logError))
        // 前綴詞
        .pipe($.postcss(plugins))
        // 因為gulp-min-css 已經deprecated 所以改用gulp-clean-css
        // 利用if加上minimist控制要不要壓縮
        .pipe($.if(options.env == 'prod', $.cleanCss()))
        // sourcemap 功能是可以再bowser下看到你原本程式的位置
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('./public/css/'))
        // 偵測重新整理
        .pipe(browserSync.stream());
});

// es6 轉譯
gulp.task('babel', () => {
    return gulp.src('./source/js/**/*.js')
        // sourcemap 功能是可以再bowser下看到你原本程式的位置
        .pipe($.sourcemaps.init())
        .pipe($.babel({
            presets: ['es2015']
        }))
        // 用來合併檔案
        .pipe($.concat('all.js'))
        .pipe($.if(options.env == 'prod', $.uglify({
            // 可以設定將有console的東西移除
            compress: {
                // 避免手動移除
                drop_console: true
            }
        })))
        // sourcemap 功能是可以再bowser下看到你原本程式的位置
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('./public/js'))
        // 偵測重新整理
        .pipe(browserSync.stream());
});

// 將用bower所載的js輸出
gulp.task('bower', function (callback) {
    return gulp.src(mainBowerFiles({
            // 因為vue會抓不到路徑，所以我們指定她js位置讓他抓取
            "overrides": {
                "vue": { // 套件名稱
                    "main": "dist/vue.js" // 取用的資料夾路徑
                }
            }
        }))
        .pipe(gulp.dest('./.temp/vendors'))
    callback();
});

// bower這個task產生好檔案後合併js
// 要等待上面bower執行後才執行這個task
// 在default的task就必須移除bower這個task
// order是載入順序的套件
gulp.task('vendorJs', ['bower'], function () {
    return gulp.src('.temp/vendors/**/**.js')
        // js排序
        .pipe($.order([
            'jquery.js',
            'bootstrap.js'
        ]))
        // 合併檔案
        .pipe($.concat('vendors.js'))
        .pipe($.if(options.env == 'prod', $.uglify()))
        .pipe(gulp.dest('./public/js'));
});

// 建立local伺服器server
// 可以自訂路徑位置為public
gulp.task('browser-sync', function () {
    browserSync.init({
        server: {
            // 可以指定要啟動server的檔案位置
            baseDir: "./public"
        },
        // 可以指定port
        port: 8080
    });
});

// 壓縮圖片在開發環境就不執行壓縮，否則要很久
gulp.task('image-min', () =>
    gulp.src('./source/images/*')
    .pipe($.if(options.env == 'prod', $.imagemin()))
    .pipe(gulp.dest('./public/images'))
);

// 執行監控，針對scss檔案如果有變動就去執行sass這個task
gulp.task('watch', function () {
    gulp.watch('./source/scss/**/*.scss', ['sass']);
    gulp.watch('./source/**/*.jade', ['jade']);
    gulp.watch('./source/**/*.html', ['copyHtml']);

});


// 透過gulp-sequence，將要交付的程式碼產出
gulp.task('build', $.sequence('clean', 'copyHtml', 'sass', 'babel', 'vendorJs'))


// 可以按照順序執行一連串的task
gulp.task('default', ['copyHtml', 'sass', 'babel', 'vendorJs', 'browser-sync', 'image-min', 'watch']);
