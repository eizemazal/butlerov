export default {
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageProvider: "v8",
    moduleFileExtensions: [
        "js",
        "jsx",
        "ts",
        "tsx",
        "json",
        "node"
    ],
    testEnvironment: "jsdom",
    testMatch: [
        "**/__tests__/**/*.[jt]s?(x)",
        "**/?(*.)+(spec|test).[tj]s?(x)"
    ],
    transform: {
        "^.+\\.(t|j)sx?$": "ts-jest"
    },
};
