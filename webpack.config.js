/* eslint-disable*/
const path = require('path');
const Dist = path.resolve(__dirname, './public/dist');
const isDev = process.argv[3] === 'development';

module.exports = {
    entry: {
        app: './app/init.js',
    },
    output: {
        path: Dist,
        filename: 'build.js'
    },
    devtool: isDev && 'eval-source-map',
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
                loader: "babel-loader"
            }
        }, {
            test: /\.(html)$/,
            use: {
                loader: 'html-loader'
            }
        }]
    },
    resolve: {
        alias: {
            // Env: path.resolve(__dirname, "env/"),
            // Src: path.resolve(__dirname, "src/"),
        }
    },
    plugins: [],
    watchOptions: {
        ignored: ['node_modules']
    }
};

if (isDev) {
    // ls = exec('nodemon server --watch server --ignore server/public');
    // ls.stdout.on('data', data => console.log('\x1b[35m', 'Server:', data.replace('\n', '')));
} else {
    // setTimeout(()=>{
    //     console.log('Start JavaScriptObfuscator');
    //     const fs = require('fs');
    //     const fileName = Dist + '/build.js';
    //     const code = fs.readFileSync(fileName, 'utf8');
    //     const JavaScriptObfuscator = require('javascript-obfuscator');
    //     const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
    //         compact: true,
    //         controlFlowFlattening: true
    //     });

    //     const newCode = obfuscationResult.getObfuscatedCode();
    //     fs.writeFileSync(fileName, newCode);
    //     console.log('done;');
    // }, 25000);
}
