module.exports = {
    roots: ['<rootDir>/src', '<rootDir>/__tests__'],
    "testMatch": [
        "**/__tests__/**/*.+(spec|test).+(ts|tsx|js)",
        "**/?(*.)+(spec|test).+(ts|tsx|js)"
    ],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    coverageThreshold: {
        global: {
            branches: 65,
            functions: 80,
            lines: 75,
            statements: 80
        }
    },
    coverageReporters: ['json', 'lcov', 'text', 'clover']
}