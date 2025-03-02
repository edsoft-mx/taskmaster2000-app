const { app, BrowserWindow, Menu, ipcMain } = require('electron');

const url = require("url");
const path = require("path");

let mainWindow

function createMenu() {

    var menu = Menu.buildFromTemplate([
        {
            label: 'Menu',
            submenu: [
                {label:'Home',
                    click(){
                        console.log("Navigate to Home");
                        mainWindow.webContents.send('goToHome');
                    }

                },
                {label:'About',

                    click(){
                        console.log("Navigate to About");
                        mainWindow.webContents.send('goToAbout');
                    }},
                {label:'Exit',
                    click() {
                        app.quit()
                    }}
            ]
        }
    ])
    Menu.setApplicationMenu(menu);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 1080,
        webPreferences: {
            preload: path.join(__dirname, './dist/preload.js'),
            //nodeIntegration: true,
            devTools: true,
            //allowRunningInsecureContent: false, contextIsolation: true, sandbox: false
        }
    })
    mainWindow.webContents.openDevTools();
    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, './dist/index.html'),
            protocol: "file:",
            slashes: true
        })
    );
    mainWindow.on('closed', function () {
        mainWindow = null
    })
    createMenu()
}
console.log(app);
app.on('ready', createWindow)

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
    if (mainWindow === null) createWindow()
})