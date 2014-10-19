module.exports = function (grunt) {
    grunt.initConfig({
        karma: {
            unit: {
                configFile: 'karma.conf.js'
            }
        },
        concat: {
            options: {
                process: function (src) {
                    return src.replace(/\/\* BUILD REMOVE \*\/(.*)(\r?\n)?/g, '');
                }
            },
            library: {
                src: [
                    './src/.prefix',
                    './src/pe.js',
                    './src/define.js',
                    './src/.suffix'
                ],
                dest: './dist/pe.js'
            }
        },
        uglify: {
            library: {
                options: {
                    sourceMap: true,
                    sourceMapName: './dist/pe.min.js.map'
                },
                files: {
                    './dist/pe.min.js': [
                        './dist/pe.js'
                    ]
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: ['src/**/*.js']
        },
        coveralls: {
            options: {
                coverage_dir: './coverage',
                dryRun: false,
                force: true,
                recursive: true
            }
        }
    });

    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-karma-coveralls');

    grunt.registerTask('test', ['jshint', 'karma']);
    grunt.registerTask('build', ['test', 'concat', 'uglify']);
    grunt.registerTask('travis', ['test', 'coveralls']);
};
