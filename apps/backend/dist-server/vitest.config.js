"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    resolve: {
        extensions: ['.ts', '.js', '.json', '.node'],
    },
    test: {
        include: ['tests/**/*.test.js', 'tests/**/*.test.ts'],
    },
});
