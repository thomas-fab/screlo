module.exports = function(grunt) {
    
    var package = require('./package.json'),
        version = package.version;
    
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-preprocess');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('default', ['copy', 'preprocess:prod', 'browserify', 'concat:userscript', 'clean', 'watch']);

    grunt.initConfig({
        copy: {
            main: {
                expand: true,
                cwd: 'src/',
                src: '*',
                dest: 'tmp/',
            },
        },
        preprocess : {
            options: {
                context : {
                    VERSION: version
                }
            },
            dev : {
                src : 'tmp/*',
                options: {
                    inline: true,
                    context : {
                        DEV: true
                    }
                }
            },
            prod : {
                src : 'tmp/*',
                options: {
                    inline: true
                }
            }
        },
        browserify: {
            main: {
                src: 'tmp/main.js',
                dest: 'tmp/bundle.js'
            }
        },
        concat: {
            options: {
                separator: '\n',
            },
            userscript: {
                src: ['tmp/userscript_header.txt', 'tmp/bundle.js'],
                dest: 'js/screlo.user.js'
            }
        },
        clean: ['tmp/*'],
        watch: {
            files: 'src/*',
            tasks: ['default']
        }
    });
}