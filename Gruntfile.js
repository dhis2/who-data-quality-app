module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		copy: {
      		build: {
	        	cwd: 'src',
	    	    src: [ 'index.html', 'manifest.webapp' ],
    	    	dest: 'build',
        		expand: true
      		},
			html: {
				cwd: 'src',
				src: [ 'module*/*.html'],
				dest: 'build',
				expand: true
			}
    	},
		clean: {
			build: {
				src: [ 'build' ]
			},
			tmp: {
				src: [ '.tmp' ]
			},
		},
		useminPrepare: {
			html: 'src/index.html',
			options: {
				dest: 'build'
			}
		},
		filerev: {
			options: {
				algorithm: 'md5',
				length: 8
			},
			images: {
				src: 'src/img/**/*.{jpg,jpeg,gif,png,webp}',
				dest: 'build/img'
			}
		},
		usemin: {
			html: 'build/index.html'
		},
		zip: {
			'using-cwd': {
				cwd: 'build/',
				src: ['build/**'],
				dest: 'compiled/dq.zip'

			}
		},
		uglify: {
			options: {
				mangle: false
			}
		}
	});
	
	// Load the Grunt plugins.
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-usemin');
	grunt.loadNpmTasks('grunt-filerev');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-zip');

	grunt.registerTask(
		'build',
		'Compiles all of the assets and copies the files to the build directory.',
		[
			'clean',
			'copy:build',
			'useminPrepare',
			'concat:generated',
			'cssmin:generated',
			'uglify:generated',
			'filerev',
			'usemin',
			'copy:html',
			'zip',
			'clean:tmp'
		]
	);
};