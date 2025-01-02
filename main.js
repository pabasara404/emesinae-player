const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;
const configPath = path.join(app.getPath('userData'), 'config.json');

// Load configuration
const loadConfig = () => {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath);
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error loading config:', err);
    }
    return { folders: [] };
};

// Save configuration
const saveConfig = (config) => {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Error saving config:', err);
    }
};

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'renderer.js'),
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('index.html');

    const config = loadConfig();
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('load-folders', config.folders);
    });
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    if (result.filePaths.length > 0) {
        const config = loadConfig();
        if (!config.folders.includes(result.filePaths[0])) {
            config.folders.push(result.filePaths[0]);
            saveConfig(config);
        }
        return result.filePaths[0];
    }
    return null;
});
