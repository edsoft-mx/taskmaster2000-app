import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  WebContentsView,
  Notification,
  Menu,
  shell,
} from 'electron'
import log from 'electron-log'
import path, {dirname} from 'path'
import os from 'os'
import fs from 'fs'
import {setPomodoroWatcher, addPomodoroTickSubscriber, showPomodoroMenu, pomodoroOnTimerClick} from './pomodoro';
import {fileURLToPath} from "node:url";
import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'

const currentDir = fileURLToPath(new URL('.', import.meta.url))
log.transports.file.level = 'info';
log.transports.file.maxSize = 1024 * 1024 * 5; // 5MB
log.transports.console.level = 'debug';
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/main.log');
console.log = log.log;
console.error = log.error;
console.warn = log.warn;

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
let PROTO_PATH = path.resolve(__dirname, '..', 'taskmaster2000.proto');
console.log('PROTO_PATH', PROTO_PATH);
// needed in case process is undefined under Linux
const platform = process.platform || os.platform()
// import { pathToFileURL } from 'url'

const packageDefinition = protoLoader.loadSync(PROTO_PATH,
  {keepCase: true, longs: String, enums: String, defaults: true, oneofs: true});
let grpcProto = grpc.loadPackageDefinition(packageDefinition).msgs;
let grpcPomodoroClient = null;
let grpcTaskClient = null
let currentUser = "";
let configuration = null

const configDefaults = {
  token: null,
  user: null,
  apiURL: null,
  messengerHostPort: null,
  mainWindowWidth: 1200,
  mainWindowHeight: 800,
  rightDrawerWidth: 500,
  pomodoroRingTheBell: true,
  pomodoroOptions: {
    showTimeline: true,
    showMenuAlways: true,
    pomodoroLabelsPosition: 'bottom',
    flashAfterExtendedInactivity: true,
  },
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function mergeDefaults(defaults, stored) {
  let merged = { ...defaults, ...stored }
  for (let key in defaults) {
    if (isPlainObject(defaults[key]) && isPlainObject(stored[key])) {
      merged[key] = mergeDefaults(defaults[key], stored[key])
    }
  }
  return merged
}

// import readline from 'readline'
// import { Readable } from 'stream'

let mainWindow = null
const tabs = new Map() // id -> WebContentsView
let activeTabId = null
let tabCounter = 0

const TAB_BAR_HEIGHT = 90

let pomodoroWindow = null
let ringTheBell = true;
let pomodoroWindowOptions = {
  showTimeline : true,
  showMenuAlways: true,
  pomodoroLabelsPosition: 'bottom',
  flashAfterExtendedInactivity: true
}
let toolWindows = new Map()
let taskWindows = new Map()
// let epicWindows = new Map()
let timeLineData = null;
let globalCacheData = new Map()
let globalCachePending = new Map()
// const hostname = os.hostname();

function getCookie(event, name) {
  // session.defaultSession.cookies.get({name: name}).then((error, cookies) => {
  //   return cookies
  // })
  if (name ==='session_token'){
    let conf = getConfiguration(event)
    return conf.token
  }
}

function getConfiguration(){
  if (!configuration){
    let basePath = app.getPath('userData')
    const configFile = path.join(basePath, 'config.json')
    let diskConf = {}
    if (fs.existsSync(configFile)) {
      diskConf = JSON.parse(fs.readFileSync(configFile, 'utf8'))
    }
    console.log(`Retrieved configuration from ${configFile}`)
    configuration = mergeDefaults(configDefaults, diskConf)
  }
  return configuration
}

function saveConfiguration(config){
  let basePath = app.getPath('userData')
  const configFile = path.join(basePath, 'config.json')
  let prevConf = {}
  if (fs.existsSync(configFile)) {
    prevConf = JSON.parse(fs.readFileSync(configFile, 'utf8'))
  }
  let newConf = {...prevConf, ...config}
  fs.writeFileSync(configFile, JSON.stringify(newConf))
  configuration = mergeDefaults(configDefaults, newConf)
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

function toggleInactivityAlert(){
  pomodoroWindowOptions.flashAfterExtendedInactivity =
    !pomodoroWindowOptions.flashAfterExtendedInactivity
  saveConfiguration({ pomodoroOptions: pomodoroWindowOptions })
  if (pomodoroWindow) {
    pomodoroWindow.webContents.send('pomodoro-options', pomodoroWindowOptions)
  }
  mainWindow.webContents.send('pomodoro-options', pomodoroWindowOptions)
}

function getMenu(){
  let tabsDevTools = [
    { type: 'normal', label: 'TabBar',
      click: () => mainWindow.webContents.openDevTools({ mode: 'detach' })
    },
  ]
  console.log(`populating menu-devtools ... ${tabs.size}`)
  for (let tabKey of tabs.keys()) {
    console.log('populating menu-devtools ...' + tabKey)
    let tabFull = tabs.get(tabKey)
    tabsDevTools.push({
      type: 'normal',
      label: tabKey,
      click: () => tabFull.view.webContents.openDevTools({ mode: 'detach' }),
    })
  }
  return [
    {
      label: 'File',
      submenu: [{ role: 'quit' }],
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
      ],
    },
    {
      label: 'View',
      submenu: [
        { type: 'normal', label: 'Timeline', click: () => openTimeline() },
        { type: 'normal', label: 'Pomodoro Timer', click: () => openPomodoroTimerWindow() },
        {
          type: 'checkbox',
          label: 'Ring the bell when Pomodoro period ends',
          checked: ringTheBell,
          click: () => togglePomodoroBell(),
        },
        {
          type: 'checkbox',
          label: 'Alert after inactivity period',
          checked: pomodoroWindowOptions.flashAfterExtendedInactivity,
          click: () => toggleInactivityAlert(),
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: 'reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow?.webContents.reloadIgnoringCache()
            for (let tabKey of tabs.keys()) {
              let tabFull = tabs.get(tabKey)
              tabFull.view.webContents.reload()
            }
          },
        },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        {
          label: 'open DevTools',
          submenu: tabsDevTools
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ]
}

async function createMainWindow () {
  /**
   * Initial window options
   */
  let config = await getConfiguration()
  console.log('Creating main window...')
  let mainWindowWidth = 1200
  let mainWindowHeight = 800
  if (config.mainWindowWidth) {
    mainWindowWidth = configuration.mainWindowWidth
  }
  if (config.mainWindowHeight) {
    mainWindowHeight = configuration.mainWindowHeight
  }
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
    width: mainWindowWidth,
    height: mainWindowHeight,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-webpack/developing-electron-apps/electron-preload-script
      // preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD)
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
        ),
      ),
    },
  })
  console.log(`Loading main window @ ${process.env.APP_URL}`)

  let newTab = {
    id: `tab_${tabCounter}`,
    name: `tab_${tabCounter}`,
    title: `Welcome`,
    active: true,
    url: 'MainLayout',
    isBoard: true,
  }
  tabCounter++
  await createTab(newTab)

  //await mainWindow.loadURL(process.env.APP_URL+ `?page=MainLayout`)
  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL + `?page=tabbar`)
  } else {
    await mainWindow.loadFile('index.html', { query: { page: 'tabbar' } })
  }

  // if (process.env.DEBUGGING) {
  //    // if on DEV or Production with debug enabled
  //    mainWindow.webContents.openDevTools()
  // }
  // else {
  //   // we're on production; no access to devtools pls
  //   mainWindow.webContents.on('devtools-opened', () => {
  //     mainWindow.webContents.closeDevTools()
  //   })
  // }

  pomodoroWindowOptions = config.pomodoroOptions

  mainWindow.on('closed', () => {
    if (platform !== 'darwin') {
      for (const [key, aWindow] of taskWindows.entries()) {
        console.log(`Closing task window ${key}`)
        aWindow.close()
      }
      for (const [key, aWindow] of toolWindows.entries()) {
        console.log(`Closing tool window ${key}`)
        aWindow.close()
      }
    }
    mainWindow = null
  })
  mainWindow.on('resize', ()=>{
    //console.log('Window resize')
    resizeActiveTab()
    const [width, height] = mainWindow.getSize()
    saveConfiguration({mainWindowWidth: width, mainWindowHeight: height})
  })

  const menu = Menu.buildFromTemplate(getMenu())
  Menu.setApplicationMenu(menu)
  const { view: _view, ...tabUI } = newTab
  mainWindow.webContents.send('on-restore-tabs', [tabUI])
}

function refreshMenu(){
  const menu = Menu.buildFromTemplate(getMenu())
  Menu.setApplicationMenu(menu)
}

async function createTab(tabData) {
  console.log(`Creating tab ${tabData.id}: ${tabData.url}`)
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
        ),
      ),
    },
  })
  if (process.env.DEV) {
    await view.webContents.loadURL(process.env.APP_URL + `?page=${tabData.url}`)
    //view.webContents.openDevTools({ mode: 'detach' })
  } else {
    let p = new URLSearchParams(`?page=${tabData.url}`)
    let pageParams = {
      page: p.page,
    }
    pageParams = { ...pageParams, ...Object.fromEntries(p) }
    if (p.page === 'TaskInTab') {
      delete pageParams.page
      p.component = 'TaskTab'
    }
    await view.webContents.loadFile('index.html', { query: pageParams })
    //view.webContents.openDevTools({ mode: 'detach' })
  }
  tabData.view = view
  tabs.set(tabData.id, tabData)
  await switchToTab(tabData.id)
}

async function switchToTab(tabId) {
  // console.log('main window bounds')
  // console.log(bounds)
  // remove currently visible view
  if (!tabs.has(tabId)) {
    console.log(`Could not found tab id ${tabId}`)
    return
  }
  const bounds = mainWindow.getContentBounds()
  if (activeTabId && tabs.has(activeTabId) && activeTabId !== tabId) {
    console.log(`removeChildView(${activeTabId})`)
    mainWindow.contentView.removeChildView(tabs.get(activeTabId).view)
  }
  const tabData = tabs.get(tabId)
  console.log(`Activating view ${tabData.id}`)
  const view = tabData.view
  mainWindow.contentView.addChildView(view)
  const viewBounds = {
    x: 0,
    y: TAB_BAR_HEIGHT,
    width: bounds.width,
    height: bounds.height - TAB_BAR_HEIGHT,
  }
  //console.log('setting view bounds:', viewBounds)
  view.setBounds(viewBounds)
  activeTabId = tabId
}

function resizeActiveTab() {
  if (activeTabId==null) {
    console.log('no active tab')
    return
  }
  const bounds = mainWindow.getContentBounds()
  tabs.get(activeTabId).view.setBounds({
    x: 0,
    y: TAB_BAR_HEIGHT,
    width: bounds.width,
    height: bounds.height - TAB_BAR_HEIGHT,
  })
}

async function openWindow(page, params, options={}){
  let pageParams = { page: page }
  if (params) {
    let p = new URLSearchParams(params)
    pageParams = { ...pageParams, ...Object.fromEntries(p) }
    console.log('Params of new window:')
    console.log(pageParams)
    params = `&${params}`
    console.log(`tm2000-openPage: ${page}${params}`)
  } else {
    console.log(`tm2000-openPage: ${page}`)
  }
  if (toolWindows.has(page)){
    let aWindow = toolWindows.get(page);
    aWindow.show()
    aWindow.focus()
    return aWindow;
  }
  else {
    let windowWidth = 1024
    let windowHeight = 768;
    if (configuration[`${page}WindowWidth`]){
      windowWidth = configuration[`${page}WindowWidth`]
    }
    if (configuration[`${page}WindowHeight`]){
      windowHeight = configuration[`${page}WindowHeight`]
    }
    let defaultOptions = {
      icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
      width: windowWidth,
      height: windowHeight,
      useContentSize: true,
      webPreferences: {
        contextIsolation: true,
        // More info: https://v2.quasar.dev/quasar-cli-webpack/developing-electron-apps/electron-preload-script
        preload: path.resolve(
          currentDir,
          path.join(
            process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
            'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
          ),
        ),
      },
    }
    for (let key in options) {
      defaultOptions[key] = options[key]
    }
    let newWindow = new BrowserWindow(defaultOptions)
    //newWindow.loadURL(process.env.APP_URL + `?page=${page}${params}`)
    if (process.env.DEV) {
      console.log(`Loading ${page} window @ ${process.env.APP_URL}`)
      if (!params) params = ""
      await newWindow.loadURL(process.env.APP_URL + `?page=${page}${params}`)
    } else {
      await newWindow.loadFile('index.html', { query: pageParams })
    }

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
    newWindow.on('resize', ()=>{
      const [width, height] = newWindow.getSize()
      let size = {}
      size[`${page}WindowWidth`] = width
      size[`${page}WindowHeight`] = height
      saveConfiguration(size)
    })
    return newWindow
  }
}

async function openTaskWindow(page, params){
  let pageParams = {page: page}
  if (params){
    let p = new URLSearchParams(params)
    pageParams = {...pageParams, ...Object.fromEntries(p)}
    console.log('Params of new window:')
    delete pageParams.page
    pageParams.component = 'taskEditor'
    console.log(pageParams)
    params = `&${params}`
    console.log(`tm2000-openPage: ${page}${params}`)
  }
  else {
    console.log(`tm2000-openPage (np): ${page}`)
    //pageParams.component = 'taskEditor'
    params=''
  }

  if (!taskWindows.has(`${page}${params}`)) {
    let taskWindow = new BrowserWindow({
      icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
      width: 1024,
      height: 900,
      useContentSize: true,
      webPreferences: {
        contextIsolation: true,
        // More info: https://v2.quasar.dev/quasar-cli-webpack/developing-electron-apps/electron-preload-script
        preload: path.resolve(
          currentDir,
          path.join(
            process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
            'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
          ),
        ),
      },
    })
    //taskWindow.loadURL(process.env.APP_URL + `?page=${page}${params}`)
    if (process.env.DEV) {
      await taskWindow.loadURL(process.env.APP_URL + `?component=taskEditor${params}`)
    } else {
      console.log("Loading index.html with pageParams")
      console.log(pageParams)
      await taskWindow.loadFile('index.html', {query: pageParams})
    }

    taskWindows.set(`${page}${params}`, taskWindow)
    taskWindow.on('closed', () => {
      // if (mainWindow){
      //   mainWindow.webContents.send('updateBoard')
      // }
      taskWindows.delete(`${page}${params}`);
    })
  }
  else{
    let aTaskWindow = taskWindows.get(`${page}${params}`);
    aTaskWindow.show()
    aTaskWindow.focus()
  }
}

function openTimeline(){
  openWindow('timeline')
}

function setPomodoroLabels(position){
  pomodoroWindowOptions.pomodoroLabelsPosition = position
  saveConfiguration({ pomodoroOptions: pomodoroWindowOptions })
  if (pomodoroWindow){
    pomodoroWindow.webContents.send('pomodoro-options', pomodoroWindowOptions)
  }
}

function togglePomodoroBell(){
  ringTheBell = !ringTheBell
  saveConfiguration({'pomodoroRingTheBell': ringTheBell})
  mainWindow.webContents.send('pomodoro-toggle-ring-the-bell', ringTheBell)
  if (pomodoroWindow) {
    pomodoroWindow.webContents.send('pomodoro-toggle-ring-the-bell', ringTheBell)
  }
}

function toggleTimeline() {
  pomodoroWindowOptions.showTimeline = !pomodoroWindowOptions.showTimeline
  saveConfiguration({ pomodoroOptions: pomodoroWindowOptions })
  if (pomodoroWindow) {
    pomodoroWindow.webContents.send('pomodoro-options', pomodoroWindowOptions)
  }
}

function togglePomodoroShowMenu() {
  pomodoroWindowOptions.showMenuAlways = !pomodoroWindowOptions.showMenuAlways
  saveConfiguration({ pomodoroOptions: pomodoroWindowOptions })
  if (pomodoroWindow) {
    pomodoroWindow.webContents.send('pomodoro-options', pomodoroWindowOptions)
  }
}


function getMenuPomodoroTimer() {
  return [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          type: 'submenu',
          label: 'Pomodoro Labels position',
          submenu: [
            {
              type: 'radio',
              label: 'Bottom',
              checked: pomodoroWindowOptions.pomodoroLabelsPosition === 'bottom',
              click: () => setPomodoroLabels('bottom'),
            },
            {
              type: 'radio',
              label: 'Right',
              checked: pomodoroWindowOptions.pomodoroLabelsPosition === 'right',
              click: () => setPomodoroLabels('right'),
            },
          ],
        },
        {
          type: 'checkbox',
          label: 'Ring the bell when Pomodoro period ends',
          checked: ringTheBell,
          click: () => togglePomodoroBell(),
        },
        {
          type: 'checkbox',
          label: 'Show Timeline',
          checked: pomodoroWindowOptions.showTimeline,
          click: () => toggleTimeline(),
        },
        {
          type: 'checkbox',
          label: 'Always Show Menu',
          checked: pomodoroWindowOptions.showMenuAlways,
          click: () => togglePomodoroShowMenu(),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ]
}

async function openPomodoroTimerWindow() {
  let configuration = await getConfiguration()
  pomodoroWindowOptions = configuration.pomodoroOptions
  pomodoroWindow = await openWindow('pomodoroTimer', null, {
    skipTaskbar: true,
    title: 'Pomodoro Timer',
    autoHideMenuBar: !pomodoroWindowOptions.showMenuAlways,
  })
  addPomodoroTickSubscriber((message)=>{
    pomodoroWindow.webContents.send('pomodoro-tick', message)
  })
  console.log("Pomodoro window options")
  console.log(pomodoroWindowOptions)
  let menuPomodoro = Menu.buildFromTemplate(getMenuPomodoroTimer())
  pomodoroWindow.setMenu(menuPomodoro)
  pomodoroWindow.on('close', () => {
    pomodoroWindow = null
  })
  //pomodoroWindow.webContents.send('pomodoro-options', pomodoroWindowOptions)
}

//app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  if (platform === 'darwin') {
    if (mainWindow == null) {
      await createMainWindow()
    }
    else {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
    }
    if (mainWindow!=null){
      mainWindow.show()
      mainWindow.focus()
    }
  }
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


async function initGRPC(){
  let configuration = await getConfiguration()
  grpcPomodoroClient = new grpcProto.Pomodoro(configuration.messengerHostPort, grpc.credentials.createInsecure());
  grpcTaskClient  = new grpcProto.TaskUpdatedNotifier(configuration.messengerHostPort, grpc.credentials.createInsecure());
}

async function initHandlers(){
  ipcMain.handle('function:getCookie', getCookie)
  ipcMain.handle('function:getFromGlobalCache', getFromGlobalCache)
  ipcMain.on('tm2000-openPage', (event, page, params=null)=>{
    openWindow(page, params)
  })
  ipcMain.on('tm2000-openTaskPage', (event, page, params=null)=>{
    openTaskWindow(page, params)
  })
  ipcMain.on('tm2000-openEpicPage', (event, page, params=null)=>{
    openTaskWindow(page, params)
  })
  ipcMain.on('open-external-link', (event, url)=>{
    shell.openExternal(url);
  })
  ipcMain.on('notify-message', (event, message)=>{
    new Notification({
      title: 'TM2000/Pomodoro',
      body: message
    }).show()
  })
  ipcMain.handle('function:getConfiguration', getConfiguration)
  ipcMain.handle('function:getLocalNote', getLocalNote)
  ipcMain.handle('function:getSharedTimeline', ()=>{return timeLineData})

  ipcMain.on('save-configuration', (event, config)=>{
    saveConfiguration(config)
  })
  ipcMain.on('set-whoami', (event, user)=>{
    if (user && (!currentUser || currentUser != user)){
      currentUser= user
      setPomodoroWatcher(grpcPomodoroClient, currentUser, configuration)
      taskWatcherStreamingCall(grpcTaskClient, currentUser)
      epicWatcherStreamingCall(grpcTaskClient, currentUser)
    }
  })
  ipcMain.on('pomodoro-timer-click', (event, task) => {
    pomodoroOnTimerClick(task)
  })
  ipcMain.on('share-timeline', (event, data) => {
    console.log(data)
    timeLineData = data
  })
  ipcMain.on('pomodoro-menu-click', (event, tasks) => {
    showPomodoroMenu(tasks)
  })
  ipcMain.on('store-on-global-cache', (event, kind, id, data) => {
    storeOnGlobalCache(kind, id, data)
  })
  ipcMain.on('tm2000-add-new-empty-tab', () => {
    console.log('tm2000-add-new-empty-tab')
    let newTab = {
      id: `tab_${tabCounter}`,
      name: `tab_${tabCounter}`,
      title: `New Tab ${tabCounter + 1}`,
      active: true,
      url: 'MainLayout',
      isBoard: true,
    }
    tabCounter++
    createTab(newTab)
    const { view: _view, ...tabUI } = newTab
    mainWindow.webContents.send('on-create-new-tab', tabUI)
    refreshMenu()
  })
  ipcMain.on('tm2000-request-tab-list', () => {
    console.log('tm2000-request-tab-list')
    let allTabs = []
    for (let tabKey of tabs.keys()) {
      let tabFull = tabs.get(tabKey)
      const { view: _view, ...tabUI } = tabFull
      allTabs.push(tabUI)
    }
    mainWindow.webContents.send('on-restore-tabs', allTabs)
  })
  ipcMain.on('tm2000-open-task-in-tab', async (event, idTask, key, idBoard) => {
    let newTab = {
      id: `tab_${tabCounter}`,
      name: `tab_${tabCounter}`,
      title: `New Tab ${tabCounter + 1}`,
      active: true,
      url: `TaskInTab&idTask=${idTask}&idBoard=${idBoard}`,
      isBoard: false,
    }
    tabCounter++
    await createTab(newTab)
    const { view: _view, ...tabUI } = newTab
    mainWindow.webContents.send('on-create-new-tab', tabUI)
    refreshMenu()
  })

  ipcMain.on('tm2000-board-tab-activated', (_event, tabId) => {
    console.log(`tm2000-board-tab-activated(${tabId})`)
    const activeView = tabs.get(activeTabId).view
    activeView.webContents.send('set-right-drawer-tab', tabId)
  })
  ipcMain.on('tm2000-toggle-left-drawer', (_event) => {
    const activeView = tabs.get(activeTabId).view
    activeView.webContents.send('toggle-left-drawer')
  })
  ipcMain.on('tm2000-tab-activated', (_event, tabId) => {
    console.log(`tm2000-tab-activated(${tabId})`)
    switchToTab(tabId)
  })
  ipcMain.on('tm2000-removed-tab', (_event, tabId) => {
    console.log('tm2000-removed-tab', tabId)
    if (tabs.has(tabId)) {
      tabs.delete(tabId)
    }
    refreshMenu()
  })
  ipcMain.on('tm2000-board-loaded', (_event, boardName) => {
    console.log('tm2000-board-loaded', boardName)
    mainWindow.webContents.send('tab-title-updated', activeTabId, boardName)
    if (tabs.has(activeTabId)) {
      let tab = tabs.get(activeTabId)
      tab.title = boardName
    }
  })
  addPomodoroTickSubscriber((message)=>{
    mainWindow.webContents.send('pomodoro-tick', message)
    for (let [_, tab] of tabs){
      const view = tab.view
      view.webContents.send('pomodoro-tick', message)
    }
  })
  //await pomodoroRehydrate()
}

app.whenReady().then(async () => {
  // if (process.platform === 'linux') {
  //   app.set (path.join(__dirname, 'icons/icon.png'))
  // }
  activeTabId=null
  await initGRPC()
  await initHandlers()
  await createMainWindow()
})


app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // console.log(certificate.issuer)
  // console.log(hostname)
  let validCert = certificate.issuer.organizations[0] === 'EDSoft' && certificate.issuer.organizationUnits[0] === 'Taskmaster2000'
  if (error === 'net::ERR_CERT_AUTHORITY_INVALID' && validCert) {
    // In a real application, you'd want to verify the certificate here
    // For example, check the certificate's subject, issuer, or use a pre-defined list of trusted certificates
    //console.log(certificate)
    event.preventDefault(); // Prevent default error handling
    callback(true); // Allow the connection (assuming it's verified)
  } else {
    // If it's not our certificate or a different error, let the default handling take over
    callback(false);
  }
});

function taskWatcherStreamingCall(client, user) {
  const MAX_DELAY = 30000
  let delay = 1000
  let timeOutHandle = null

  function connect() {
    if (timeOutHandle) {
      clearTimeout(timeOutHandle)
      timeOutHandle = null
    }
    delay = 1000
    console.log('connecting taskWatcherStreamingCall...')
    const call = client.SubscribeTaskWatcher({user: user})
    call.on('data', async (updatedTask) => {
      console.log('Received updated task')
      console.log(updatedTask)
      //console.log(task)
      //mainWindow.webContents.send('on-task-update', updatedTask.id_task, updatedTask.id_project, updatedTask.op)
      for (let [_, tab] of tabs) {
        const view = tab.view
        view.webContents.send(
          'on-task-update',
          updatedTask.id_task,
          updatedTask.id_project,
          updatedTask.op,
        )
      }
    });
    call.on('error', status => {
      console.log(`SubscribeTaskWatcher got = ${grpc.status[status.code]}`);
      if (timeOutHandle) {
        clearTimeout(timeOutHandle)
        timeOutHandle = null
      }
      console.log(`taskWatcherStreamingCall error: ${status.message}, reconnecting in ${delay}ms`)
      timeOutHandle = setTimeout(connect, delay)
      delay = Math.min(delay * 2, MAX_DELAY)
    });
    call.on('end', () => {
      if (timeOutHandle) {
        clearTimeout(timeOutHandle)
         timeOutHandle = null
      }
      console.log(`taskWatcherStreamingCall stream ended, reconnecting in ${delay}ms`)
      timeOutHandle = setTimeout(connect, delay)
      delay = Math.min(delay * 2, MAX_DELAY)
    })
  }
  connect()
}

function epicWatcherStreamingCall(client, user) {
  const MAX_DELAY = 30000
  let delay = 1000
  let timeOutHandle = null

  function connect() {
    if (timeOutHandle) {
      clearTimeout(timeOutHandle)
      timeOutHandle = null
    }
    delay = 1000
    console.log('conecting epicWatcherStreamingCall...')
    const call = client.SubscribeEpicWatcher({user: user})
    call.on('data', async (updatedEpic) => {
      console.log('Received updated epic')
      console.log(updatedEpic)
      //console.log(task)
      mainWindow.webContents.send('on-epic-update', updatedEpic.id_epic, updatedEpic.id_project, updatedEpic.op)
    });
    call.on('error', status => {
      console.log(`SubscribeEpicWatcher got = ${grpc.status[status.code]}`);
      if (timeOutHandle) {
        clearTimeout(timeOutHandle)
        timeOutHandle = null
      }
      console.log(`SubscribeEpicWatcher error: ${status.message}, reconnecting in ${delay}ms`)
      timeOutHandle = setTimeout(connect, delay)
      delay = Math.min(delay * 2, MAX_DELAY)
    });
    call.on('end', () => {
      if (timeOutHandle) {
        clearTimeout(timeOutHandle)
        timeOutHandle = null
      }
      console.log(`SubscribeEpicWatcher stream ended, reconnecting in ${delay}ms`)
      timeOutHandle = setTimeout(connect, delay)
      delay = Math.min(delay * 2, MAX_DELAY)
    });
  }
  connect()
}

export const globalCache = {
  set(kind, key, value) {
    let aKindStore = null
    if (!globalCacheData.has(kind)) {
      aKindStore = new Map()
      globalCacheData.set(kind, aKindStore)
    } else {
      aKindStore = globalCacheData.get(kind)
    }
    aKindStore.set(key, value)

    let fullKey = `${kind}-${key}`
    // Si alguien estaba esperando esta llave, resolver su promesa
    if (globalCachePending.has(fullKey)) {
      globalCachePending.get(fullKey).resolve(value)
      globalCachePending.delete(fullKey)
    }
  },

  get(key) {
    return globalCacheData.get(key)
  },

  // Espera hasta que la llave exista
  waitFor(kind, key, timeout = 5000) {
    if (globalCacheData.has(kind)) {
      let aKindStore = globalCacheData.get(kind)
      if (aKindStore.has(key)) {
        return Promise.resolve(aKindStore.get(key))
      }
    }

    let fullKey = `${kind}-${key}`
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        globalCachePending.delete(fullKey)
        reject(new Error(`Cache timeout: key "${fullKey}" never arrived`))
      }, timeout)

      globalCachePending.set(fullKey, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
      })
    })
  },
}

async function storeOnGlobalCache(kind, id, data){
  globalCache.set(kind, id, data)
}

async function getFromGlobalCache(event, kind, id) {
  let result = await globalCache.waitFor(kind, id)
  return result
}

