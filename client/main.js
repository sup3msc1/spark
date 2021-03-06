const path = require('path');

const {
    app, BrowserWindow, Menu,
} = require('electron');

const DEV = process.argv.find(v => v.startsWith('dev')) !== undefined;
if (DEV) {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    require('electron-debug')();
    const p = path.join(__dirname, '..', 'app', 'node_modules');
    require('module').globalPaths.push(p); // eslint-disable-line global-require
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

function installExtensions(then) {
    if (DEV) {
        const {
            default: installer,
            REACT_DEVELOPER_TOOLS,
            REDUX_DEVTOOLS,
            REACT_PERF,
        // eslint-disable-next-line global-require, import/no-extraneous-dependencies
        } = require('electron-devtools-installer');

        return async () => {
            await Promise.all(
                [
                    REACT_DEVELOPER_TOOLS,
                    REDUX_DEVTOOLS,
                    REACT_PERF,
                    'jdkknkkbebbapilgoeccciglkfbmbnfm',
                ]
                    .map(installer)
                    .map(prom => prom.catch(
                        console.warn.bind(console)
                    ))
            );

            then();
        };
    }

    return then;
}

let mainWindow = null;
app.on('ready', installExtensions(() => {
    mainWindow = new BrowserWindow({
        show: false,
        width: 1024,
        height: 728,
        frame: false,
    });

    mainWindow.webContents.on('context-menu', (e, props) => {
        const { x, y } = props;

        Menu.buildFromTemplate([{
            label: 'Inspect element',
            click() {
                mainWindow.inspectElement(x, y);
            },
        }]).popup(mainWindow);
    });

    if (DEV) {
        mainWindow.openDevTools();
        mainWindow.loadURL('http://localhost:8080/');
    } else {
        mainWindow.loadURL(path.resolve(__dirname, 'dist', 'index.html'));
    }

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}));
