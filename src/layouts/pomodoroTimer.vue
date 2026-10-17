<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { callApi, store_configuration } from 'src/common'
import TMTimeLine from 'components/tmTimeline.vue'

let pomodoroData = reactive({
  timerActive: false, // is pomodoro timer on/off
  session: 0, // Pomodoro Session number 1,3,5,7 working sessions, 2,4,6,8 break sessions
  start: 0, // session start timestamp
  epoch: 0, // timestamp (on future) when the current session ends
  remaining: 0, // for paused sessions, how many remaining seconds the current session has
  task: { idTask: null, title: 'Break' }, // current task, break sessions should have a falsy idTask
  //  previousTask: {idTask: null, title: "Break"},
  //  timerHandler: null, // settimeout handler
  fullSessionDuration: 1500,
  notifiedEndOfBreak: false,
  breakExpiredATimeAgo: false,
})
let today = ref('')
let pomodoroLabels = ref('bottom')
const remainingTime = ref('00:25')
const flashAfterExtendedInactivity = ref(true)

const workingSession = computed(() => {
  let result = ''
  switch (pomodoroData.session) {
    case 1:
      result = '1'
      break
    case 3:
      result = '2'
      break
    case 5:
      result = '3'
      break
    case 7:
      result = '4'
      break
  }
  return result
})

let showTimeline = ref(true)
const pomodoroSessions = ref([true, false, false, false, false, false, false, false, false])
let flagFlashPomodoro = false
let ringTheBell = ref(true)

async function pomodoroMenuClick() {
  let recentTasks = await callApi('GET', 'user/tasks/recent/')
  let rt = []
  for (let task of recentTasks) {
    rt.push({
      label: `${task.key}: ${task.title} (${task.projectName})`,
      value: {
        idTask: task.idTask,
        idProject: task.idProject,
        description: `${task.key}: ${task.title} (${task.projectName})`,
        title: task.title,
        key: task.key,
        color: task.color,
      },
    })
  }
  await window.electronAPI.pomodoroMenuClick(rt)
}

// function isSessionActive(index) {
//   return pomodoroSessions.value[index] ? 'red' : 'primary'
// }

function setPomodoroDataValues(data) {
  pomodoroData.timerActive = data.timerActive
  pomodoroData.session = data.session
  pomodoroData.start = data.start
  pomodoroData.epoch = data.epoch
  pomodoroData.remaining = data.remaining
  pomodoroData.fullSessionDuration = data.fullSessionDuration
  pomodoroData.notifiedEndOfBreak = data.notifiedEndOfBreak
  pomodoroData.breakExpiredATimeAgo = data.breakExpiredATimeAgo
  pomodoroData.task = data.task
  //console.log(pomodoroData)
}

window.electronAPI.pomodoroTick(async (pomodoroMsg) => {
  // console.log('Get message from pomodoro:')
  console.log(pomodoroMsg)
  switch (pomodoroMsg.type) {
    case 'pomodoroTaskStart':
      console.log('pomodoroTaskStart')
      //pomodoroSessions.value=[false, false, false, false, false, false, false, false]
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
      //pomodoroSessions.value[pomodoroData.session] = true;
      break
    case 'updateTimer':
      //console.log('pomodoro tick')
      remainingTime.value = pomodoroMsg.value.remainingTime
      setPomodoroDataValues(pomodoroMsg.value.pomodoroData)
      break
    case 'pomodoroSetSession':
      pomodoroSessions.value[pomodoroData.session] = false
      pomodoroSessions.value[pomodoroMsg.value] = true
      pomodoroData.session = pomodoroMsg.value
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
      //console.log('setup tentative period')
      break
    case 'pomodoroEnd':
      //pomodoroSessions.value[pomodoroData.session] = false
      //pomodoroSessions.value[pomodoroMsg.value] = true;
      pomodoroData.session = pomodoroMsg.value
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
      document.getElementById('boxRing').play()
      break
  }
})

function addClassToElement(element, aClass) {
  let el = document.getElementById(element)
  if (el != null) {
    el.classList.add(aClass)
  }
}

function removeClassFromElement(element, aClass) {
  let el = document.getElementById(element)
  if (el != null) {
    el.classList.remove(aClass)
  }
}

async function init() {
  window.document.title = 'Pomodoro Timer'
  const todayD = new Date()
  console.log(`today is ${todayD.getFullYear()}/${todayD.getMonth()}/${todayD.getDate()}`)
  today.value = `${todayD.getFullYear()}/${todayD.getMonth() + 1}/${todayD.getDate()}`
}

watch(pomodoroData, async (newVal) => {
  //console.log("pomodoroData changed")
  //console.log(newVal)
  if (newVal.breakExpiredATimeAgo && flashAfterExtendedInactivity.value) {
    flagFlashPomodoro = !flagFlashPomodoro
  } else {
    flagFlashPomodoro = false
  }
  let bgStyle = 'bg-primary'
  if (flagFlashPomodoro) {
    removeClassFromElement('mainHeader', bgStyle)
    addClassToElement('mainHeader', 'noPomodoro')
    removeClassFromElement('mainFooter', bgStyle)
    addClassToElement('mainFooter', 'noPomodoro')
    removeClassFromElement('rightHeader', bgStyle)
    addClassToElement('rightHeader', 'noPomodoro')
  } else {
    removeClassFromElement('mainHeader', bgStyle)
    addClassToElement('mainHeader', bgStyle)
    removeClassFromElement('mainFooter', 'noPomodoro')
    addClassToElement('mainFooter', bgStyle)
    removeClassFromElement('rightHeader', 'noPomodoro')
    addClassToElement('rightHeader', bgStyle)
  }
})

window.electronAPI.pomodoroOptions(async (opts) => {
  console.log(`Set Pomodoro options to ${opts}`)
  pomodoroLabels.value = opts.pomodoroLabelsPosition
  showTimeline.value = opts.showTimeline
})

window.electronAPI.pomodoroToggleBell(async (flag) => {
  console.log(`Ring the bell: ${flag}`)
  ringTheBell.value = flag
})

function rightAlignmentClass() {
  let r = !showTimeline.value && pomodoroLabels.value === 'right'
  return r ? 'MainContainer2' : 'MainContainer'
}

onMounted(async () => {
  console.log('mounted')
  let config = await window.electronAPI.getConfiguration()
  if (config) {
    console.log('Loaded configuration')
    //console.log(config)
    if (!config) {
      return
    }
    pomodoroLabels.value = config.pomodoroOptions.pomodoroLabelsPosition
    showTimeline.value = config.pomodoroOptions.showTimeline
    flashAfterExtendedInactivity.value = config.pomodoroOptions.flashAfterExtendedInactivity
    if (!showTimeline.value && pomodoroLabels.value === 'right') {
      let main = document.getElementById('mainContainerMain')
      removeClassFromElement(main, 'MainContainer')
      addClassToElement(main, 'MainContainer2')
    }
    ringTheBell.value = config.pomodoroRingTheBell
    store_configuration(config)
  }
  await init()
})
</script>

<template>
  <div class="metaContainer">
    <div :class="rightAlignmentClass()" id="mainContainerMain">
      <div class="timelineContainer" v-if="showTimeline">
        <div style="width: 100%; padding: 16px; justify-content: right">
          <TMTimeLine
            :include-breaks="false"
            :only-billed="false"
            uiId="tmMainPMW"
            :end-date="today"
            :start-date="today"
            :pomodoroData="pomodoroData"
          />
        </div>
      </div>
      <div
        class="flex-container"
        id="mainHeader"
        style="margin: 0; padding: 0"
        v-if="pomodoroLabels === 'bottom'"
      >
        <div
          class="flex-items"
          style="display: flex; align-items: center; justify-content: center; padding: 0; margin: 0"
        >
          <div class="taskText">
            {{ pomodoroData.task?.key }}{{ pomodoroData.task ? ' - ' : ''
            }}{{ pomodoroData.task?.title }}
          </div>
        </div>

        <div class="flex-items">
          <q-btn icon="timer" @click="pomodoroMenuClick" label="" />
          <q-circular-progress
            show-value
            font-size="12px"
            :value="pomodoroData.session"
            size="75px"
            :thickness="0.33"
            color="orange"
            track-color="grey-3"
            class="q-ma-md"
            :min="0"
            :max="8"
          >
            <q-avatar size="32px" v-if="pomodoroData.session % 2 === 1">
              <img src="working.png" title="Session 1" />
            </q-avatar>
            <q-avatar
              icon="local_cafe"
              size="32px"
              title="Break 1"
              v-if="pomodoroData.session % 2 === 0"
            />
            {{ workingSession }}
          </q-circular-progress>
        </div>
        <div class="flex-items">
          <q-circular-progress
            show-value
            font-size="12px"
            :value="pomodoroData.fullSessionDuration - pomodoroData.remaining"
            size="75px"
            :thickness="0.33"
            track-color="light-blue"
            color="grey-3"
            class="q-ma-md"
            :min="0"
            :max="pomodoroData.fullSessionDuration"
            reverse
          >
            {{ remainingTime }}
          </q-circular-progress>
        </div>
      </div>
    </div>
    <div id="rightHeader" class="rightHeader" v-if="pomodoroLabels === 'right'">
      <div class="taskTextRight">
        {{ pomodoroData.task?.key }}<br />{{ pomodoroData.task?.title }}
      </div>
      <div style="width: 100%; text-align: center; justify-content: center">
        <q-circular-progress
          show-value
          font-size="12px"
          :value="pomodoroData.session"
          size="75px"
          :thickness="0.33"
          color="orange"
          track-color="grey-3"
          class="q-ma-md"
          :min="0"
          :max="8"
        >
          <q-avatar size="32px" v-if="pomodoroData.session % 2 === 1">
            <img src="working.png" title="Session 1" />
          </q-avatar>
          <q-avatar
            icon="local_cafe"
            size="32px"
            title="Break 1"
            v-if="pomodoroData.session % 2 === 0"
          />
          {{ workingSession }}
        </q-circular-progress>
        <q-circular-progress
          show-value
          font-size="12px"
          :value="pomodoroData.fullSessionDuration - pomodoroData.remaining"
          size="75px"
          :thickness="0.33"
          track-color="light-blue"
          color="grey-3"
          class="q-ma-md"
          :min="0"
          :max="pomodoroData.fullSessionDuration"
          reverse
        >
          {{ remainingTime }}
        </q-circular-progress>
        <br />
        <q-btn icon="timer" @click="pomodoroMenuClick" />
      </div>
    </div>
  </div>
  <div id="hiddenStuff" style="display: none">
    <audio id="boxRing" controls src="campana-de-box.mp3" v-if="ringTheBell"></audio>
  </div>
</template>

<style>
body {
  overflow-y: hidden;
}

.MainContainer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  flex: 4;
}

.MainContainer2 {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.metaContainer {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
}

#mainHeader {
  flex-shrink: 0;
  /* height: 50px; */
}

.timelineContainer {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  align-self: normal;
}

.statusBar {
  flex-grow: 0;
}
</style>

<style scoped>
.noPomodoro {
  background-color: red;
}

.taskText {
  padding: 0 4px;
  margin: 0;
  /*max-width: 600px;*/
  /* text-overflow: ellipsis;*/
  text-align: center;
  white-space: normal;
  overflow: hidden;
}

.taskTextRight {
  padding: 0 4px;
  margin: 0;
  text-align: center;
  white-space: normal;
  overflow: hidden;
}

.flex-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: normal;
  align-items: normal;
  align-content: normal;
  color: white;
  /* height: 44px; */
  margin: 0;
  padding-top: 2px;
}

.flex-items:nth-child(1) {
  display: block;
  flex-grow: 2;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 0;
}

.flex-items:nth-child(2) {
  display: block;
  flex-grow: 0;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 1;
  /* max-width: 260px; */
}

.flex-items:nth-child(3) {
  display: block;
  flex-grow: 0;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 2;
  /* max-width: 110px; */
}

.rightHeader {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  align-self: normal;
  color: white;
  align-items: center;
  align-content: center;
}
</style>
