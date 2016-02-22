module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		copy: {
      		core: {
	        	cwd: 'src',
	    	    src: [ 'index.html', 'manifest.webapp' ],
    	    	dest: 'build',
        		expand: true
      		},
			content: {
				cwd: 'src',
				src: [ 'module*/*.html', 'app*/*.html', 'img/icons/*', 'data/**', 'fonts/**'],
				dest: 'build',
				expand: true
			},
			concat: {
				cwd: '.tmp/concat',
				src: [ '**' ],
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
				src: 'src/img/*.{jpg,jpeg,gif,png,webp}',
				dest: 'build/img'
			}
		},
		usemin: {
			html: 'build/index.html'
		},
		uglify: {
			options: {
				mangle: true
			}
		},
		zip: {
			'using-cwd': {
				cwd: 'build/',
				src: ['build/**'],
				dest: 'compiled/dq.zip'

			}
		},
		rsync: {
			options: {
				args: [""],
				exclude: ["manifest.webapp"],
				recursive: true
			},
			dev: {
				options: {
					src: "build/",
					dest: "/Users/Olav/DHIS/tomcat_stable/dhis2_home/apps/dq",
					delete: true
				}
			}
		},
		watch: {
			cwd: 'src',
			files: ['src/**'],
			tasks: ['reload-dev']
		},
		cachebreaker: {
			dev: {
				options: {
					match: [
						{
							'libs.js': 'build/core/libs.js',
							'components.js': 'build/core/components.js',
							'app.js': 'build/core/app.js',
							'commons.js': 'build/core/commons.js',
							'services.js': 'build/core/services.js',
							'about.js': 'build/moduleAbout/about.js',
							'admin.js': 'build/moduleAdmin/admin.js',
							'consistency.js': 'build/moduleConsistency/consistency.js',
							'dictionary.js': 'build/moduleDictionary/dictionary.js',
							'outlierGap.js': 'build/moduleOutlierGap/outlierGap.js',
							'dashboard.js': 'build/moduleDashboard/dashboard.js',
							'export.js': 'build/moduleExport/export.js',
							'review.js': 'build/moduleReview/review.js'
						}
					],
					replacement: 'md5'
				},
				files: {
					src: ['build/index.html']
				}
			}
		}
	});
	
	// Load the Grunt plugins.
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-usemin');
	grunt.loadNpmTasks('grunt-filerev');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-zip');
	grunt.loadNpmTasks("grunt-rsync");
	grunt.loadNpmTasks('grunt-cache-breaker');

	grunt.registerTask(
		'build',
		'Builds app, with minimsed resources',
		[
			'clean',
			'copy-build',
			'concat-min',
			'cachebreaker',
			'zip',
			'clean:tmp'
		]
	);

	grunt.registerTask(
		'build-dev',
		'Builds app, wihtout minimising js or css',
		[
			'clean',
			'copy-build',
			'concat-only',
			'cachebreaker'
		]
	);

	grunt.registerTask(
		'build-dev-zip',
		'Builds app, wihtout minimising js or css',
		[
			'build-dev',
			'zip',
		]
	);

	grunt.registerTask(
		'copy-build',
		'Copies resources (except js and css), move to build',
		[
			'copy:core',
			'copy:content'
		]
	);

	grunt.registerTask(
		'concat-only',
		'Concat js and css, move to build',
		[
			'useminPrepare',
			'concat:generated',
			'filerev',
			'usemin',
			'copy:concat',
		]
	);

	grunt.registerTask(
		'concat-min',
		'Concat and minimise js and css, move to build',
		[
			'useminPrepare',
			'concat:generated',
			'cssmin:generated',
			'uglify:generated',
			'filerev',
			'usemin'
		]
	);

	grunt.registerTask(
		'reload-dev',
		'Make dev build and copy to server',
		[
			'build-dev',
			'rsync:dev'
		]
	);

};