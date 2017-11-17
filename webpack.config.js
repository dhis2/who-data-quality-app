"use strict";

const webpack = require("webpack");
const makeWebpackConfig = require("d2-app-base/makeWebpackConfig");
const CopyWebpackPlugin = require("copy-webpack-plugin");

let webpackConfig = makeWebpackConfig(
	/** Context - this is required and should probably be __dirname */
	__dirname

	/** App entry point - default is './src/index.js' */
	, { app: "./src/app.js" }

	/** Bundle file name */
	, "[name]-[hash].js"

	/** Template for generating index.html */
	, "./src/index.ejs"

	/** Files to include from the core resource app (eg. vendor scripts)
     * File names ending in '.??' will be expanded to '.js' in development and '.min.js' in production */
	//, [
	//     'babel-polyfill/6.20.0/dist/polyfill.??',
	//     'react/15.3.2/react-with-touch-tap-plugin.??',
	//     'rxjs/4.1.0/rx.all.??',
	//     'lodash/4.15.0/lodash.??',
	// ]

	/** webpack dev server port - default is 8081 */
	//, 8081
);

//Add plugin to copy html to build/views
let copyStaticPlugin = new CopyWebpackPlugin([
	{from: "./src/css", to: "css"},
	{from: "./src/data", to: "data"},
	{from: "./src/img", to: "img"}
]);
let providePlugin = new webpack.ProvidePlugin({
	$: "jquery",
	jQuery: "jquery",
	"window.jQuery": "jquery"
});
webpackConfig.plugins.push(copyStaticPlugin, providePlugin);



//Add loaders for bootstrap fonts and glyphicons
webpackConfig.module.loaders.push(
	{
		test: /\.html$/,
		loader: "html-loader"
	},
	{
		test: /\.png$/,
		loader: "url-loader?limit=100000"
	},
	{
		test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
		loader: "url-loader?limit=10000&mimetype=application/font-woff"
	},
	{
		test: /\.(ttf|otf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?|(jpg|gif)$/,
		loader: "file-loader"
	}
);

module.exports = webpackConfig;
