module.exports = {
    parser: 'babel-eslint',
    extends: 'airbnb',
    env: {
        browser: true,
        mocha: true,
        node: true,
    },
    rules: {
        'linebreak-style': ['error', 'windows'],
        'indent': ['error', 4, {
            SwitchCase: 1,
        }],
        'arrow-parens': ['off'],
        'consistent-return': 'error',
        'comma-dangle': ['error', 'always-multiline'],
        'no-use-before-define': 'off',
        'no-duplicate-imports': 'off',
        'no-plusplus': 'off',
        'class-methods-use-this': 'off',
        'no-console': 'off',

        'flowtype-errors/show-errors': 'error',

        'react/jsx-first-prop-new-line': ['off'],
        'react/jsx-closing-bracket-location': ['off'],
        'react/jsx-indent': ['error', 4],
        'react/jsx-indent-props': ['error', 4],
        'react/jsx-filename-extension': ['error', {
            extensions: ['.js', '.jsx'],
        }],

        'promise/param-names': 2,
        'promise/always-return': 2,
        'promise/catch-or-return': 2,
        'promise/no-native': 0,

        /*'graphql/template-strings': ['error', {
            env: 'apollo',
            schemaJson: require('../server-graphql/data/schema.json'),
        }],*/
  },
    plugins: [
        'flowtype-errors',
        'import',
        'promise',
        'react',
        'graphql',
    ],
    settings: {
        'import/resolver': {
            webpack: {
                config: 'webpack.config.js',
            },
        },
    },
};
