var fs = require('fs');
var path = require('path');
var karma = require('karma').server;
var _ = require('./src/util.js');
var gulp = require('gulp');
var spawn = require('child_process').spawn;
var component = require('gulp-component');
var istanbul = require('gulp-istanbul');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var through = require('through2');
var before_mocha = require('./test/before_mocha.js');
var pkg;

try{
  pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
  pkg_bower = JSON.parse(fs.readFileSync('./bower.json', 'utf8'))
  pkg_component = JSON.parse(fs.readFileSync('./component.json', 'utf8'))
}catch(e){}


gulp.task('default', ['test'], function() {});


//one could also externalize common config into a separate file,
//ex.: var karmaCommonConf = require('./karma-common-conf.js');
var karmaCommonConf = {
  browsers: ['Chrome', 'Firefox', 'IE', 'IE9', 'IE8', 'IE7'],
  frameworks: ['mocha'],
  files: [
    'test/regular.js',
    'test/karma.js',
    'test/runner/vendor/expect.js',
    'test/runner/vendor/jquery.js',
    'test/runner/vendor/util.js',
    'test/spec/test-*.js',
    'test/spec/browser-*.js'
  ],
  client: {
    mocha: {ui: 'bdd'}
  },
  customLaunchers: {
    IE9: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE9'
    },
    IE8: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE8'
    },
    IE7: {
      base: 'IE',
      'x-ua-compatible': 'IE=EmulateIE8'
    }
  },

  // coverage reporter generates the coverage
  reporters: ['progress', 'coverage'],

  preprocessors: {
    // source files, that you wanna generate coverage for
    // do not include tests or libraries
    // (these files will be instrumented by Istanbul)
    'test/regular.js': ['coverage']
  },

  // optionally, configure the reporter
  coverageReporter: {
    type : 'html',
    dir : 'karma-coverage/'
  }
};

/**
 * Run test once and exit
 */
gulp.task('karma', function (done) {
  karma.start(_.extend(karmaCommonConf, {singleRun: true}), done);
});


gulp.task('build', function(){
  // form minify    
  gulp.src('./component.json')
    .pipe(component.scripts({
      standalone: 'Regular',
      name: 'regular'
    }))
    .pipe(wrap(signatrue))
    .pipe(gulp.dest('dist'))
    .pipe(wrap(mini))
    .pipe(uglify())
    .pipe(gulp.dest('dist'))
    .on('error', function(err){
      console.log(err)
    })

  // for test
  gulp.src('./component.json')
    .pipe(component.scripts({
      name: 'regular'
    }))
    .pipe(wrap(signatrue))
    .pipe(gulp.dest('test'))

})


// gulp v  -0.0.1
gulp.task('v', function(fn){
  var version = process.argv[3].replace('-',"");
  pkg.version = version
  pkg_component.version = version
  pkg_bower.version = version
  try{
    fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2), 'utf8');           
    fs.writeFileSync('./component.json', JSON.stringify(pkg_component, null, 2), 'utf8');
    fs.writeFileSync('./bower.json', JSON.stringify(pkg_bower, null, 2), 'utf8');
  }catch(e){
    console.error('update version faild' + e.message)
  }
})


gulp.task('dev', function(){
  gulp.watch(['component.json', 'src/**/*.js'], ['build'])
})

gulp.task('dev-test', function(){
  gulp.watch(['src/**/*.js', 'test/spec/**/*.js'], ['build','mocha'])
})



gulp.task('jshint', function(){
      // jshint
  gulp.src(['src/**/*.js','test/spec/test-*.js'])
      .pipe(jshint())
      .pipe(jshint.reporter('default'))

})

gulp.task('cover', function(cb){
  before_mocha.dirty();
  gulp.src(['src/**/*.js'])
    .pipe(istanbul()) // Covering files
    .on('end', function () {
      gulp.src(['test/spec/test-*.js'])
        .pipe(mocha())
        .pipe(istanbul.writeReports('./test/coverage')) // Creating the reports after tests runned
        .on('end', cb);
    });
})

gulp.task('test', ['mocha', 'casper', 'karma'])

// for travis
gulp.task('travis', ['build', 'mocha', 'casper']);

gulp.task('mocha', function() {

  before_mocha.dirty();

  return gulp.src(['test/spec/test-*.js'])
      .pipe(mocha({reporter: 'spec' }) )
      .on('error', function(){
        gutil.log.apply(this, arguments);
        console.log('\u0007');
      })
      .on('end', function(){
        before_mocha.clean();
      });

});


gulp.task('casper', function(){
  var casperjs = spawn('casperjs', ['test','--concise', 'spec'], {
     cwd: path.resolve('test/fixtures')
  })

  casperjs.stdout.on('data', function (data) {
    console.log(""+ data);
  });
  casperjs.stderr.on('data', function (data) {
  console.log('stderr: ' + data);
  });

  casperjs.on('close', function (code) {
    console.log('casperjs test compelete!');
  });

})



function wrap(fn){
  return through.obj(fn);
}

function signatrue(file, enc, cb){
  var sign = '/**\n'+ '@author\t'+ pkg.author.name + '\n'+ '@version\t'+ pkg.version +
    '\n'+ '@homepage\t'+ pkg.homepage + '\n*/\n';
  file.contents =  Buffer.concat([new Buffer(sign), file.contents]);
 cb(null, file);
}

function mini(file, enc, cb){
  file.path = file.path.replace('.js', '.min.js');
  cb(null, file)
}