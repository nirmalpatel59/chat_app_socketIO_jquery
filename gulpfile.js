var gulp = require("gulp"),
    nodemon = require("gulp-nodemon"),
    src = ["../client/**/*.*", "../server/**/*.js"];
// ss
gulp.task("serve", function () {
    var options = {
        script: "index.js",
        delayTime: 1,
        ext: "js css html"
    };
    return nodemon(options).on("restart", function () {
        console.log("restarting the server.....");
    });
});

gulp.task("default", ['serve']);