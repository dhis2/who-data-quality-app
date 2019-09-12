"use strict";

const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HTMLWebpackPlugin = require('html-webpack-plugin');
require('colors');


const dhisConfigPath = process.env.DHIS2_HOME && `${process.env.DHIS2_HOME}/config`;
let dhisConfig;
try {
	dhisConfig = require(dhisConfigPath); // eslint-disable-line
} catch (e) {
	// Failed to load config file - use default config
	console.warn('\nWARNING! Failed to load DHIS config:', e.message);
	dhisConfig = {
		baseUrl: 'http://localhost:8080/',
		authorization: 'Basic YWRtaW46ZGlzdHJpY3Q=', // admin:district
	};
}

const devServerPort = 8081;
const isDevBuild = process.argv[1].indexOf('webpack-dev-server') !== -1;
const scriptPrefix = (isDevBuild ? dhisConfig.baseUrl : '..');

function log(req, res, opt) {
	req.headers.Authorization = dhisConfig.authorization; // eslint-disable-line
	if (req.url.indexOf(opt.target)) {
		console.log('[PROXY]'.cyan.bold, req.method.green.bold, req.url.magenta, '=>'.dim, opt.target.dim);
	}
}


const webpackConfig = {
	context: __dirname,
	entry: './src/app.js',
	devtool: 'source-map',
	output: {
		path: __dirname + '/build',
		filename: '[name]-[hash].js',
		publicPath: isDevBuild ? 'http://localhost:8081/' : './'
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader' ],
			},
			{
				test: /\.scss$/,
				use: ['style-loader', 'css-loader', 'sass-loader' ],
			},
			{
				test: /\.html$/,
				use: { loader: "html-loader" }
			},
			{
				test: /\.png$/,
				use: { loader: "url-loader?limit=100000" }
			},
			{
				test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
				use: { loader: "url-loader?limit=10000&mimetype=application/font-woff" }
			},
			{
				test: /\.(ttf|otf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?|(jpg|gif)$/,
				use: { loader: "file-loader" }
			}
		]
	},
	resolve: {
		alias: {}
	},
	externals: [
		{
			react: 'var React',
			'react-dom': 'var ReactDOM',
			'react-addons-transition-group': 'var React.addons.TransitionGroup',
			'react-addons-create-fragment': 'var React.addons.createFragment',
			'react-addons-update': 'var React.addons.update',
			'react-addons-pure-render-mixin': 'var React.addons.PureRenderMixin',
			'react-addons-shallow-compare': 'var React.addons.ShallowCompare',
			rx: 'var Rx',
			lodash: 'var _',
		},
		/^react-addons/,
		/^react-dom$/,
		/^rx$/,],
	plugins: [
		new HTMLWebpackPlugin({
			template: 'src/index.ejs',
			vendorScripts: []
				.map(fileName => `<script src="${scriptPrefix}/dhis-web-core-resource/${fileName}"></script>`)
				.join('\n')
		}),
		new CopyWebpackPlugin([
			{from: "./src/css", to: "css"},
			{from: "./src/data", to: "data"},
			{from: "./src/img", to: "img"}
		]),
		new webpack.ProvidePlugin({
			$: "jquery",
			jQuery: "jquery",
			"window.jQuery": "jquery"
		}),
		!isDevBuild ? undefined : new webpack.DefinePlugin({
			DHIS_CONFIG: JSON.stringify(dhisConfig),
		}),
		isDevBuild ? undefined : new webpack.DefinePlugin({
			'process.env.NODE_ENV': '"production"',
			DHIS_CONFIG: JSON.stringify({}),
		}),
		isDevBuild ? undefined : new webpack.optimize.OccurrenceOrderPlugin()
	].filter(v => v),
	devServer: {
		port: devServerPort,
		inline: true,
		compress: true,
		proxy: [
			{
				path: '/polyfill.min.js',
				target: `http://localhost:${devServerPort}/node_modules/babel-polyfill/dist`,
				bypass: log,
				secure: false
			},
			{
				context: [
					'/api/**',
					'/dhis-web-commons/**',
					'/dhis-web-commons-ajax-json/**',
					'/icons/**',
					'/dhis-web-core-resource/**',
				],
				target: dhisConfig.baseUrl,
				bypass: log,
				secure: false
			}
		]
	}
}


module.exports = webpackConfig;
