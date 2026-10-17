/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 *
 * WARNING!
 * If accessing Node functionality (like importing @electron/remote) then in your
 * electron-main.js you will need to set the following when you instantiate BrowserWindow:
 *
 * mainWindow = new BrowserWindow({
 *   // ...
 *   webPreferences: {
 *     // ...
 *     sandbox: false // <-- to be able to import @electron/remote in preload script
 *   }
 * }
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // from renderer, call function in main process
  getCookie: (name) => ipcRenderer.invoke('function:getCookie', name),
  getSharedTimeline: () => ipcRenderer.invoke('function:getSharedTimeline'),
  getConfiguration: () => ipcRenderer.invoke('function:getConfiguration'),
  getLocalNote: (notePath) => ipcRenderer.invoke('function:getLocalNote', notePath),
  getFromGlobalCache: (kind, id) => ipcRenderer.invoke('function:getFromGlobalCache', kind, id),

  // from rendered, one way call stuff on the main process
  openPage: (page, params) => ipcRenderer.send('tm2000-openPage', page, params),
  openTaskPage: (page, params) => ipcRenderer.send('tm2000-openTaskPage', page, params),
  openTaskInTab: (idTask, key, idBoard) =>
    ipcRenderer.send('tm2000-open-task-in-tab', idTask, key, idBoard),
  openEpicPage: (page, params) => ipcRenderer.send('tm2000-openEpicPage', page, params),
  saveConfiguration: (config) => ipcRenderer.send('save-configuration', config),
  setWhoAmi: (username) => ipcRenderer.send('set-whoami', username),
  shareTimeline: (config) => ipcRenderer.send('share-timeline', config),
  openExternalLink: (event, url) => ipcRenderer.send('open-external-link', url),
  notifyMessage: (event, message) => ipcRenderer.send('notify-message', message),
  storeOnGlobalCache: (kind, id, data) => ipcRenderer.send('store-on-global-cache', kind, id, data),
  pomodoroTimerClick: (task) => ipcRenderer.send('pomodoro-timer-click', task),
  pomodoroMenuClick: (tasks) => ipcRenderer.send('pomodoro-menu-click', tasks),
  boardLoaded: (boardName) => ipcRenderer.send('tm2000-board-loaded', boardName),
  //sendNotification: (message) => ipcRenderer.send('pomodoro-notification', message),
  // --end-- from rendered, one way call stuff on the main process

  // from rendered (tabbar), one way call stuff on the main process
  addNewEmptyTab: () => ipcRenderer.send('tm2000-add-new-empty-tab'),
  requestTabList: () => ipcRenderer.send('tm2000-request-tab-list'),
  tabRemoved: (tabId) => ipcRenderer.send('tm2000-removed-tab', tabId),
  tabActivated: (tabId) => ipcRenderer.send('tm2000-tab-activated', tabId),
  sendToggleLeftDrawer: (tabId) => ipcRenderer.send('tm2000-toggle-left-drawer', tabId),
  boardTabActivated: (tabId) => ipcRenderer.send('tm2000-board-tab-activated', tabId),

  // from main process, call a callback on the renderer
  onRefresh: (callback) => ipcRenderer.on('updateBoard', () => callback()),
  onTaskUpdate: (callback) =>
    ipcRenderer.on('on-task-update', (_event, idTask, idProject, op) =>
      callback(idTask, idProject, op),
    ),
  onEpicUpdate: (callback) =>
    ipcRenderer.on('on-epic-update', (_event, idEpic, idProject, op) =>
      callback(idEpic, idProject, op),
    ),
  onRefreshTimeline: (callback) => ipcRenderer.on('updateTimeline', () => callback()),
  pomodoroTick: (callback) =>
    ipcRenderer.on('pomodoro-tick', (_event, pomodoroMsg) => callback(pomodoroMsg)),
  pomodoroOptions: (callback) =>
    ipcRenderer.on('pomodoro-options', (_event, pomodoroOpts) => callback(pomodoroOpts)),
  pomodoroToggleBell: (callback) =>
    ipcRenderer.on('pomodoro-toggle-ring-the-bell', (_event, flag) => callback(flag)),
  setBoardTab: (callback) =>
    ipcRenderer.on('set-right-drawer-tab', (_event, tabId) => callback(tabId)),
  toggleLeftDrawer: (callback) => ipcRenderer.on('toggle-left-drawer', (_event) => callback()),

  // from main process, call a callback on the renderer (tabbar)
  onTabTitleUpdated: (callback) =>
    ipcRenderer.on('tab-title-updated', (_event, tabId, title) => callback(tabId, title)),
  onNewTabCreated: (callback) =>
    ipcRenderer.on('on-create-new-tab', (_event, newTab) => callback(newTab)),
  onTabsRestored: (callback) =>
    ipcRenderer.on('on-restore-tabs', (_event, allTabs) => callback(allTabs)),
})
