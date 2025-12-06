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
  getCookie: (name) => ipcRenderer.invoke('function:getCookie', name),
  //sendNotification: (message) => ipcRenderer.send('pomodoro-notification', message),
  openPage: (page, params) => ipcRenderer.send('tm2000-openPage', page, params),
  openTaskPage: (page, params) => ipcRenderer.send('tm2000-openTaskPage', page, params),
  openEpicPage: (page, params) => ipcRenderer.send('tm2000-openEpicPage', page, params),
  saveConfiguration: (config) => ipcRenderer.send('save-configuration', config),
  setWhoAmi: (username) => ipcRenderer.send('set-whoami', username),
  shareTimeline: (config) => ipcRenderer.send('share-timeline', config),
  openExternalLink: (event, url) => ipcRenderer.send('open-external-link', url),
  notifyMessage: (event, message) => ipcRenderer.send('notify-message', message),
  getSharedTimeline: (callback) => ipcRenderer.invoke('function:getSharedTimeline'),
  getConfiguration: (callback) => ipcRenderer.invoke('function:getConfiguration'),
  getLocalNote: (notePath)=>ipcRenderer.invoke('function:getLocalNote', notePath),
  onRefresh: (callback) => ipcRenderer.on('updateBoard', () => callback()),
  onTaskUpdate: (callback) => ipcRenderer.on('on-task-update', (_event, idTask, idProject, op) => callback(idTask, idProject, op)),
  onEpicUpdate: (callback) => ipcRenderer.on('on-epic-update', (_event, idEpic, idProject, op) => callback(idEpic, idProject, op)),
  onRefreshTimeline: (callback) => ipcRenderer.on('updateTimeline', () => callback()),

  pomodoroTimerClick: (task) => ipcRenderer.send('pomodoro-timer-click', task),
  pomodoroMenuClick: (tasks) => ipcRenderer.send('pomodoro-menu-click', tasks),
  pomodoroTick: (callback) => ipcRenderer.on('pomodoro-tick', (_event, pomodoroMsg) => callback(pomodoroMsg)),
  //onGoToHome: (callback) => ipcRenderer.on('goToHome', () => callback()),
  //onGoToAbout: (callback) => ipcRenderer.on('goToAbout', () => callback())
})
