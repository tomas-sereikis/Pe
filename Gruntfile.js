module.exports = function (grunt) {
    grunt.initConfig({
        karma: {
            unit: {
                configFile: 'karma.conf.js'
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
                        './src/pe.js'
                    ]
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: ['src/pe.js']
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
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-karma-coveralls');

    grunt.registerTask('test', ['jshint', 'karma']);
    grunt.registerTask('build', ['test', 'uglify']);
    grunt.registerTask('travis', ['test'/*, 'coveralls'*/]);
};
