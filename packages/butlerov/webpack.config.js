// eslint-disable-next-line
const path = require("path");
// eslint-disable-next-line
module.exports = {
    entry: "./src/main.ts",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "butlerov.js",
        library: "butlerov",
        libraryTarget: "umd",
        // eslint-disable-next-line
        path: path.resolve(__dirname, "dist"),
        globalObject: "this",
    },
};
