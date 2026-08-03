<script setup>
import { ref, onMounted, watch, reactive } from 'vue'
import { callApi, store_configuration } from 'src/common'

defineOptions({
  name: 'TabBar',
})

let tabs = ref([{ id: 0, name: 'main', title: 'Welcome', active: true }])
let activeTab = ref('main')
let flagIgnore = false

const remainingTime = ref('00:25')
const pomodoroSessions = ref([true, false, false, false, false, false, false, false, false])
const flashAfterExtendedInactivity = ref(true)
let flagFlashPomodoro = false
const ringTheBell = ref(true)

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

onMounted(async () => {
  console.log('tabBar.mounted')
  let config = await window.electronAPI.getConfiguration()
  if (config) {
    console.log('Loaded configuration')
    //console.log(config)
    if (!config) {
      return
    }
    store_configuration(config)
  }
  let body = document.getElementsByTagName('body')[0]
  body.style.height = '40px'
  ringTheBell.value = config.pomodoroRingTheBell
  flashAfterExtendedInactivity.value = config.pomodoroOptions.flashAfterExtendedInactivity
})

window.electronAPI.NewTabCreated(async (newTab) => {
  flagIgnore = true
  console.log('NewTabCreated')
  console.log(newTab)
  tabs.value.push({
    id: newTab.id,
    name: newTab.name,
    title: newTab.title,
    active: newTab.active,
  })
  activeTab.value = newTab.name
  flagIgnore = false
})

window.electronAPI.TabTitleUpdated(async (tabId, title) => {
  let item = tabs.value.find((item) => item.id === tabId)
  item.title = title
})

function newTab() {
  window.electronAPI.addNewEmptyTab()
}

watch(
  () => activeTab.value,
  (newVal) => {
    if (flagIgnore) {
      console.log('ignoring tab been changed')
      return
    }
    console.log('Active tab has changed')
    console.log(newVal)
    let item = tabs.value.find((item) => item.name === newVal)
    console.log(item)
    if (item == null) {
      console.log('could not find ' + item)
      return
    }
    window.electronAPI.tabActivated(item.id)
  },
)

function isSessionActive(index) {
  return pomodoroSessions.value[index] ? 'red' : 'primary'
}

window.electronAPI.pomodoroTick(async (pomodoroMsg) => {
  // console.log('Get message from pomodoro:')
  // console.log(pomodoroMsg)
  switch (pomodoroMsg.type) {
    case 'pomodoroTaskStart':
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
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
      break
    case 'pomodoroEnd':
      document.getElementById('boxRing').play()
      pomodoroData.session = pomodoroMsg.value
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
      break
    case 'pomodoroTaskChanged':
      pomodoroData.session = pomodoroMsg.value
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
      break
  }
})

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
}

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

watch(pomodoroData, async (newVal) => {
  // console.log("pomodoroData changed")
  // console.log(newVal)
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
  flashAfterExtendedInactivity.value = opts.flashAfterExtendedInactivity
})

window.electronAPI.pomodoroToggleBell(async (flag) => {
  console.log(`Ring the bell: ${flag}`)
  ringTheBell.value = flag
})

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
</script>

<template>
  <q-toolbar class="bg-primary">
    <q-btn icon="add" @click="newTab()" />
    <q-tabs v-model="activeTab" v-for="tab in tabs" v-bind:key="tab.id" align="left">
      <q-tab :name="tab.name" :label="tab.title"> </q-tab>
    </q-tabs>
    <q-space></q-space>
    <div>
      <p
        style="
          margin-bottom: 2px;
          max-width: 600px;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
        "
      >
        {{ pomodoroData.task?.key }}{{ pomodoroData.task ? ' - ' : ''
        }}{{ pomodoroData.task?.title }}
      </p>
    </div>
    <div style="margin-left: 8px">
      <q-avatar size="32px" :color="isSessionActive(1)">
        <img src="to-work-in-an-office.png" title="Session 1" />
      </q-avatar>
      <q-avatar icon="local_cafe" size="32px" title="Break 1" :color="isSessionActive(2)" />
      <q-avatar size="32px" :color="isSessionActive(3)">
        <img src="to-work-in-an-office.png" title="Session 2" />
      </q-avatar>
      <q-avatar icon="local_cafe" size="32px" title="Break 2" :color="isSessionActive(4)" />
      <q-avatar size="32px" :color="isSessionActive(5)">
        <img src="to-work-in-an-office.png" title="Session 3" />
      </q-avatar>
      <q-avatar icon="local_cafe" size="32px" title="Break 3" :color="isSessionActive(6)" />
      <q-avatar size="32px" :color="isSessionActive(7)">
        <img src="to-work-in-an-office.png" title="Session 4" />
      </q-avatar>
      <q-avatar icon="local_cafe" size="32px" title="Break 5" :color="isSessionActive(8)" />
    </div>
    <q-btn icon="hourglass_bottom" @click="pomodoroMenuClick" :label="remainingTime"> </q-btn>
  </q-toolbar>
  <div id="hiddenStuff" style="display: none">
    <audio id="boxRing" controls src="campana-de-box.mp3" v-if="ringTheBell"></audio>
  </div>
</template>

<style scoped></style>
