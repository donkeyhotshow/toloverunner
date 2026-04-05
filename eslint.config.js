import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        ignores: ['dist', 'node_modules', 'server', 'scripts', 'test-*.mjs'],
    },
    // Main App Logic (TS/TSX)
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.eslint.json',
            },
            globals: {
                ...globals.browser,
            }
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-hooks/immutability': 'off', // Вимкнуто для Three.js матеріалів
            // R3F/Three.js intentionally reads refs at render time for performance snapshots
            'react-hooks/refs': 'off',
            // React Compiler rule — not applicable to manual memoization in game loops
            'react-hooks/preserve-manual-memoization': 'off',
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            'no-unused-vars': 'off', // Disable base rule
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-empty': ['error', { allowEmptyCatch: true }],
            'no-console': 'off'
        },
    },
    // Type Definitions - Disable unused vars check
    {
        files: ['types.ts', 'src/types.ts', '**/storeTypes.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'off'
        }
    },

    // Test Files
    {
        files: ['tests/**/*.ts', 'tests/**/*.tsx', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.js'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
                global: 'writable',
                vi: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
            }
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-undef': 'off',
            '@typescript-eslint/no-unused-vars': 'off'
        }
    },
    // Node.js Scripts
    {
        files: ['scripts/**/*.js', 'scripts/**/*.ts', '*.config.js', '*.config.ts', '*.cjs'],
        languageOptions: {
            globals: {
                ...globals.node,
            }
        },
        rules: {
            '@typescript-eslint/no-var-requires': 'off',
            'no-undef': 'off' // Globals handled by languageOptions
        }
    },
    // Service Worker
    {
        files: ['public/sw.js'],
        languageOptions: {
            globals: {
                ...globals.serviceworker,
                ...globals.browser // Fetch, etc
            }
        },
        rules: {
            'no-undef': 'off',
            'no-restricted-globals': 'off'
        }
    }
];
