module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      js: {
        files: [
          'src/*/*.js',
          'Gruntfile.js'
        ],
        tasks: ['jshint']
      }
    }, 
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: ['Gruntfile.js', 'src/app.js', 'src/module*/*.js']
    }
  });
  
  // Load the Grunt plugins.
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Register the default tasks.
  grunt.registerTask('default', ['watch']);
};