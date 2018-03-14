"use strict";
const gulp = require("gulp");
const merge2 = require("merge2");
const sourcemaps = require("gulp-sourcemaps");
const typescript = require("gulp-typescript");

const tslint = require("gulp-tslint");

// use tsconfig.json
const tsProject = typescript.createProject("tsconfig.json");
gulp.task("tsc", () => {
	let tsr = gulp.src("src/**/*.ts")
		.pipe(tsProject());
	return merge2([
		tsr.dts.pipe(gulp.dest("dist/")),
		tsr.js.pipe(sourcemaps.write()).pipe(gulp.dest("dist"))
	]);
});

gulp.task("watch-tsc", ["tsc"], () => {
	gulp.watch("src/**/*.ts", ["tsc"]);
});

gulp.task("tslint", () => {
	return gulp.src("src/**/*.ts")
		.pipe(tslint({
			formatter: "verbose"
		}))
		.pipe(tslint.report());
});

gulp.task("watch-tslint", ["tslint"], () => {
	gulp.watch("src/**/*.ts", ["tslint"]);
});

gulp.task("default", ["tsc", "tslint"]);
gulp.task("watch", ["watch-tsc", "watch-tslint"]);
