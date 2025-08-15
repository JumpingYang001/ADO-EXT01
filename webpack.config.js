const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    entry: {
      CascadingMultiSelect: './src/CascadingMultiSelect.ts',
      IdentityMultiSelect: './src/IdentityMultiSelect.ts'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
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
        chunks: ['CascadingMultiSelect'],
        inject: 'body',
        scriptLoading: 'blocking'
      }),
      new HtmlWebpackPlugin({
        template: './src/IdentityMultiSelect.html',
        filename: 'IdentityMultiSelect.html',
        chunks: ['IdentityMultiSelect'],
        inject: 'body',
        scriptLoading: 'blocking'
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'src/VSS.SDK.min.js',
            to: 'VSS.SDK.min.js'
          }
        ]
      })
    ]
    // Removed externals since we're not using SDK imports anymore
  };
};
