<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white" id="mainHeader">
      <q-toolbar>
        <q-btn dense icon="menu_open" @click="toggleLeftDrawer" ></q-btn>
        <q-toolbar-title style="min-width:190px;">
          {{ headerTitle }}
        </q-toolbar-title>


          <q-space></q-space>

          <div>
            <p style="margin-bottom: 2px; max-width: 600px; text-overflow: ellipsis;  white-space: nowrap; overflow: hidden;">
              {{ pomodoroData.task?.key }}{{ pomodoroData.task?" - ":"" }}{{ pomodoroData.task?.title }}
            </p>

          </div>
          <div style="margin-left: 8px;">

            <q-avatar size="32px" :color="isSessionActive(1)">
              <img src="to-work-in-an-office.png" title="Session 1">
            </q-avatar>
            <q-avatar icon="local_cafe" size="32px" title="Break 1" :color="isSessionActive(2)" />
            <q-avatar size="32px" :color="isSessionActive(3)">
              <img src="to-work-in-an-office.png" title="Session 2">
            </q-avatar>
            <q-avatar icon="local_cafe" size="32px" title="Break 2" :color="isSessionActive(4)" />
            <q-avatar size="32px" :color="isSessionActive(5)">
              <img src="to-work-in-an-office.png" title="Session 3">
            </q-avatar>
            <q-avatar icon="local_cafe" size="32px" title="Break 3" :color="isSessionActive(6)" />
            <q-avatar size="32px" :color="isSessionActive(7)">
              <img src="to-work-in-an-office.png" title="Session 4">
            </q-avatar>
            <q-avatar icon="local_cafe" size="32px" title="Break 5" :color="isSessionActive(8)" />
          </div>
          <q-btn icon="hourglass_bottom" @click="pomodoroMenuClick" :label="remainingTime">
          </q-btn>
        <q-space></q-space>
        <div style="margin-right: 8px;">&nbsp;&nbsp;</div>
        <q-tabs v-model="rightDrawerTab" shrink  dense indicator-color="white" v-if="rightDrawerOpen">
          <q-tab name="tabTodayTimeline" icon="today" />
          <q-tab name="tabSummary" icon="info"  />
          <!--q-tab name="tabQueue" icon="list" />
          <q-tab name="tabFilters" icon="filter_alt" /-->
        </q-tabs>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" side="left" width=250 overlay>
      <q-list bordered padding class="rounded-borders text-primary">

        <q-item v-for="board in boards" :key="board.idBoard" clickable v-ripple
                :to="{name: 'aBoard', params: {idBoard: board.idBoard}}">
          <q-item-section avatar>
            <q-icon name="view_column" />
          </q-item-section>
          <q-item-section>{{ board.name }}</q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="openPage('timeline', 'Timeline')" >
          <q-item-section avatar>
            <q-icon name="history" />
          </q-item-section>
          <q-item-section>Timeline</q-item-section>
        </q-item>

        <q-separator spaced />
        <q-item clickable v-ripple @click="openPage('admin_projects', 'Manage Projects')">
          <q-item-section avatar>
            <q-icon name="work_outline" />
          </q-item-section>
          <q-item-section>Manage Projects</q-item-section>
        </q-item>

        <q-item clickable v-ripple  >
          <q-item-section avatar>
            <q-icon name="tag" />
          </q-item-section>
          <q-item-section>Tags</q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="openPage('admin_boards', 'Manage Boards')">
          <q-item-section avatar>
            <q-icon name="view_column" />
          </q-item-section>
          <q-item-section>Manage Boards</q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="openPage('admin_users', 'Manage Users')">

          <q-item-section avatar>
            <q-icon name="manage_accounts" />
          </q-item-section>

          <q-item-section>Users</q-item-section>
        </q-item>
        <q-item clickable v-ripple @click="openPage('admin_groups', 'Manage Groups')">
          <q-item-section avatar>
            <q-icon name="groups" />
          </q-item-section>

          <q-item-section>Groups</q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon name="settings" />
          </q-item-section>

          <q-item-section>Settings</q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
        >
          <q-item-section avatar>
            <q-icon name="help" />
          </q-item-section>

          <q-item-section>Help</q-item-section>
        </q-item>
      </q-list>
      <div style="margin-top: 16px; padding-left: 16px;">
      <q-btn-dropdown dense icon="account_circle" :label="currentUsername" color="blue">
        <q-card  style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">Enter your credentials</div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <q-input label="Data API Url" name="apiUrl" v-model="apiURL" autofocus></q-input>
            <q-input label="Messenger service host:port" name="messengerHostPort" v-model="messengerHostPort" autofocus></q-input>
            <q-input label="username" name="username" v-model="credsUsername" ></q-input>
            <q-input label="password" name="password" type="password" v-model="credsPassword"></q-input>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <q-item-label>Right Drawer Width</q-item-label>
            <q-slider v-model="rightDrawerWidth" reverse :min="50" :max="750"/>
          </q-card-section>
          <q-card-actions align="right" class="text-primary">
            <q-btn flat label="Cancel" v-close-popup></q-btn>
            <q-btn flat label="Submit" v-close-popup @click="doLogin"></q-btn>
          </q-card-actions>
        </q-card>
      </q-btn-dropdown>
      </div>
    </q-drawer>

    <q-drawer v-model="rightDrawerOpen" side="right" bordered :width="rightDrawerWidth">
      <q-tab-panels v-model="rightDrawerTab" animated v-if="rightDrawerOpen">
        <q-tab-panel name="tabTodayTimeline" >
          <TMTimeLine :include-breaks="timelineIncludeBreaks" :only-billed="false" uiId="tmRightSide"
                      :end-date="today" :start-date="today" :pomodoroData="pomodoroData"
                      @select="(t)=>{onQueueTaskSelected(t);openSearchResult(t);}"
          />
          <q-toggle v-model="timelineIncludeBreaks" label="Include break periods" />
        </q-tab-panel>
        <q-tab-panel name="tabSummary" class="summary">
          <q-list>
            <q-expansion-item default-opened icon="list" label="Queue" header-class="bg-primary text-white">
              <div class="queueContainer"
                   @dragover="dragOverQueue($event)" @dragleave="dragLeaveQueue($event)" @drop="dropTaskonQueue($event)">
                <div v-if="taskQueue == null || taskQueue.length===0">
                  Drop Tasks or subtask here to track "what's next"
                </div>
                <div v-for="task in taskQueue" :key="task.idTask">
                  <TMTask class="task" :task="task" :id="`queue-task-card-${task.idTask}`" @select="(t)=>{onQueueTaskSelected(t);openSearchResult(t);}" />
                </div>
                <q-btn-dropdown color="primary" label="Queue Actions" :disable="queueSelectedTask==null" auto-close>
                  <q-list>
                    <q-item clickable v-close-popup @click="queueRemoveElement">
                      <q-item-section>
                        <q-item-label>Remove</q-item-label>
                      </q-item-section>
                    </q-item>

                    <q-item clickable v-close-popup @click="queueMoveToTop">
                      <q-item-section>
                        <q-item-label>Move to top</q-item-label>
                      </q-item-section>
                    </q-item>

                    <q-item clickable v-close-popup @click="queueMoveToBottom">
                      <q-item-section>
                        <q-item-label>Move to bottom</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-btn-dropdown>
              </div>
            </q-expansion-item>
            <q-expansion-item default-opened icon="task" :label="selectedTask ? selectedTask?.key : 'Task Info'"  header-class="bg-primary text-white">
              <div style="margin: 8px;">
                  <tm-task-description :task="selectedTask"
                                       :key="selectedTask?.uiKey ? selectedTask.uiKey :'view0'"
                                       @task-updated="updateAndShowTask(selectedTask)"
                                       @open-task="openSearchResult"
                  />
              </div>
            </q-expansion-item>
            <q-expansion-item icon="filter_alt" label="Filters / Apply Tags"  header-class="bg-primary text-white">
              <q-card>
                <q-card-section>
                  <b>Filter by Tag</b>
                  <q-list dense>
                    <q-item v-for="tag in tagsNoSystem" :key="tag.idTag" tag="label" v-ripple>
                      <q-item-section no-wrap>
                        <q-toggle v-model="selectedTags" :val="`${tag.idTag}`" :label='tag.tag'  />
                      </q-item-section>
                      <q-item-section side v-if="selectedTask!=null && !selectedTaskHasTag(tag)">
                        <q-btn icon="add" dense style="width: 18px" @click="addTag2SelectedTask(tag)" ></q-btn>
                      </q-item-section>
                      <q-item-section side v-if="selectedTask!=null && selectedTaskHasTag(tag)">
                        <q-btn icon="remove" dense style="width: 18px" @click="removeTagFromSelectedTask(tag)" ></q-btn>
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <br>
                  <b>Filters</b>
                  <div v-for="tag in tagsSystem" :key="tag.idTag"  v-ripple>
                    <q-toggle v-model="selectedTags" :val="`${tag.idTag}`" :label='tag.tag'  />
                  </div>
                  <q-toggle v-model="filterOutOldFinishedTasks" label="Hide old finished tasks" />
                  <q-toggle v-model="filterByDate" label="Activity on date range" />
                  <div v-if="filterByDate">
                    <q-date v-model="selectedDays" range today-btn  />
                  </div>
                  <q-toggle v-model="filterByStartOrDue" label="Start or Due on date range" />
                  <div v-if="filterByStartOrDue">
                    <q-date v-model="selectedDaysStartOrDue" range today-btn
                            :events="getCalendarActivity" :event-color="getCalendarActivityColor" />
                  </div>
                  <br><br>
                  <q-input v-model="searchText" debounce="1000" type="search" label="Filter Tasks containing..." dense>
                    <template v-slot:append>
                      <q-icon v-if="searchText !== ''" name="close" @click="searchText='';doSearch()" class="cursor-pointer" />
                    </template>
                    <template v-slot:after>
                      <q-btn icon="filter_alt" @click="doSearch" dense />
                    </template>
                  </q-input>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </q-list>

        </q-tab-panel>
        <!--q-tab-panel name="tabFilters" >
        </q-tab-panel>

        <q-tab-panel name="tabQueue" >
        </q-tab-panel-->
      </q-tab-panels>
    </q-drawer>

    <q-page-container id="mainContainer2">
      <router-view :showSubTask="showSubtaskNumber" :executeOp="boardExecuteOp" ></router-view>
    </q-page-container>

    <q-footer class="text-white; text-align: center; bg-primary" id="mainFooter">

    </q-footer>
  </q-layout>
</template>

<style>

div.rightDrawer {
  margin-left: 16px;
  margin-right: 16px;
  padding-top: 40px;
}

.summary h3{
  font-size: 14pt;
  padding: 0px;
  line-height: 1.2;
  margin-top: 8px;
}
.summary h4{
  font-size: 12pt;
  padding: 0px;
  margin-top: 8px;
  margin-bottom: 4px;
  font-weight: bold;
}

.summary p{
  margin-bottom: 4px;
}


.summary img{
  vertical-align: middle;
}

img.taskIcon {
  width: 24px;
  height: 24px;
  vertical-align: middle;
}

.summary code{
  background-color: #d0d0d0;
}

.timescale {
  border: 1px white solid;
  margin-left: 16px;
  margin-right: 16px;
}

table.timespentReport {
  padding: 8px;
}

table.timespentReport tr{
  margin-right: 4px;
  margin-left: 4px;
}

table.timespentReport td{
  padding-right: 4px;
  padding-left: 4px;
}

.noPomodoro {
  background-color: red;
}

a {
  color: rgb(0, 0, 238);
}

@media (prefers-color-scheme: dark) {
  .bg-primary {
    background-color: #2f418b !important;
  }

  .summary code{
    background-color: #707070;
  }

  a {
    color: rgb(0, 131, 238);
  }
}

.flex-container {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: space-around;
  align-items: stretch;
  align-content: stretch;
  width: 100%;
  border: solid 1px black;
/*   min-height: 500px; */
  margin: 16px;
/*  height: 2350px; */
  margin: 0px;
}

.flex-items {
  border: solid 1px gray;
  padding: 4px;
}

.flex-items {
  display: block;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 0;
}

/*/.flex-items:nth-child(1) {
//  display: block;
//  flex-grow: 1;
//  flex-shrink: 1;
//  flex-basis: auto;
//  align-self: auto;
//  order: 0;
//}
//
//.flex-items:nth-child(2) {
//  display: block;
//  flex-grow: 1;
//  flex-shrink: 1;
//  flex-basis: auto;
//  align-self: auto;
//  order: 0;
//}
//
//.flex-items:nth-child(3) {
//  display: block;
//  flex-grow: 1;
//  flex-shrink: 1;
//  flex-basis: auto;
//  align-self: auto;
//  order: 0;
//}
//
//.flex-items:nth-child(4) {
//  display: block;
//  flex-grow: 1;
//  flex-shrink: 1;
//  flex-basis: auto;
//  align-self: auto;
//  order: 0;
//}
//
//.flex-items:nth-child(5) {
//  display: block;
//  flex-grow: 1;
//  flex-shrink: 1;
//  flex-basis: auto;
//  align-self: auto;
//  order: 0;
//}
//
//.flex-items:nth-child(6) {
//  display: block;
//  flex-grow: 1;
//  flex-shrink: 1;
//  flex-basis: auto;
//  align-self: auto;
//  order: 0;
//}
//
//.flex-items:nth-child(7) {
//  display: block;
//  flex-grow: 1;
//  flex-shrink: 1;
//  flex-basis: auto;
//  align-self: auto;
//  order: 0;
//}
//
//.flex-items:nth-child(8) {
//  display: block;
//  flex-grow: 1;
//  flex-shrink: 1;
//  flex-basis: auto;
//  align-self: auto;
//  order: 0;
//}*/

div.canvasContainer {
  height: 2300px;
  width: 100%;
}

svg.canvas {
  height: 2300px;
  width: 100%;
}

div.dowHeader{
  text-align: center;
}

.taskTitle {
  font-family: Arial, Helvetica, sans-serif;
  font-style: normal;
  fill: white;
  font-size: 12px;
}

.timeLine {
  font-family: Arial, Helvetica, sans-serif;
  font-style: normal;
  fill: black;
  font-size: 12px;
}

.timelineline{
  stroke: black;
}

div.queueContainer {
  border: darkgray 1px dashed;
  min-height: 150px;
  padding: 8px;
  margin-top: 8px;
}

div.task.queueSelectedTask{
  background-color: lightyellow;
}

div.queueDragOverContainer {
  border: yellow 1px dashed;
  min-height: 400px;
  padding: 8px;
  margin-top: 8px;
}

@media (prefers-color-scheme: dark) {
  .timeLine {
    font-family: Arial, Helvetica, sans-serif;
    font-style: normal;
    fill: white;
    font-size: 14px;
  }

  .timelineline{
    stroke: white;
  }

  div.task.queueSelectedTask{
    background-color: #5b5c67;
  }

}


</style>

<script setup>
import {
  ref,
  reactive,
  provide,
  watch,
  onBeforeMount,
  onMounted,
  computed,
  triggerRef,
  useTemplateRef,
  nextTick,
  onUnmounted
} from 'vue'
import { callApi, callApiLogin, callLogout, Timeline, store_configuration  } from 'src/common'
//import { useSessionStore } from 'stores/user_session';
import { useUISessionStore } from 'stores/ui_state';
import { useRouter } from "vue-router";
import TMTask from "components/tmTask.vue";
import TmTaskDescription from "components/tmTaskDescription.vue";
const router = useRouter();
//const store = useSessionStore()
const uiStore = useUISessionStore()
import {
  BoardTask,
  allTaskMap
} from 'src/commonObjects'
import TMTimeLine from "components/tmTimeline.vue";
defineOptions({
  name: 'MainLayout'
})

let loadComplete=false
const currentUsername = ref("")
const boards = ref([])
const currentBoard = ref(null)
provide('currentBoardId', currentBoard)
const tags = ref([])
const tagsSystem = computed(() => tags.value.filter(t => t.system))
const tagsNoSystem = computed(() => tags.value.filter(t => !t.system))

const selectedTags = ref([])
// const searchResults = ref([])
const boardExecuteOp = ref({})
const leftDrawerOpen = ref(true);
const rightDrawerOpen = ref(true);
const rightDrawerTab = ref('tabTodayTimeline')
const rightDrawerWidth = ref(500)
const filterByDate = ref(false)
const filterByStartOrDue = ref(false)
const filterOutOldFinishedTasks = ref(true)
provide('filterOutOldFinishedTasks', filterOutOldFinishedTasks)
const selectedDay = ref("")
const selectedDays = ref({})
const selectedDaysStartOrDue = ref({})
const daysWithActivity = ref(null)
provide('daysWithActivity', daysWithActivity)
const headerIcon = ref("tm2000-2.png")
const headerIconShow = ref(true)
const headerTitle = ref("Taskmaster 2000")
provide('headerIcon' ,headerIcon)
provide('headerIconShow' ,headerIconShow)
provide('headerTitle', headerTitle)
provide('leftDrawerOpen', leftDrawerOpen)
provide('rightDrawerOpen', rightDrawerOpen)
const showSubtaskNumber = ref(0)
const timelineIncludeBreaks = ref(false)

let searchText = ref("")
const credsUsername = ref("");
const credsPassword = ref("");
const apiURL = ref("http://localhost:5437")
const messengerHostPort = ref("localhost:50052")
let allProjects = []
let selectedTask = ref()
let flagFlashPomodoro = false

let previousUIState = {
  selectedTask: {},
  pomodoroSession: 0,
  pomodoroIndex: 0,
}
let taskQueue = ref([])
let queueSelectedTask = ref(null)
// let today = ref(new Date().toISOString().split('T')[0].replaceAll('-','/'))
let today = ref("")

provide('globalSelectedTask', selectedTask)

let pomodoroData = reactive({
  timerActive: false,  // is pomodoro timer on/off
  session: 0, // Pomodoro Session number 1,3,5,7 working sessions, 2,4,6,8 break sessions
  start: 0, // session start timestamp
  epoch: 0, // timestamp (on future) when the current session ends
  remaining: 0, // for paused sessions, how many remaining seconds the current session has
  task: {idTask: null, title: "Break"} , // current task, break sessions should have a falsy idTask
//  previousTask: {idTask: null, title: "Break"},
//  timerHandler: null, // settimeout handler
  fullSessionDuration: 1500,
  notifiedEndOfBreak: false,
  breakExpiredATimeAgo: false,
})


const remainingTime = ref("00:25")
const pomodoroSessions = ref([true, false, false, false, false, false, false, false, false])

onBeforeMount(()=>{
  console.log('Before Mount')
  let sp=new URLSearchParams(location.search)
  let pageParam = sp.get('page')
  sp.delete('page')
  const params = sp.toString()
  if (pageParam) {
    router.push({path: `/${pageParam}`, query: params})
  }
})

onMounted(async ()=>{
  console.log('mounted')
  let config = await window.electronAPI.getConfiguration()
  if (config) {
    console.log('Loaded configuration')
    //console.log(config)
    if (!config){
      return
    }
    store_configuration(config)
    credsUsername.value = config.user
    currentUsername.value = config.user
    rightDrawerWidth.value = Number(config.rightDrawerWidth ? config.rightDrawerWidth : 500)
    if (config.apiURL){
      apiURL.value = config.apiURL
    }
    if (config.messengerHostPort){
      messengerHostPort.value = config.messengerHostPort
    }
  }
  const todayD = new Date();
  console.log (`today is ${todayD.getFullYear()}/${todayD.getMonth()}/${todayD.getDate()}`);
  today.value = `${todayD.getFullYear()}/${todayD.getMonth()+1}/${todayD.getDate()}`;
  await getData()
})


function isSessionActive(index){
  return pomodoroSessions.value[index] ? "red" : "primary"
}

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function toggleRightDrawer () {
  rightDrawerOpen.value = !rightDrawerOpen.value
}


async function doLogin() {
  //store.setApiURL(apiURL.value)
  await window.electronAPI.saveConfiguration({
    user: credsUsername.value,
    apiURL: apiURL.value,
    messengerHostPort: messengerHostPort.value
  })
  let config = await window.electronAPI.getConfiguration()
  store_configuration(config)
  let l = await callApiLogin(credsUsername.value, credsPassword.value)
  if (l){
    console.log('Login succeed, getting data')
    await getData()
  }
}

function doLogout() {
  callLogout()
}

async function getData() {
  console.log('Hello')
  loadComplete=false
  let whoami = await callApi('GET', 'whoami')
  if (!whoami){
    console.log('Not logged in.')
    return
  }
  window.electronAPI.setWhoAmi(whoami.user)
  let apiCallBoards = callApi('GET', 'user/boards')
  let bs = await apiCallBoards
  boards.value = []
  for (let b of bs){
    boards.value.push(b)
  }

  // tags.value = []
  let allTags = await callApi('GET', 'tags/')
  // for (let tag of allTags){
  //   tags.value.push(tag)
  // }
  tags.value = allTags

  //selectedTags.value = []
  let activeFilters = await callApi('GET', 'user/board_filters/active/')
  let filters2 = []
  console.log(`Active filters ${activeFilters}`)
  for (let activeFilter of activeFilters){
      filters2.push(`${activeFilter}`)
  }
  selectedTags.value = filters2

  //allProjects = await callApi('GET', 'user/projects')
  //let workingToday = await callApi("GET", 'user/spent_time/today')
  //setWorkingToday(workingToday)
  console.log('end getData()')
  loadComplete=true
}

function openPage(page, title){
  window.electronAPI.openPage(page)
}

watch(
  rightDrawerWidth,
  async (newVal, oldVal) =>{
    window.electronAPI.saveConfiguration({
      rightDrawerWidth: rightDrawerWidth.value
    })
  }
)

watch(
  selectedTags,
  async (newVal, oldVal) =>{
    console.log(`selectedTags ${selectedTags.value}`)
    console.log(`Updating selected tags ${newVal}, loadComplete? ${loadComplete}`)
    if (loadComplete){
      await callApi('POST', 'user/board_filters/active/', selectedTags.value)
      //console.log(`Current route: ${router.currentRoute.value.fullPath}`)
      if (router.currentRoute.value.fullPath.startsWith('/MainLayout/boards/')) {
        boardExecuteOp.value={op: "refreshData"}
      }
    }
  }
)

watch(
  filterOutOldFinishedTasks,
  async (newVal, oldVal) =>{
    if (loadComplete){
      if (router.currentRoute.value.fullPath.startsWith('/MainLayout/boards/')) {
        boardExecuteOp.value={op: "refreshData"}
      }
    }
  }
)

watch(
  pomodoroData,
  async (newVal, oldVal) =>{
    // console.log("pomodoroData changed")
    // console.log(newVal)
    if (newVal.breakExpiredATimeAgo) {
      flagFlashPomodoro = !flagFlashPomodoro
    }
    else {
      flagFlashPomodoro = false
    }
    if (flagFlashPomodoro) {
      removeClassFromElement('mainHeader', "bg-primary")
      addClassToElement('mainHeader', "noPomodoro")
      removeClassFromElement('mainFooter', "bg-primary")
      addClassToElement('mainFooter', "noPomodoro")
    }
    else{
      removeClassFromElement('mainHeader', "noPomodoro")
      addClassToElement('mainHeader', "bg-primary")
      removeClassFromElement('mainFooter', "noPomodoro")
      addClassToElement('mainFooter', "bg-primary")
    }
  }
)

async function applyDateRangeFilter(){
  if (loadComplete){
    if (!filterByDate.value){
      await callApi('POST', 'user/board_filters/show_days/', {})
    }
    else {
      await callApi('POST', 'user/board_filters/show_days/', selectedDays.value)
    }
    if (router.currentRoute.value.fullPath.startsWith('/MainLayout/boards/')) {
      boardExecuteOp.value={op: "refreshData"}
    }
  }
}

watch(
  selectedDays,
  async (newVal, oldVal) =>{
    console.log(`Showing days with activity, loadComplete? ${loadComplete}`)
    console.log(newVal)
    await applyDateRangeFilter()
  }
)

watch(
  filterByDate,
  async (newVal, oldVal) =>{
    console.log(`Showing days with activity, loadComplete? ${loadComplete}`)
    console.log(newVal)
    await applyDateRangeFilter()
  }
)

async function applyDateRangeStartOrDueFilter(){
  if (loadComplete){
    if (!filterByStartOrDue.value){
      await callApi('POST', 'user/board_filters/show_start_or_due_days/', {})
    }
    else {
      await callApi('POST', 'user/board_filters/show_start_or_due_days/', selectedDaysStartOrDue.value)
    }
    if (router.currentRoute.value.fullPath.startsWith('/MainLayout/boards/')) {
      boardExecuteOp.value={op: "refreshData"}
    }
  }
}

watch(
  selectedDaysStartOrDue,
  async (newVal, oldVal) =>{
    console.log(`Showing days with start or due dates, loadComplete? ${loadComplete}`)
    console.log(newVal)
    await applyDateRangeStartOrDueFilter()
  }
)

watch(
  filterByStartOrDue,
  async (newVal, oldVal) =>{
    console.log(`Showing days with start or due dates, loadComplete? ${loadComplete}`)
    console.log(newVal)
    await applyDateRangeStartOrDueFilter()
  }
)

watch(
  currentBoard,
  async (newVal, oldVal) =>{
    await readTaskQueue(newVal)
  }
)

async function readTaskQueue(board){
  queueSelectedTask.value=null
  let boardQueue=[]
  let queue = await callApi('GET', `user/boards/${board}/queue/`)
  if (queue==null || queue.queue==null){
    taskQueue.value=boardQueue
    return
  }
  for(let element of queue.queue){
    if (!allTaskMap.has(element)){
      console.log('There is no task map for element in queue', element)
      continue
    }
    let theTask = allTaskMap.get(element)
    boardQueue.push(theTask)
  }
  taskQueue.value=boardQueue
}

function addClassToElement(element, aClass){
  let el = document.getElementById(element)
  if (el!=null) {
    el.classList.add(aClass)
  }
}

function removeClassFromElement(element, aClass){
  let el = document.getElementById(element)
  if (el!=null){
    el.classList.remove(aClass)
  }
}

async function doSearch(){
  boardExecuteOp.value={}
  console.log(`Searching for ${searchText.value}...`)
  //const params = new URLSearchParams({term: searchText.value})
  //searchResults.value = await callApi('GET', `user/boards/${bo}/search?${params}`)
  await callApi('POST', `user/boards/${currentBoard.value}/search`, {term: searchText.value})
  if (router.currentRoute.value.fullPath.startsWith('/MainLayout/boards/')) {
    boardExecuteOp.value={op: "refreshData"}
  }
}

function getSearchResultLabel(task){
  return `${task.key} - ${task.title}`
}

function getSearchResultDescription(task){
  let board = boards.value.find(b => b.idBoard === task.idBoard)
  return `Project ${task.projectKey}, Board: ${board.name}`
}

async function openSearchResult(task){
  console.log('Showing search result')
  console.log(task)
  // if (currentBoard.value !== task.idBoard){
  //   console.log(`Navigating to /boards/${task.idBoard}`)
  //   await router.push({path: `/boards/${task.idBoard}`}) //, query: params
  //   await new Promise(r => setTimeout(r, 500));
  // }
  boardExecuteOp.value={op: "showTask", value: task.idTask}
}

function selectedTaskHasTag(tag){
  return selectedTask.value.idTags.find(t => tag.idTag === t)
}

async function addTag2SelectedTask(tag){
  if (selectedTask.value==null){
    return
  }
  await callApi('POST', `/user/tasks/${selectedTask.value.idTask}/tags/`, {tag: tag.idTag})
  selectedTask.value.idTags.push(tag.idTag)
}

async function removeTagFromSelectedTask(tag){
  if (selectedTask.value==null){
    return
  }
  await callApi('DELETE', `/user/tasks/${selectedTask.value.idTask}/tags/`, {tag: tag.idTag})
  const index = selectedTask.value.idTags.indexOf(tag.idTag);
  selectedTask.value.idTags = selectedTask.value.idTags.splice(index, 1)
}

async function pomodoroMenuClick(task) {
  let recentTasks = await callApi('GET', 'user/tasks/recent/')
  let rt = []
  for (let task of recentTasks){
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

function setPomodoroDataValues(data){
    pomodoroData.timerActive= data.timerActive
    pomodoroData.session= data.session
    pomodoroData.start= data.start
    pomodoroData.epoch= data.epoch
    pomodoroData.remaining= data.remaining
    pomodoroData.fullSessionDuration= data.fullSessionDuration
    pomodoroData.notifiedEndOfBreak= data.notifiedEndOfBreak
    pomodoroData.breakExpiredATimeAgo= data.breakExpiredATimeAgo
    pomodoroData.task= data.task
}

function getCalendarActivity(aDate){
  if (!daysWithActivity.value){
    return false
  }
  return daysWithActivity.value.has(aDate)
}

function getCalendarActivityColor(aDate){
  console.log(`get color for ${aDate}`)
  if (!daysWithActivity.value || !daysWithActivity.value.has(aDate)){
    console.log(`no activity data for ${aDate}`)
    return null
  }
  let act = daysWithActivity.value.get(aDate)
  console.log(`Activities data for ${aDate}`)
  console.log(act)
  if (act.due){
    return 'red'
  }
  if (act.start){
    return 'green'
  }
  return null
}

function openTaskOrSubTask(task){
  showSubtaskNumber.value = task.idTask
}

function dragOverQueue(event){
  if (event.preventDefault) {
    event.preventDefault();
  }
  console.log(event.currentTarget.id)
  event.currentTarget.classList.add("queueDragOverContainer")
  event.currentTarget.classList.remove("queueContainer")
}

function dragLeaveQueue(event){
  if (event.preventDefault) {
    event.preventDefault();
  }
  console.log(event.currentTarget.id)
  event.currentTarget.classList.remove("queueDragOverContainer")
  event.currentTarget.classList.add("queueContainer")

}

function saveQueue(){
  let ids = []
  for(let task of taskQueue.value) {
    ids.push(task.idTask)
  }
  callApi('POST', `user/boards/${currentBoard.value}/queue`, {queue: ids})
}

function dropTaskonQueue(event){
  if (event.preventDefault) {
    event.preventDefault();
  }
  let data = JSON.parse(event.dataTransfer.getData('text/tm2000task'));
  console.log('Dropped on queue')
  console.log(data);
  let theTask = allTaskMap.get(data.id)
  console.log(theTask)
  let element = taskQueue.value.find((task) => task.idTask === theTask.idTask)
  if (element==null){
    taskQueue.value.push(theTask)
  }
  saveQueue()
}

function queueRemoveElement(){
  let id= queueSelectedTask.value.idTask
  let newList=[]
  for(let task of taskQueue.value) {
    if(task.idTask===id){
      continue
    }
    newList.push(task)
  }
  taskQueue.value= newList
  saveQueue()
}

function queueMoveToTop(){
  let id= queueSelectedTask.value.idTask
  let newList=[queueSelectedTask.value]
  for(let task of taskQueue.value) {
    if(task.idTask===id){
      continue
    }
    newList.push(task)
  }
  taskQueue.value= newList
  saveQueue()
}

function queueMoveToBottom(){
  let id= queueSelectedTask.value.idTask
  let newList=[]
  for(let task of taskQueue.value) {
    if(task.idTask===id){
      continue
    }
    newList.push(task)
  }
  newList.push(queueSelectedTask.value)
  taskQueue.value= newList
  saveQueue()
}


async function updateAndShowTask(task){
  console.log('Showing search result')
  console.log(task)
  selectedTask.value=null
  // if (currentBoard.value !== task.idBoard){
  //   console.log(`Navigating to /boards/${task.idBoard}`)
  //   await router.push({path: `/boards/${task.idBoard}`}) //, query: params
  //   await new Promise(r => setTimeout(r, 500));
  // }
  boardExecuteOp.value={op: "updateAndShowTask", value: task.idTask}
}

function onQueueTaskSelected(task){
  if (queueSelectedTask.value && document.getElementById(`queue-task-card-${queueSelectedTask.value.idTask}`)){
    document.getElementById(`queue-task-card-${queueSelectedTask.value.idTask}`).classList.remove("queueSelectedTask")
  }
  queueSelectedTask.value=task
  let uiElement = document.getElementById(`queue-task-card-${task.idTask}`)
  if (uiElement){
    uiElement.classList.add("queueSelectedTask")
  }
}

window.electronAPI.onTaskUpdate(async(idTask) => {
  console.log(`got signal of an updated task: ${idTask}`)
  let updated=false
  for (let task of taskQueue.value) {
    if(task.idTask===idTask){
      taskQueue.value = []
      await nextTick()
      updated=true
      break
    }
  }
  await readTaskQueue(currentBoard.value)
})

window.electronAPI.pomodoroTick(async(pomodoroMsg) => {
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
      break;
    case 'pomodoroSetSession':
      pomodoroSessions.value[pomodoroData.session] = false
      pomodoroSessions.value[pomodoroMsg.value] = true;
      pomodoroData.session = pomodoroMsg.value
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
      break
    case 'pomodoroEnd':
      document.getElementById('boxRing').play()
      pomodoroData.session = pomodoroMsg.value
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
      break;
    case 'pomodoroTaskChanged':
      pomodoroData.session = pomodoroMsg.value
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
      break;
  }

})

</script>
