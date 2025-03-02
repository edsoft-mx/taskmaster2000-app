import {Menu, Notification} from 'electron'

let appConf = null

let pomodoroData = {
  timerActive: false,  // is pomodoro timer on/off
  session: 0, // Pomodoro Session number 1,3,5,7 working sessions, 2,4,6,8 break sessions
  start: 0, // session start timestamp
  epoch: 0, // timestamp (on future) when the current session ends
  remaining: 0, // for paused sessions, how many remaining seconds the current session has
  task: {idTask: null, title: "Break"} , // current task, break sessions should have a falsy idTask
  previousTask: {idTask: null, title: "Break"},
  timerHandler: null, // settimeout handler
  fullSessionDuration: 1500,
  notifiedEndOfBreak: false,
  breakExpiredATimeAgo: false,
  eventSubscribers: [],
}

async function callApi(method, endpoint, data){
    const url = appConf.apiURL
    const token = appConf.token
    let response = await fetch(`${url}/${endpoint}`,
      {
        method: method,
        mode: 'cors',
        body: JSON.stringify(data),
        credentials: 'include',
        headers: {
          // {"X-CSRFToken": "{ { csrf_token() } }",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })

  if (response.status !== 200) {
    return null
  }
  return await response.json();
}

async function showNotification(message){
    new Notification({
      title: 'TM2000/Pomodoro',
      body: message
    }).show()
}

function isPomodoroSessionActive(){
  let result = pomodoroData.task && pomodoroData.task?.idTask
  //console.log("isPomodoroSessionActive", result)
  return Boolean(result)
}

function isPomodoroSessionSkippable(){
  let result= pomodoroData.timerActive && pomodoroData.task && pomodoroData.task?.idTask
  //console.log("isPomodoroSessionSkippable", result)
  return Boolean(result)
}

function isPomodoroPreviousSessionAvailable(){
  let isBreak= getPomodoroSession() % 2 === 0
  let result= isBreak && pomodoroData.previousTask != null && pomodoroData.previousTask?.idTask
  //&& pomodoroData.task?.idTask
  //console.log("isPomodoroPreviousSessionAvailable", result)
  return Boolean(result)
}

async function pomodoroToggle(){
  //boardExecuteOp.value= {op: 'togglePomodoro'}
  if (pomodoroData.timerActive){
    console.log(`Pausing pomodoro ${pomodoroData.task}`)
    await pomodoroPauseTimer()
  }
  else {
    console.log(`Resuming pomodoro ${pomodoroData.task}`)
    await pomodoroStartTimer()
  }
  //await pomodoroOnTimerClick(pomodoroData.task)
}

function getCurrentPomodoroFullDuration(){
  let idx = getPomodoroSession()
  let isBreak = idx % 2 === 0
  if (!isBreak){
    return 1500000
  }
  else {
    return idx===8 ? 1200000 : 300000
  }
}

function getFutureEpoch(duration){
  let now = new Date()
  return new Date(now.getTime() + duration)
}

async function pomodoroNext(){
  let idx = getPomodoroSession()
  let newSession = idx < 8 ? idx+1 : 1
  await setPomodoroSession(newSession)
  pomodoroData.start = Date.now()
  pomodoroData.remaining = getCurrentPomodoroFullDuration()
  pomodoroData.epoch = getFutureEpoch(pomodoroData.remaining)
  let isBreak = newSession % 2 === 0
  let data = {
    "active": pomodoroData.timerActive,
    "task": isBreak ? pomodoroData.task : null,
    "epoch": pomodoroData.epoch.getTime(),
    "start": pomodoroData.start,
  }
  await callApi('POST', `user/pomodoro/${newSession}`, data)
  await pomodoroUpdateLabel()
  //let workingToday = await callApi("GET", 'user/spent_time/today')
  //setWorkingToday(workingToday)
  pomodoroData.notifiedEndOfBreak= false
}

function getPomodoroRemainingMSecs(){
  let now = new Date()
  let remaining = pomodoroData.epoch.getTime() - now
  //console.log(remaining)
  return remaining
}

async function pomodoroUpdateLabel() {
  let remainingTime = ''
  if (!pomodoroData.epoch) {
    remainingTime = '--:--'
  } else {
    let interval = getPomodoroRemainingMSecs() / 1000
    let minutes = Math.floor(Math.abs(interval) / 60)
    let seconds = Math.trunc(Math.abs(interval) % 60)
    let neg = interval >= 0 ? '' : '-'
    remainingTime = `${neg}${minutes}`.padStart(2, '0') + ':' + `${seconds}`.padStart(2, '0')
  }
  await eventPropagate({
    type: 'updateTimer',
    value: {
      remainingTime: remainingTime,
      task: pomodoroData.task,
      pomodoroData: getPomodoroDataObject(),
    }
  })
}

async function pomodoroTick(){
  await pomodoroUpdateLabel()
  let now = new Date()

  if (now > pomodoroData.epoch){
    let idx = getPomodoroSession()
    //POST spent time period for current task
    if (idx % 2 !== 0) {
      pomodoroData.task.workingIntervalEnd = Date.now()
      await showNotification(`End of Pomodoro Session on ${pomodoroData.task.title}`)
      //document.getElementById('boxRing').play()
      await eventPropagate({
        type: 'pomodoroEnd',
        value: idx,
        pomodoroData: getPomodoroDataObject(),
      })
      await updateWorkingPeriod()
      pomodoroData.task=null;
      await showNotification('Pomodoro Break Started')
      // auto start break, this will force the user to skip the break if want to account for more time
      console.log('start break')
      await pomodoroNext()
      await pomodoroUpdateLabel()
    }
    else {
      if (!pomodoroData.notifiedEndOfBreak){
        pomodoroData.notifiedEndOfBreak= true;
        console.log('finish break')
        //await pomodoroEndTimer()
        await showNotification('Pomodoro Break Ended')
        await eventPropagate({
          type: 'pomodoroEnd',
          value: idx,
          pomodoroData: getPomodoroDataObject(),
        })
      }
      let expiredDiff = now - pomodoroData.epoch
      let expiredMinutes = Math.floor(expiredDiff /1000 / 60)
      pomodoroData.breakExpiredATimeAgo = expiredMinutes > 5
      console.log(expiredMinutes)
    }
  }
  else {
    pomodoroData.breakExpiredATimeAgo = false
  }
}

async function pomodoroSkipToNextSession(){
  let idx = getPomodoroSession()
  if(pomodoroData.timerActive && idx % 2 !== 0){
    pomodoroData.epoch = 0
    await pomodoroTick()
  }
}

async function pomodoroStartTimer(){
  let idx = getPomodoroSession()
  pomodoroData.timerActive = true
  pomodoroData.epoch = getFutureEpoch(pomodoroData.remaining)
  let epochTimestamp = pomodoroData.epoch.getTime()
  let data = {"active": pomodoroData.timerActive, "task": pomodoroData.task, "epoch": epochTimestamp,
    "start": pomodoroData.start}
  await callApi('POST', `user/pomodoro/${idx}`, data)
  if (pomodoroData.timerHandler != null) {
    clearInterval(pomodoroData.timerHandler)
  }
  pomodoroData.timerHandler = setInterval(() => pomodoroTick(), 1000)
  //let workingToday = await callApi("GET", 'user/spent_time/today')
  //setWorkingToday(workingToday)
}

// async function pomodoroEndTimer(){
//   clearInterval(pomodoroData.timerHandler)
//   pomodoroData.timerHandler = null
//   pomodoroData.timerActive = false
//   pomodoroData.remaining = 0
//   let idx = getPomodoroSession()
//   let data = {"active": pomodoroData.timerActive, "task": null}
//   await callApi('POST', `user/pomodoro/${idx}`, data)
//   let workingToday = await callApi("GET", 'user/spent_time/today')
//   setWorkingToday(workingToday)
// }

async function pomodoroPauseTimer(){
  clearInterval(pomodoroData.timerHandler)
  pomodoroData.timerHandler = null
  pomodoroData.timerActive = false
  let idx = getPomodoroSession()
  pomodoroData.remaining = getPomodoroRemainingMSecs()
  let data = {"active": pomodoroData.timerActive, "task": pomodoroData.task, "remaining": pomodoroData.remaining,
    "start": pomodoroData.start}
  await callApi('POST', `user/pomodoro/${idx}`, data)
}

async function updateWorkingPeriod(){
  let start = new Date(pomodoroData.task.workingIntervalStart)
  let end = new Date(pomodoroData.task.workingIntervalEnd)
  let dif = end - start
  console.log(`${pomodoroData.task.idTask}: ${start} - ${end} (${dif})`)
  let data = {
    start: pomodoroData.task.workingIntervalStart,
    end: pomodoroData.task.workingIntervalEnd
  }
  await callApi("POST", `user/tasks/${pomodoroData.task.idTask}/spent_time`, data)
  // TODO: Here we need to signal Clockify to STOP
}

async function updatePomodoroDataOnServer(){
  let idx = getPomodoroSession()
  let epochTimestamp = pomodoroData.epoch.getTime()
  let data = {"active": pomodoroData.timerActive, "task": pomodoroData.task, "epoch": epochTimestamp,
    "start": pomodoroData.start}
  await callApi('POST', `user/pomodoro/${idx}`, data)
}

async function pomodoroOnTimerClick(task){
  // dummy()
  console.log("pomodoroOnTimerClick")
  console.log(task)
  let idx = getPomodoroSession()
  if (idx===0 || idx % 2 === 0){
    pomodoroData.task = null
  }
  //dummy()
  // click timerButton on same task: toggle
  if (pomodoroData.task != null && task.idTask === pomodoroData.task.idTask) {
    console.log(`toggle task's pomodoro timer ${task.idTask}`)
    pomodoroData.timerActive = !pomodoroData.timerActive
    if (!pomodoroData.timerActive){
      pomodoroData.task.workingIntervalEnd = Date.now()
      await updateWorkingPeriod()
      await pomodoroPauseTimer()
    }
    else {
      pomodoroData.task.workingIntervalStart = Date.now()
      pomodoroData.start = Date.now()
      await pomodoroStartTimer()
      await setPomodoroTask(pomodoroData.task)
      console.log(`New working period for ${task.idTask}`)
    }
  }
  else {
    // start a new pomodoro with task
    if (pomodoroData.task == null || !pomodoroData.timerActive) {
      if (idx===0 || idx % 2 === 0){
        await pomodoroNext()
      }
      task.workingIntervalStart = Date.now()
      pomodoroData.start = Date.now()
      pomodoroData.timerActive = true
      await setPomodoroTask(task)
      console.log(`New working period for ${task.idTask}`)
      await pomodoroStartTimer()
    }
      // an existing Pomodoro timer is running, but clicked on a different task
    // switch to this new task, but first close the active spentTime on previous one
    else if (pomodoroData.timerActive) {
      pomodoroData.task.workingIntervalEnd = Date.now()
      await updateWorkingPeriod()
      task.workingIntervalStart = Date.now()
      pomodoroData.start = Date.now()
      await setPomodoroTask(task)
      await updatePomodoroDataOnServer()
      console.log(`New working period for ${task.idTask}`)
    }
  }
}

async function pomodoroStartWithPrevious(){
  await pomodoroOnTimerClick(pomodoroData.previousTask)
}

function getPomodoroDataObject(){
  return {
    timerActive: pomodoroData.timerActive,
    session: pomodoroData.session,
    start: pomodoroData.start,
    epoch: pomodoroData.epoch,
    remaining: pomodoroData.remaining,
    fullSessionDuration: pomodoroData.fullSessionDuration,
    notifiedEndOfBreak: pomodoroData.notifiedEndOfBreak,
    breakExpiredATimeAgo: pomodoroData.breakExpiredATimeAgo,
    task: pomodoroData.task,
  }
}

async function setPomodoroSession(index){
  pomodoroData.session = index
  await eventPropagate({
    type: 'pomodoroSetSession',
    value: index,
    pomodoroData: getPomodoroDataObject()
  })
}

function getPomodoroSession(){
  return pomodoroData.session
}

async function setPomodoroTask(task){
  pomodoroData.task= task
  if (task.key){
    pomodoroData.previousTask= task
  }
  await eventPropagate({
    type: 'pomodoroTaskStart',
    pomodoroData: getPomodoroDataObject()
  })
  //TODO: probably here goes Clockify.start signal
}

async function pomodoroRehydrate(){
  console.log('getting pomodoro rehydrated....')
  let pomData = await callApi('GET', `user/pomodoro/`)
  pomodoroData.timerActive = pomData.active
  pomodoroData.task = pomData.task
  pomodoroData.start = pomData.start
  await setPomodoroSession(pomData.state)
  if (pomData.remaining) {
    pomodoroData.remaining = pomData.remaining
    pomodoroData.epoch = getFutureEpoch(pomData.remaining)
  }
  else if (pomData.epoch) {
    pomodoroData.epoch = new Date(pomData.epoch)
    pomodoroData.remaining = getPomodoroRemainingMSecs()
  }
  console.log(pomodoroData)
  if (pomodoroData.timerActive){
    console.log(`Restoring Pomodoro start timer to end at ${pomodoroData.epoch}`)
    await pomodoroStartTimer()
    //pomodoroStartTime = new Date(pomData.timestamp * 1000)
  }
  else{
    await pomodoroUpdateLabel()
  }

}

async function eventPropagate(event){
  // console.log('sending...')
  // console.log(event)
  for (let s of pomodoroData.eventSubscribers){
    await s(event)
  }
}

function addPomodoroTickSubscriber(subscriber){
  pomodoroData.eventSubscribers.push(subscriber)
}

function setAppConfig(appConfiguration){
  appConf = appConfiguration
}

function showPomodoroMenu(){
  let popupTemplate= [
    {type: 'normal', label: 'Pause Session', enabled: pomodoroData.timerActive, click: ()=>pomodoroToggle()},
    {type: 'normal', label: 'Resume Session', enabled: !pomodoroData.timerActive, click: ()=>pomodoroToggle()},
    {type: 'normal', label: 'Skip to next session', enabled: isPomodoroSessionSkippable(), click: ()=>pomodoroSkipToNextSession()},
    {type: 'normal', label: `Start session for ${pomodoroData.previousTask?.title}`,
      enabled: isPomodoroPreviousSessionAvailable(), click: ()=>pomodoroStartWithPrevious()},
  ];
  const menu = Menu.buildFromTemplate(popupTemplate);
  if (!menu)
    return;
  menu.popup({});
}

export {pomodoroOnTimerClick, pomodoroRehydrate, addPomodoroTickSubscriber, setAppConfig, showPomodoroMenu}
