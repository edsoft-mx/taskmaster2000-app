<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white" id="mainHeader">
      <q-toolbar>
        <q-btn dense icon="menu_open" @click="toggleLeftDrawer" ></q-btn>
        <q-toolbar-title style="min-width:190px;">
          {{ headerTitle }}
        </q-toolbar-title>

        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="32px" class="timescale" id="canvasWorkDay" >
          <defs>
            <linearGradient id="horzGrad1">
              <stop offset="0%" stop-opacity="85" />
              <stop offset="50%" stop-opacity="0" />
              <stop offset="100%" stop-opacity="85" />
            </linearGradient>
          </defs>
          <rect v-for="interval in timelineObjectHor?.workDayIntervals(timelineObject.workDayData.todayKey)"
                :x="timelineObjectHor.getIntervalX(interval)" :key="interval.id"
                y="0" height="100%" :fill="interval.color" stroke="white"
                :fill-opacity="interval?.tentative ? 0.5 : 1.0"
                :width="timelineObjectHor.getIntervalWidth(interval)" />
        </svg>
        <q-btn-dropdown dense dropdown-icon="query_builder">
          <div >
            <table class="timespentReport">
              <thead>
              <tr>
                <th>Project</th>
                <th>Duration</th>
                <th>Task</th>
                <th>Start</th>
                <th>End</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="interval in timelineObjectHor?.workDayData.intervalsWithIdle" :key="interval.start" >
                <td :style="`background-color: ${interval.color}; text-align: center; color: white;`">{{ interval.project }}</td>
                <td style="text-align: right;">{{ getInterval(interval.elapsed) }}</td>
                <td>{{ interval.title }}</td>
                <td style="text-align: right;">{{ getTime(interval.start) }}</td>
                <td style="text-align: right;">{{ getTime(interval.end) }}</td>
              </tr>
              </tbody>
            </table>
          </div>
        </q-btn-dropdown>
        <q-btn-dropdown dense icon="account_circle" :label="store.getCurrentUser">
          <q-card  style="min-width: 350px">
            <q-card-section>
              <div class="text-h6">Enter your credentials</div>
            </q-card-section>
            <q-card-section class="q-pt-none">
              <q-input label="API Url" name="apiUrl" v-model="apiURL" autofocus></q-input>
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
        <q-btn dense icon="view_sidebar" @click="toggleRightDrawer" />
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
    </q-drawer>

    <q-drawer v-model="rightDrawerOpen" side="right" bordered :width="rightDrawerWidth">
      <q-tab-panels v-model="rightDrawerTab" animated v-if="rightDrawerOpen">
        <q-tab-panel name="tabSummary" class="summary" >
          <div v-html="rightDrawerHeader"></div>
          <VueShowdown :markdown="rightDrawerContent" flavor="github" :options="{ emoji:true, headerLevelStart:3,
            tasklists: true, openLinksInNewWindow: true, moreStyling: true }" />
          <div v-if="selectedTask && selectedTask.idTask">
          <q-date v-model="selectedDay" today-btn :events="getCalendarForTask" :event-color="getTaskColor" />
          <br>
          <q-btn label="Set Start Date" :disable="selectedDay==='' || !selectedTask" @click="calendarSetStartDate" />
          <q-btn label="Set Due Date" :disable="selectedDay==='' || !selectedTask" @click="calendarSetDueDate" />
          </div>
          <VueShowdown :markdown="rightDrawerContent2" flavor="github" :options="{ emoji:true, headerLevelStart:3,
            tasklists: true, openLinksInNewWindow: true, moreStyling: true }" />
          <q-list bordered v-if="rightDrawerSubtasks.length > 0">
            <q-item v-for="subtask in rightDrawerSubtasks" @click="openTaskOrSubTask(subtask)" :key="subtask.id" :clickable="!subtask.isNew" :v-ripple="!subtask.isNew">
              <q-item-section>
                <q-item-label lines="3">
                  <b>{{ subtask.key }}</b> <q-chip color="primary" dense square size="s" text-color="white">{{ subtask.state }}</q-chip>
                </q-item-label>
                <q-item-label>
                  {{ subtask.title }}
                </q-item-label>

              </q-item-section>
            </q-item>
          </q-list>

        </q-tab-panel>
        <q-tab-panel name="tabFilters" >
          <b>Tags</b>
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
          <q-toggle v-model="filterByDate" label="Activity on date range" />
          <div v-if="filterByDate">
            <q-date v-model="selectedDays" range today-btn  />
          </div>
          <q-toggle v-model="filterByStartOrDue" label="Start or Due on date range" />
          <div v-if="filterByStartOrDue">
            <q-date v-model="selectedDaysStartOrDue" range today-btn
                    :events="getCalendarActivity" :event-color="getCalendarActivityColor" />
          </div>

        </q-tab-panel>
        <q-tab-panel name="tabTodayTimeline" >
          <div class="flex-container">
            <div class="flex-items" style="max-width: 54px">
              <div>Time</div>
              <div class="canvasContainer">
                <svg class="canvas" id="canvasTimeline">
                  <line v-for="tick in timelineObject.workDayData.workingHours" :key="tick.epoch" stroke-dasharray="4" class="timelineline" x1="0" x2="100%"
                        :y1="timelineObject.tickYPosition(tick)" :y2="timelineObject.tickYPosition(tick)" />
                  <text v-for="tick in timelineObject.workDayData.workingHours" :key="tick.epoch" x="0" :y="timelineObject.tickYPosition(tick)"  class="timeLine">
                    {{ tick.time }}
                  </text>
                </svg>
              </div>
            </div>
            <div v-for="dow in timelineObject.workDayData.daysToShow" :key="dow" class="flex-items">
              <div class="dowHeader">{{ timelineObject.workDayData.dayNameMap.get(dow) }}</div>
              <div class="canvasContainer"><svg class="canvas">
                <line v-for="tick in timelineObject.workDayData.workingHours" :key="tick.epoch" stroke-dasharray="4" class="timelineline" x1="0" x2="100%" :y1="timelineObject.tickYPosition(tick)"
                      :y2="timelineObject.tickYPosition(tick)" />
                <g v-for="interval in timelineObject.workDayIntervals(dow)" :key="interval.id">
                  <rect
                    x="0"
                    :y="timelineObject.getIntervalY(interval)"
                    width="100%"
                    :fill="interval.color"
                    stroke="white"
                    :height="timelineObject.getIntervalHeight(interval)"
                    :title="interval.task" />
                  <text x="2" :y="timelineObject.getIntervalY(interval)+16" v-if="timelineObject.isLongEnough4Text(interval)" class="taskTitle" >
                    <tspan x="2" dy="0">{{ interval.task }}</tspan>
                    <tspan x="2" dy="1.2em">{{ interval.taskKey }}</tspan>
                    <tspan x="2" dy="1.2em">{{ timelineObject.getTimeOfDay(interval.elapsed) }}</tspan>
                  </text>
                </g>
                <line v-if="dow == timelineObject.workDayData.todayKey" stroke="red"
                      x1="0"  x2="100%" :y1="timelineObject.currentTime()" :y2="timelineObject.currentTime()+1"
                />
              </svg></div>
            </div>
          </div>

        </q-tab-panel>
        <q-tab-panel name="tabCalendar" >

        </q-tab-panel>
      </q-tab-panels>
    </q-drawer>

    <q-page-container id="mainContainer2">
      <router-view :showSubTask="showSubtaskNumber" :executeOp="boardExecuteOp" ></router-view>
    </q-page-container>

    <q-footer class="text-white; text-align: center; bg-primary" id="mainFooter">
      <q-toolbar>

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


        <q-tabs v-model="rightDrawerTab" shrink  dense indicator-color="white" v-if="rightDrawerOpen">
          <q-tab name="tabSummary" icon="info" />
          <q-tab name="tabFilters" icon="filter_alt" />
          <q-tab name="tabTodayTimeline" icon="today" />
          <q-tab name="tabCalendar" icon="calendar_month" />
        </q-tabs>
        <q-input v-model="searchText" debounce="1000"  type="search" input-style="color:white;"  label="Search" color="white" label-color="white" dense class="q-ml-md text-white" />
        <q-btn-dropdown dropdown-icon="search" dense auto-close @click="doSearch">
          <div>
            <q-list bordered>
              <q-item v-for="result in searchResults" :key="result.idTask" clickable v-ripple @click="openSearchResult(result)" >
                <q-item-section avatar>
                  <q-avatar>
                    <img src="../../public/subtask.png" style="width: 16px; height: 16px;">
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label >
                    {{ getSearchResultLabel(result) }}
                    <q-chip color="primary" dense square size="s" text-color="white">{{ result.state }}</q-chip>
                  </q-item-label>
                  <q-item-label caption >
                    {{ getSearchResultDescription(result) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-btn-dropdown>

        </q-toolbar>
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
  min-height: 500px;
  margin: 16px;
  height: 2350px;
  margin: 0px;
}

.flex-items {
  border: solid 1px gray;
  padding: 4px;
}

.flex-items:nth-child(1) {
  display: block;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 0;
}

.flex-items:nth-child(2) {
  display: block;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 0;
}

.flex-items:nth-child(3) {
  display: block;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 0;
}

.flex-items:nth-child(4) {
  display: block;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 0;
}

.flex-items:nth-child(5) {
  display: block;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 0;
}

.flex-items:nth-child(6) {
  display: block;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 0;
}

.flex-items:nth-child(7) {
  display: block;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 0;
}

.flex-items:nth-child(8) {
  display: block;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
  align-self: auto;
  order: 0;
}

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

}


</style>

<script setup>
import {ref, reactive, provide, watch, onBeforeMount, onMounted, computed, triggerRef} from 'vue'
import { callApi, callApiLogin, callLogout, Timeline  } from 'src/common'
import { useSessionStore } from 'stores/user_session';
import { useUISessionStore } from 'stores/ui_state';
import { useRouter } from "vue-router";
const router = useRouter();
const store = useSessionStore()
const uiStore = useUISessionStore()

defineOptions({
  name: 'MainLayout'
})

let loadComplete=false
const boards = ref([])
const currentBoard = ref(null)
provide('currentBoardId', currentBoard)
const tags = ref([])
const tagsSystem = computed(() => tags.value.filter(t => t.system))
const tagsNoSystem = computed(() => tags.value.filter(t => !t.system))

const selectedTags = ref([])
const searchResults = ref([])
const boardExecuteOp = ref({})
const leftDrawerOpen = ref(true);
const rightDrawerOpen = ref(true);
const rightDrawerTab = ref('tabSummary')
const rightDrawerWidth = ref(500)
const filterByDate = ref(false)
const filterByStartOrDue = ref(false)
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
const rightDrawerContent = ref("")
const rightDrawerContent2 = ref("")
const rightDrawerHeader = ref("")
const rightDrawerSubtasks = ref([])
const showSubtaskNumber = ref(0)
provide('rightDrawerContent', rightDrawerContent)
provide('rightDrawerContent2', rightDrawerContent2)
provide('rightDrawerHeader', rightDrawerHeader)
provide('rightDrawerSubtasks', rightDrawerSubtasks)
let searchText = ref("")
const credsUsername = ref("");
const credsPassword = ref("");
const apiURL = ref("http://localhost:5000")
let allProjects = []
let selectedTask = ref()
let timelineObject = ref(null)
let timelineObjectHor = ref(null)
let tentativePeriod = null
let previousUIState = {
  selectedTask: {},
  pomodoroSession: 0,
  pomodoroIndex: 0,
}

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
//provide ('pomodoroData', pomodoroData)

// let workDayIntervals = ref([])
// let workDayData = {}
// let workDayCurrentInterval = null

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

onMounted(()=>{
  console.log('mounted')
  getData()
})


function getIntervalX(interval) {
  let x = (interval.start - workDayData.first) * workDayData.conversion
  // console.log(`${interval.task}.interval.x(${interval.start}) = ${x}`)
  return x
}

function getIntervalWidth(interval) {
  let w = interval.elapsed * workDayData.conversion
  // console.log(`${interval.task}.interval.w(${interval.elapsed}) = ${w}`)
  return w
}

function getTime(epoch){
  let aDate = new Date(epoch*1000)
  aDate.setHours(aDate.getHours() + 6)
  return aDate.toLocaleTimeString()
}

function getInterval(totalSeconds){
  let output = ''
  if (totalSeconds < 3600) {
    let minutes = Math.trunc(totalSeconds / 60)
    let seconds = Math.floor(totalSeconds % 60)
    let sp = seconds > 0 ? `${seconds}s` : ''
    output = minutes > 0 ? `${minutes}m ${sp}` : sp
  }
  else {
    let hours = Math.floor(totalSeconds / 3600)
    let remainingSeconds = totalSeconds - (hours * 3600)
    let minutes = Math.trunc(remainingSeconds / 60)
    let seconds = Math.floor(remainingSeconds % 60)
    output = `${hours}h, ${minutes}m, ${seconds}s`
  }
  return output
}

function setWorkingToday(data) {
  console.log('setWorkingToday')
  //let canvasHeight = canvas.clientHeight
  let tl_tentativePeriod = {active: false}
  let tl_tentativePeriodHor = {active: false}
  if (timelineObject.value != null){
    tl_tentativePeriod = timelineObject.value.getTentativePeriod(pomodoroData)
  }
  if (timelineObjectHor.value != null){
    tl_tentativePeriodHor= timelineObjectHor.value.getTentativePeriod(pomodoroData)
  }
  let canvas = document.getElementById('canvasWorkDay')
  let canvasWidth = canvas.clientWidth //? canvas.clientWidth : 1024
  timelineObject.value = new Timeline(data, 2300, true, false, true)
  timelineObjectHor.value = new Timeline(data, 0, false, false, false, canvasWidth)
  if (tl_tentativePeriod.active){
    timelineObject.value.restoreTentativePeriod(pomodoroData ,tl_tentativePeriod.interval)
  }
  if (tl_tentativePeriodHor.active){
    timelineObjectHor.value.restoreTentativePeriod(pomodoroData, tl_tentativePeriodHor.interval)
  }
}
//provide('setWorkingToday', setWorkingToday)

function isSessionActive(index){
  return pomodoroSessions.value[index] ? "red" : "primary"
}

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function toggleRightDrawer () {
  rightDrawerOpen.value = !rightDrawerOpen.value
}



// function toggleDisplayFilters(){
//   showTaskFilters.value = !showTaskFilters.value
//   let taskDetails = document.getElementById('rightDrawerTaskDetails')
//   let filtersPanel = document.getElementById('rightDrawerFilters')
//   console.log('here')
//   if (showTaskFilters.value){
//     rightDrawerOpen.value = true
//     filtersPanel.style='display: block;';
//     let s = taskDetails.style;
//     s.display="none"
//   }
//   else {
//     filtersPanel.style='display: none;';
//     let s = taskDetails.style;
//     s.display="block"
//   }
// }


async function doLogin() {
  store.setApiURL(apiURL.value)
  window.electronAPI.saveConfiguration({
    user: credsUsername.value,
    apiURL: apiURL.value,
  })
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
  let config = await window.electronAPI.getConfiguration()
  if (config) {
    console.log('Loaded configuration')
    console.log(config)
    if (!config){
      return
    }
    credsUsername.value = config.user
    rightDrawerWidth.value = Number(config.rightDrawerWidth ? config.rightDrawerWidth : 500)
    apiURL.value = config.apiURL
    store.setApiURL(config.apiURL)
    if (config.token && config.user){
      store.setCurrentUser(config.user, config.token)
    }
  }
  let whoami = await callApi('GET', 'whoami')
  if (!whoami){
    console.log('Not logged in.')
  }
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
  let activeFilters = await callApi('GET', 'user/active_filters/')
  let filters2 = []
  console.log(`Active filters ${activeFilters}`)
  for (let activeFilter of activeFilters){
      filters2.push(`${activeFilter}`)
  }
  selectedTags.value = filters2

  allProjects = await callApi('GET', 'user/projects')
  let workingToday = await callApi("GET", 'user/spent_time/today')
  setWorkingToday(workingToday)

  loadComplete=true
}

function openPage(page, title){
  window.electronAPI.openPage(page)
}

function getCalendarForTask(aDate){
  if (selectedTask.value == null){
    return false
  }
  else {
    let events= selectedTask.value.daysWorked
    if (selectedTask.value.dueDate){
      console.log("due")
      console.log(selectedTask.value.dueDate.substring(0,10))
      events.push(selectedTask.value.dueDate.substring(0,10).replaceAll('-','/'))
    }
    if (selectedTask.value.estimatedStartDate){
      console.log("start")
      console.log(selectedTask.value.estimatedStartDate.substring(0,10))
      events.push(selectedTask.value.estimatedStartDate.substring(0,10).replaceAll('-','/'))
    }
    return events.includes(aDate)
  }

}

function getTaskColor(aDate){
  let events= selectedTask.value.daysWorked
  if (selectedTask.value.dueDate && selectedTask.value.dueDate.substring(0,10).replaceAll('-','/')===aDate){
    console.log("due")
    console.log(selectedTask.value.dueDate)
    return "red"
  }
  if (selectedTask.value.estimatedStartDate && selectedTask.value.estimatedStartDate.substring(0,10).replaceAll('-','/')===aDate){
    console.log("start")
    console.log(selectedTask.value.estimatedStartDate)
    return "green"
  }
  return "blue"
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
      await callApi('POST', 'user/active_filters/', selectedTags.value)
      if (router.currentRoute.value.fullPath.startsWith('/boards/')) {
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
      await callApi('POST', 'user/show_days/', {})
    }
    else {
      await callApi('POST', 'user/show_days/', selectedDays.value)
    }
    if (router.currentRoute.value.fullPath.startsWith('/boards/')) {
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
      await callApi('POST', 'user/show_start_or_due_days/', {})
    }
    else {
      await callApi('POST', 'user/show_start_or_due_days/', selectedDaysStartOrDue.value)
    }
    if (router.currentRoute.value.fullPath.startsWith('/boards/')) {
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
  const params = new URLSearchParams({term: searchText.value})
  searchResults.value = await callApi('GET', `user/search?${params}`)
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
  if (currentBoard.value !== task.idBoard){
    console.log(`Navigating to /boards/${task.idBoard}`)
    await router.push({path: `/boards/${task.idBoard}`}) //, query: params
    await new Promise(r => setTimeout(r, 500));
  }
  boardExecuteOp.value={op: "showTask", value: task.hierarchy}
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

async function pomodoroOnTimerClick(task) {
  // ...
  let workingToday2 = await callApi("GET", 'user/spent_time/today')
  setWorkingToday(workingToday2)
}

uiStore.$subscribe(async (mutation, state) => {
  if (state.selectedTask != previousUIState.selectedTask){

  }
  if (state.pomodoroSession != previousUIState.pomodoroSession){
    let workingToday2 = await callApi("GET", 'user/spent_time/today')
    setWorkingToday(workingToday2)
  }
  if (state.pomodoroIndex != previousUIState.pomodoroIndex){

  }

})

async function removeTagFromSelectedTask(tag){
  if (selectedTask.value==null){
    return
  }
  await callApi('DELETE', `/user/tasks/${selectedTask.value.idTask}/tags/`, {tag: tag.idTag})
  const index = selectedTask.value.idTags.indexOf(tag.idTag);
  selectedTask.value.idTags = selectedTask.value.idTags.splice(index, 1)
}

async function pomodoroMenuClick(task) {
  await window.electronAPI.pomodoroMenuClick()
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
}

async function calendarSetStartDate(){
  let data = {
    idBoard: currentBoard.value,
    estimatedStartDate: selectedDay.value.replaceAll("/", "-")+ " 12:00:00"
  }
  await callApi("POST", `user/tasks/${selectedTask.value.idTask}`, data)
}

async function calendarSetDueDate(){
  let data = {
    idBoard: currentBoard.value,
    dueDate: selectedDay.value.replaceAll("/", "-")+ " 12:00:00"
  }
  await callApi("POST", `user/tasks/${selectedTask.value.idTask}`, data)
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


function setTentativeIfNotSet(){
  if (timelineObject.value != null && timelineObject.value.tentativePeriod===-1) {
    timelineObject.value.startTentativePeriod(pomodoroData, allProjects)
  }
  if (timelineObjectHor.value != null && timelineObjectHor.value.tentativePeriod===-1) {
    timelineObjectHor.value.startTentativePeriod(pomodoroData, allProjects)
  }
}

function openTaskOrSubTask(task){
  showSubtaskNumber.value = task.idTask
}

window.electronAPI.pomodoroTick(async(pomodoroMsg) => {
  // console.log('Get message from pomodoro:')
  // console.log(pomodoroMsg)
  switch (pomodoroMsg.type) {
    case 'pomodoroTaskStart':
      console.log('pomodoroTaskStart')
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
      setTentativeIfNotSet()
      break
    case 'updateTimer':
      //console.log('pomodoro tick')
      remainingTime.value = pomodoroMsg.value.remainingTime
      pomodoroData.task = pomodoroMsg.value.task
      setPomodoroDataValues(pomodoroMsg.value.pomodoroData)
      if (timelineObject.value != null && timelineObjectHor.value != null) {
        timelineObject.value.updateTentativePeriod()
        timelineObjectHor.value.updateTentativePeriod()
        triggerRef(timelineObject)
        triggerRef(timelineObjectHor)
      }
      break;
    case 'pomodoroSetSession':
      pomodoroSessions.value[pomodoroData.session] = false
      pomodoroSessions.value[pomodoroMsg.value] = true;
      pomodoroData.session = pomodoroMsg.value
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
      //console.log('setup tentative period')
      if(timelineObject.value!=null){
        timelineObject.value.tentativePeriod=-1
      }
      if(timelineObjectHor.value!=null){
      timelineObjectHor.value.tentativePeriod=-1
      }
      let workingToday2 = await callApi("GET", 'user/spent_time/today')
      setTentativeIfNotSet()
      setWorkingToday(workingToday2)
      break
    case 'pomodoroEnd':
      document.getElementById('boxRing').play()
      pomodoroSessions.value[pomodoroData.session] = false
      pomodoroSessions.value[pomodoroMsg.value] = true;
      pomodoroData.session = pomodoroMsg.value
      setPomodoroDataValues(pomodoroMsg.pomodoroData)
      if(timelineObject.value!=null){
        timelineObject.value.tentativePeriod=-1
      }
      if(timelineObjectHor.value!=null){
        timelineObjectHor.value.tentativePeriod=-1
      }
      let workingToday = await callApi("GET", 'user/spent_time/today')
      setWorkingToday(workingToday)
      break;
  }

})


provide('clickPomodoroTimer', pomodoroOnTimerClick)

</script>
