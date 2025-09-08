const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    entry: {
      CascadingMultiSelect: './src/CascadingMultiSelect.ts',
      IdentityMultiSelect: './src/IdentityMultiSelect.ts',
      'panel-content': './src/Examples/panel-content/panel-content.tsx',
      'ExampleBrowser': './src/Examples/ExampleBrowser.tsx',
      'WorkItemCountWidget': './src/Examples/WorkItemCountWidget/WorkItemCountWidget.tsx'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    devtool: isDevelopment ? 'source-map' : false,
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.scss$/,
          use: ['style-loader', 'css-loader', 'sass-loader']
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
      new HtmlWebpackPlugin({
        template: './src/Examples/panel-content/panel-content.html',
        filename: 'panel-content.html',
        chunks: ['panel-content'],
        inject: 'body'
      }),
      new HtmlWebpackPlugin({
        template: './src/Examples/ExampleBrowser.html',
        filename: 'ExampleBrowser.html',
        chunks: ['ExampleBrowser'],
        inject: 'body'
      }),
      new HtmlWebpackPlugin({
        template: './src/Examples/WorkItemCountWidget/WorkItemCountWidget.html',
        filename: 'WorkItemCountWidget.html',
        chunks: ['WorkItemCountWidget'],
        inject: 'body'
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'src/VSS.SDK.min.js',
            to: 'VSS.SDK.min.js'
          }
        ]
      })
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 3000,
      hot: true
    }
    // Removed externals since we're not using SDK imports anymore
  };
};
