const ZipPlugin = require("zip-webpack-plugin");
const path = require("path");

const config = {
  entry: {
    QueryTester: "./QueryTester/index.js",
    Users: "./Users/index.js",
    Tags: "./Tags/index.js",
    S3upload: "./S3upload/index.js",
    Posts: "./Posts/index.js",
    WebSockets: "./WebSockets/index.js",
    AuthWebSocket: "./AuthWebSocket/index.js"
  },
  output: {
    filename: "[name]/index.js",
    path: path.resolve(__dirname, "dist/"),
    libraryTarget: "umd"
  },
  target: "node",
  mode: "production",
  optimization: { minimize: false }
};
const pluginConfig = {
  plugins: Object.keys(config.entry).map(entryName => {
    return new ZipPlugin({
      path: path.resolve(__dirname, "dist/"),
      filename: entryName,
      extension: "zip",
      include: [entryName]
    });
  })
};
const webpackConfig = Object.assign(config, pluginConfig);
module.exports = webpackConfig;
