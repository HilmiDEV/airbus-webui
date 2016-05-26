module.exports = function(grunt) {
    'use strict';

    grunt.initConfig({

        app_name: 'airbus',
        src_dir: './src',
        lib_dir: './lib',
        dist_dir: './dist',

        clean: {
            pre: {
                src: ['<%= dist_dir %>']
            },
            post: {
                src: ['<%= dist_dir %>/app-templates.js']
            }
        },
        
        jshint: {
            src: {
                options: {
                    globals: {
                        angular: false,
                        ol: false,
                        proj4: false,
                        moment: false
                    },
                    bitwise: true,
                    browser: true,
                    curly: true,
                    devel: true,
                    eqnull: true,
                    eqeqeq: true,
                    forin: true,
                    freeze: true,
                    immed: true,
                    jquery: true,
                    loopfunc: true,
                    noarg: true,
                    noempty: true,
                    nonew: true,
                    undef: true
                },
                src: ['<%= src_dir %>/**/*.js']
            }
        },

        copy: {
            src: {
                files: [
                    {
                        src: ['index.html', 'settings.json'],
                        cwd: '<%= src_dir %>',
                        dest: '<%= dist_dir %>',
                        expand: true
                    },
                    {
                        src: ['**'],
                        cwd: '<%= src_dir %>/assets',
                        dest: '<%= dist_dir %>',
                        expand: true
                    }
                ]
            },
            lib: {
                files: [
                    {
                        src: ['<%= lib_dir %>/*/js/*.js'],
                        dest: '<%= dist_dir %>/js',
                        expand: true,
                        flatten: true
                    },
                    {
                        src: ['<%= lib_dir %>/*/css/*.css'],
                        dest: '<%= dist_dir %>/css',
                        expand: true,
                        flatten: true
                    },
                    {
                        src: ['<%= lib_dir %>/*/fonts/*'],
                        dest: '<%= dist_dir %>/fonts',
                        expand: true,
                        flatten: true
                    },
                    {
                        src: ['<%= lib_dir %>/*/img/*'],
                        dest: '<%= dist_dir %>/img',
                        expand: true,
                        flatten: true
                    }
                ]
            }
        },

        less: {
            src: {
                options: {
                    compress: true,
                    cleancss: true
                },
                files: {
                    '<%= dist_dir %>/css/app.css': '<%= src_dir %>/app.less'
                }
            }
        },

        html2js: {
            src: {
                options: {
                    module: '<%= app_name %>.templates',
                    singleModule: true,
                    htmlmin: {
                        removeComments: true,
                        collapseWhitespace: true
                    }
                },
                files: {
                    '<%= dist_dir %>/app-templates.js': '<%= src_dir %>/components/**/*.html'
                }
            }
        },

        concat: {
            src: {
                options: {
                    banner: '(function(window, angular, $) {\'use strict\';',
                    footer: '})(window, window.angular, window.jQuery);'
                },
                files: {
                    '<%= dist_dir %>/js/app.js': [
                        '<%= src_dir %>/app.js',
                        '<%= src_dir %>/shared/**/*.js',
                        '<%= src_dir %>/components/**/*.js',
                        '<%= dist_dir %>/app-templates.js'
                    ]
                }
            }
        },

        ngAnnotate: {
            src: {
                files: {
                    '<%= dist_dir %>/js/app.js': '<%= dist_dir %>/js/app.js'
                }
            }
        },

        uglify: {
            src: {
                files: {
                    '<%= dist_dir %>/js/app.js': '<%= dist_dir %>/js/app.js'
                }
            }
        },

        connect: {
            options: {
                port: 9000,
                base: '<%= dist_dir %>'
            },
            default: {
                options: {

                }
            },
            keepalive: {
                options: {
                    keepalive: true
                }
            }
        },

        watch: {
            src: {
                options: {
                    spawn: false
                },
                tasks: ['update'],
                files: ['<%= src_dir %>/**']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-html2js');
    grunt.loadNpmTasks('grunt-ng-annotate');

    grunt.registerTask('build', ['clean:pre', 'jshint', 'copy', 'less', 'html2js', 'concat', 'ngAnnotate', 'uglify', 'clean:post']);
    grunt.registerTask('serve', ['connect:keepalive']);
    grunt.registerTask('dev', ['clean:pre', 'jshint', 'copy', 'less', 'html2js', 'concat', 'clean:post', 'connect:default', 'watch']);
    grunt.registerTask('update', ['jshint:src', 'copy:src', 'less:src', 'html2js:src', 'concat:src', 'clean:post']);
};