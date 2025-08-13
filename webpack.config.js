const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    entry: './src/CascadingMultiSelect.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'CascadingMultiSelect.js',
      clean: true
    },
    devtool: isDevelopment ? 'source-map' : false,
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/CascadingMultiSelect.html',
        filename: 'CascadingMultiSelect.html',
        inject: 'body'
      })
    ],
    externals: {
      'azure-devops-extension-sdk': 'SDK',
      'azure-devops-extension-api': 'API'
    }
  };
};
