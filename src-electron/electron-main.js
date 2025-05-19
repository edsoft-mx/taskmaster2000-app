import { app, BrowserWindow, session, ipcMain, protocol, net, Notification, Menu } from 'electron'
import path from 'path'
import os from 'os'
import fs from 'fs'
import url from "url";
import {pomodoroOnTimerClick, setAppConfig, pomodoroRehydrate,  addPomodoroTickSubscriber, showPomodoroMenu} from './pomodoro';
// import fetch from 'node-fetch';

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()
const { pathToFileURL } = require('url')

const readline = require('readline');
const { Readable } = require('stream');

let mainWindow = null
let pomodoroWindow = null
let toolWindows = new Map()
let taskWindows = new Map()
let epicWindows = new Map()
let timeLineData = null;

function getCookie(event, name) {
  // session.defaultSession.cookies.get({name: name}).then((error, cookies) => {
  //   return cookies
  // })
  if (name ==='session_token'){
    let conf = getConfiguration(event)
    return conf.token
  }
}

function getConfiguration(event){
  let basePath = app.getPath('userData')
  const configFile = path.join(basePath, 'config.json')
  let prevConf = null
  if (fs.existsSync(configFile)) {
    prevConf = JSON.parse(fs.readFileSync(configFile, 'utf8'))
  }
  console.log(`Retrieved configuration from ${configFile}`)
  setAppConfig(prevConf)
  return prevConf
}

async function getLocalNote(event, notePath){
  console.log(`Retrieving local note from ${notePath}...`)
  console.log(event)
  console.log(notePath)
  let note=null
  if (fs.existsSync(notePath)) {
    note = fs.readFileSync(notePath, 'utf8')
  }
  return note
}

function getMenu(){
  return [
    {
      label: 'File',
      submenu: [
        {role: 'quit'}
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ]
    },
    {
      label: 'View',
      submenu: [
        { type: 'normal', label: 'Timeline', click: ()=>openTimeline()},
        { type: 'normal', label: 'Pomodoro Timer', click: ()=>openPomodoroTimerWindow()},
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
  ]
}



async function createMainWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
    width: 1200,
    height: 800,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-webpack/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD)
    }
  })
  //console.log('main APP URL:')
  console.log(`Loading main window @ ${process.env.APP_URL}`)
  //console.log('loading tm2000://#/')
  //mainWindow.loadURL(`tm2000://app/`) //${process.env.APP_URL}

  mainWindow.loadURL(process.env.APP_URL) //${process.env.APP_URL}
  const menu = Menu.buildFromTemplate(getMenu())
  Menu.setApplicationMenu(menu)
  ipcMain.handle('function:getCookie', getCookie)
  // ipcMain.on('pomodoro-notification', async (event, message)=>{
  //   console.log(`notification: ${message}`)
  //   new Notification({
  //     title: 'TM2000/Pomodoro',
  //     body: message
  //   }).show()
  // })
  ipcMain.on('tm2000-openPage', (event, page, params=null)=>{
    openWindow(page, params)
  })
  ipcMain.on('tm2000-openTaskPage', (event, page, params=null)=>{
    openTaskWindow(page, params)
  })
  ipcMain.on('tm2000-openEpicPage', (event, page, params=null)=>{
    openEpicWindow(page, params)
  })
  ipcMain.handle('function:getConfiguration', getConfiguration)
  ipcMain.handle('function:getLocalNote', getLocalNote)
  ipcMain.handle('function:getSharedTimeline', ()=>{return timeLineData})

  ipcMain.on('save-configuration', (event, config)=>{
    let basePath = app.getPath('userData')
    const configFile = path.join(basePath, 'config.json')
    let prevConf = {}
    if (fs.existsSync(configFile)) {
      prevConf = JSON.parse(fs.readFileSync(configFile, 'utf8'))
    }
    let newConf = {...prevConf, ...config}
    fs.writeFileSync(configFile, JSON.stringify(newConf))
    // console.log(`Updated configuration on ${configFile}`)
  })
  ipcMain.on('pomodoro-timer-click', (event, task) => {
    pomodoroOnTimerClick(task)
  })
  ipcMain.on('share-timeline', (event, data) => {
    console.log(data)
    timeLineData = data
  })
  ipcMain.on('pomodoro-menu-click', (event) => {
    showPomodoroMenu()
  })
  addPomodoroTickSubscriber((message)=>{
    mainWindow.webContents.send('pomodoro-tick', message)
  })
  await getConfiguration(null)
  await pomodoroRehydrate()
  // if (process.env.DEBUGGING) {
  //   // if on DEV or Production with debug enabled
  //   mainWindow.webContents.openDevTools()
  // }
  // else {
  //   // we're on production; no access to devtools pls
  //   mainWindow.webContents.on('devtools-opened', () => {
  //     mainWindow.webContents.closeDevTools()
  //   })
  // }
  mainWindow.on('closed', () => {
    for (const [key, aWindow] of taskWindows.entries()) {
      aWindow.close()
    }
    for (const [key, aWindow] of toolWindows.entries()) {
      aWindow.close()
    }
    mainWindow = null
  })
}

function openWindow(page, params, options={}){
  if (params){
    params = `&${params}`
  }
  else {
    params = ''
  }
  console.log(`tm2000-openPage: ${page}${params}`)
  if (toolWindows.has(page)){
    let aWindow = toolWindows.get(page);
    aWindow.show()
    aWindow.focus()
    return aWindow;
  }
  else {
    let defaultOptions = {
      icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
      width: 1024,
      height: 768,
      useContentSize: true,
      webPreferences: {
        contextIsolation: true,
        // More info: https://v2.quasar.dev/quasar-cli-webpack/developing-electron-apps/electron-preload-script
        preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD)
      }
    }
    for (let key in options) {
      defaultOptions[key] = options[key]
    }
    let newWindow = new BrowserWindow(defaultOptions)
    newWindow.loadURL(process.env.APP_URL + `?page=${page}${params}`)
    toolWindows.set(page, newWindow)
    newWindow.on('closed', () => {
      if (page==='timeEntry'){
        if (toolWindows.has('timeline')){
          let tl = toolWindows.get('timeline')
          tl.webContents.send('updateTimeline')
        }
      }
      toolWindows.delete(page);
    })
    return newWindow
  }
}

function openTaskWindow(page, params){
  if (params){
    params = `&${params}`
  }
  else {
    params = ''
  }
  console.log(`tm2000-openPage: ${page}${params}`)
  if (!taskWindows.has(`${page}${params}`)) {
    let taskWindow = new BrowserWindow({
      icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
      width: 1024,
      height: 900,
      useContentSize: true,
      webPreferences: {
        contextIsolation: true,
        // More info: https://v2.quasar.dev/quasar-cli-webpack/developing-electron-apps/electron-preload-script
        preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD)
      }
    })
    taskWindow.loadURL(process.env.APP_URL + `?page=${page}${params}`)
    taskWindows.set(`${page}${params}`, taskWindow)
    taskWindow.on('closed', () => {
      if (mainWindow){
        mainWindow.webContents.send('updateBoard')
      }
      taskWindows.delete(`${page}${params}`);
    })
  }
  else{
    let aTaskWindow = taskWindows.get(`${page}${params}`);
    aTaskWindow.show()
    aTaskWindow.focus()
  }
}

function openEpicWindow(page, params){
  if (params){
    params = `&${params}`
  }
  else {
    params = ''
  }
  console.log(`tm2000-openPage: ${page}${params}`)
  if (!epicWindows.has(`${page}${params}`)) {
    let epicWindow = new BrowserWindow({
      icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
      width: 1024,
      height: 600,
      useContentSize: true,
      webPreferences: {
        contextIsolation: true,
        // More info: https://v2.quasar.dev/quasar-cli-webpack/developing-electron-apps/electron-preload-script
        preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD)
      }
    })
    epicWindow.loadURL(process.env.APP_URL + `?page=${page}${params}`)
    epicWindows.set(`${page}${params}`, epicWindow)
    epicWindow.on('closed', () => {
      if (mainWindow){
        mainWindow.webContents.send('updateBoard')
      }
      epicWindows.delete(`${page}${params}`);
    })
  }
  else{
    let aEpicWindow = epicWindows.get(`${page}${params}`);
    aEpicWindow.show()
    aEpicWindow.focus()
  }
}

function openTimeline(){
  openWindow('timeline')
}

function openPomodoroTimerWindow() {
  pomodoroWindow = openWindow('pomodoroTimer', null, {
    width: 800,
    height: 40,
    skipTaskbar: true,
    title: 'Pomodoro Timer',
  })
  addPomodoroTickSubscriber((message)=>{
    pomodoroWindow.webContents.send('pomodoro-tick', message)
  })
  pomodoroWindow.setMenu(null)
  pomodoroWindow.setAlwaysOnTop(true, 'screen');
  return undefined;
}

//app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
  // if (platform !== 'darwin') {
  // }
})


protocol.registerSchemesAsPrivileged([
  {
    scheme: 'tm2000',
    privileges: {
      standard: true,
      secure: false,
      allowServiceWorkers: true,
      supportFetchAPI: true,
    }
  }
])

app.whenReady().then(() => {
  // console.log('will handle tm2000...')
  // protocol.handle('tm2000', (req) => {
  //   const { host, pathname } = new URL(req.url)
  //   if (host === 'app') {
  //     // if (pathname === '/') {
  //     //   return new Response('<h1>hello, world</h1>', {
  //     //     headers: { 'content-type': 'text/html' }
  //     //   })
  //     // }
  //     // NB, this checks for paths that escape the bundle, e.g.
  //     // app://bundle/../../secret_file.txt
  //     // const pathToServe = path.resolve(__dirname, pathname)
  //     // const relativePath = path.relative(__dirname, pathToServe)
  //     // const isSafe = relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
  //     // if (!isSafe) {
  //     //   return new Response('bad', {
  //     //     status: 400,
  //     //     headers: { 'content-type': 'text/html' }
  //     //   })
  //     // }
  //     // return net.fetch(pathToFileURL(pathToServe).toString())
  //     return net.fetch(process.env.APP_URL + pathname, {
  //       method: req.method,
  //       headers: req.headers,
  //       body: req.body
  //     })
  //   } else if (host === 'api') {
  //     return net.fetch('http://localhost:5000' + pathname, {
  //       method: req.method,
  //       headers: req.headers,
  //       body: req.body,
  //       credentials: 'include',
  //       mode: 'cors',
  //       bypassCustomProtocolHandlers: true
  //     })
  //   }
  // })
  createMainWindow()
})

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow()
  }
})
