<script setup>
defineOptions({
  name: 'TMTimeLine',
})

import {
  ref,
  reactive,
  defineProps,
  watch,
  inject,
  onBeforeMount,
  onMounted,
  onUnmounted,
  useTemplateRef,
  nextTick, triggerRef
} from 'vue'
import {callApi, store_configuration, Timeline} from 'src/common'


const props = defineProps({
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: true,
  },
  onlyBilled: {
    type: Boolean,
    required: true,
  },
  includeBreaks: {
    type: Boolean,
    required: true,
  },
  pomodoroData: {
    type: Object,
    required: false,
  },
  uiId: {
    type: String,
    required: true,
  }
})

// let pomodoroData = reactive({
//   timerActive: false,  // is pomodoro timer on/off
//   session: 0, // Pomodoro Session number 1,3,5,7 working sessions, 2,4,6,8 break sessions
//   start: 0, // session start timestamp
//   epoch: 0, // timestamp (on future) when the current session ends
//   remaining: 0, // for paused sessions, how many remaining seconds the current session has
//   task: {idTask: null, title: "Break"} , // current task, break sessions should have a falsy idTask
// //  previousTask: {idTask: null, title: "Break"},
// //  timerHandler: null, // settimeout handler
//   fullSessionDuration: 1500,
//   notifiedEndOfBreak: false,
//   breakExpiredATimeAgo: false,
// })

let canvasRefs = useTemplateRef('canvases')

let inited=false
let counterCurrentTimeIntoView = 0
let mountedFlag = false
let timelineObject = ref(null)
//let allProjects = null

async function getData(dataDateRange=null) {
  console.log('timeline')
  //allProjects = await callApi('GET', 'user/projects')
  let currentWeek
  let canvas = document.getElementById('canvasTimeline')
  // let meetings
  currentWeek = await callApi('GET', `user/spent_time/date_range/${props.startDate}/${props.endDate}`)
  timelineObject.value = new Timeline(
    currentWeek,
    canvas ? canvas.clientHeight : 2300,
    props.includeBreaks,
    props.onlyBilled
  )
  if (props.pomodoroData != null && props.pomodoroData.timerActive){
    timelineObject.value.startTentativePeriod(props.pomodoroData)
  }
  console.log('Done getting weekly data')
  inited=true
}

function handleCanvasClick(event){
  let c = document.getElementById(event.target.id)
  if (!c){
    c= getCanvasContainer(event.target)
  }
  const rect = c.getBoundingClientRect();
  const y = event.clientY - rect.top
  let theDay=c.id.substring(6)
  let data= timelineObject.value.workDayData
  let length = data.last - data.first
  let conversion = length / data.canvasHeight
  let value=  (conversion * y) + data.first
  console.log(value)
  console.log(timelineObject.value.workDayData)
  let theDayData= timelineObject.value.workDayData.weeklyData.get(theDay)
  if (isWithinTimeInterval(value, {start: data.first, end: theDayData.intervals_with_idle[0].start})){
    // Before the first activity
    console.log('Before first activity')
  }
  else if (isWithinTimeInterval(value, { start: theDayData.intervals_with_idle[theDayData.intervals_with_idle.length-1].end, end: data.last})){
    //After last activity
    console.log('After last activity')
  }
  else {
    let eventIndex=0
    for (let ev of theDayData.intervals_with_idle){
      console.log(`timespan: ${parseFloat(ev.start)} - ${parseFloat(ev.end)}`)
      if (isWithinTimeInterval(value, ev)){
        console.log('Event found!')
        console.log(ev.taskKey +": "+ ev.task)
        let data = toRawObject(timelineObject.value.events)
        console.log('no proxy data?')
        console.log(data)
        window.electronAPI.shareTimeline(data)
        window.electronAPI.openPage(`timeEntry`, `day=${theDay}&idTask=${ev.taskId}&index=${eventIndex}`)
        break
      }
      eventIndex++
    }
  }
}

onMounted(async ()=>{
  mountedFlag = false
  console.log('timeline component mounted')
  console.log(props.startDate)
  console.log(props.endDate)
  let config = await window.electronAPI.getConfiguration()
  if (config) {
    console.log('Loaded configuration')
    //console.log(config)
    if (!config){
      mountedFlag= true
      return
    }
    store_configuration(config)
  }
  if (!props.startDate || !props.endDate){
    console.log('No start date range')
    mountedFlag= true
    return
  }
  await getData()
  mountedFlag= true
  if (canvasRefs.value){
    //console.log(canvasRefs.value)
    for (let c of canvasRefs.value){
      c.addEventListener('dblclick', handleCanvasClick)
    }
  }
})

watch(props, async ()=>{
  console.log('watch props tmTimeline')
  if (!props.startDate || !props.endDate){
    console.log('No start date range')
    return
  }
  await getData()
})

// function setPomodoroDataValues(data){
//   pomodoroData.timerActive= data.timerActive
//   pomodoroData.session= data.session
//   pomodoroData.start= data.start
//   pomodoroData.epoch= data.epoch
//   pomodoroData.remaining= data.remaining
//   pomodoroData.fullSessionDuration= data.fullSessionDuration
//   pomodoroData.notifiedEndOfBreak= data.notifiedEndOfBreak
//   pomodoroData.breakExpiredATimeAgo= data.breakExpiredATimeAgo
//   pomodoroData.task= data.task
// }
//
// function setTentativeIfNotSet(){
//   if (timelineObject.value != null && timelineObject.value.tentativePeriod===-1) {
//     console.log('setting tentative period')
//     timelineObject.value.startTentativePeriod(pomodoroData)
//   }
// }

function checkCurrentTimeIntoView(){
  let idMain = `${props.uiId}_mainDiv`
  let elMain = document.getElementById(idMain)
  let mainSize = elMain.getBoundingClientRect();

  // lets search for a parent component with a smaller height (which surely will have a scroll bar)
  let scrollingParent = elMain.parentElement
  let scrollingSize = scrollingParent.getBoundingClientRect();
  while (scrollingSize.height >= mainSize.height){
    scrollingParent = scrollingParent.parentElement
    scrollingSize = scrollingParent.getBoundingClientRect();
  }
  // console.log('scrollingSize:')
  // console.log(scrollingSize)
  let id = `${props.uiId}_currentTime`
  let e = document.getElementById(id)
  let viewportOffset = e.getBoundingClientRect();
  // console.log('currentTime')
  // console.log(viewportOffset)
  if (viewportOffset.y > scrollingSize.y + scrollingSize.height && counterCurrentTimeIntoView <= 0){
    console.log('scrolling to currentTime')
     e.scrollIntoView()
    counterCurrentTimeIntoView=60
  }
  counterCurrentTimeIntoView--

  // let id = `${props.uiId}_mainDiv`
  // let div=document.getElementById(id)
  // if (div==null){
  //   console.log(`can't find ${id}`)
  // }
  // let scroll = div.parentElement.parentElement.parentElement.parentElement.parentElement.scrollTop
  // console.log('timeline scroll:')
  // console.log(scroll)
}

window.electronAPI.pomodoroTick(async(pomodoroMsg) => {
  // console.log('pomodoroMsg')
  // console.log(pomodoroMsg)
  switch (pomodoroMsg.type) {
    case 'updateTimer':
      //console.log('pomodoro tick')
      if (timelineObject.value != null) {
        if (timelineObject.value.tentativePeriod!=null){
          timelineObject.value.updateTentativePeriod()
        }
        triggerRef(timelineObject)
        checkCurrentTimeIntoView()
      }
      break;
    case 'pomodoroEnd':
      if(timelineObject.value!=null){
        timelineObject.value.tentativePeriod=null
      }
      await getData()
      break;
    case 'pomodoroTaskStart':
      if(timelineObject.value!=null){
        timelineObject.value.startTentativePeriod(pomodoroMsg.pomodoroData)
      }
      break;
    case 'pomodoroTaskChanged':
      if(timelineObject.value!=null){
        timelineObject.value.tentativePeriod=null
      }
      await getData()
      timelineObject.value.startTentativePeriod(pomodoroMsg.pomodoroData)
      break;
  }
})

// window.electronAPI.pomodoroTick(async(pomodoroMsg) => {
//   // console.log('Get message from pomodoro:')
//   // console.log(pomodoroMsg)
//   switch (pomodoroMsg.type) {
//     case 'pomodoroTaskStart':
//       console.log('pomodoroTaskStart')
//       //pomodoroSessions.value=[false, false, false, false, false, false, false, false]
//       setPomodoroDataValues(pomodoroMsg.pomodoroData)
//       setTentativeIfNotSet()
//       //pomodoroSessions.value[pomodoroData.session] = true;
//       break
//     case 'updateTimer':
//       //console.log('pomodoro tick')
//       setPomodoroDataValues(pomodoroMsg.value.pomodoroData)
//       if (timelineObject.value != null) {
//         timelineObject.value.updateTentativePeriod()
//         triggerRef(timelineObject)
//       }
//       break;
//     // case 'pomodoroSetSession':
//     //   pomodoroData.session = pomodoroMsg.value
//     //   setPomodoroDataValues(pomodoroMsg.pomodoroData)
//     //   //console.log('setup tentative period')
//     //   if(timelineObject.value!=null){
//     //     timelineObject.value.tentativePeriod=-1
//     //   }
//     //   await getData()
//     //   setTentativeIfNotSet()
//     //   break

// })

</script>

<template>
  <div class="flex-container" :id="`${props.uiId}_mainDiv`">
    <div class="flex-items" style="max-width: 70px">
      <div>Time</div>
      <div class="canvasContainer">
        <svg class="canvas" id="canvasTimeline">
          <line v-for="tick in timelineObject?.workDayData.workingHours" :key="tick.epoch" stroke-dasharray="4" class="timelineline" x1="0" x2="100%" :y1="timelineObject.tickYPosition(tick)"
                :y2="timelineObject.tickYPosition(tick)" />
          <text v-for="tick in timelineObject?.workDayData.workingHours" :key="tick.epoch" x="0" :y="timelineObject.tickYPosition(tick)"  class="timeLine">
            {{ tick.time }}
          </text>
        </svg>
      </div>
    </div>
    <div v-for="dow in timelineObject?.workDayData.daysToShow" :key="dow" class="flex-items">
      <div class="dowHeader">{{ timelineObject.workDayData.dayNameMap.get(dow) }}</div>
      <div class="canvasContainer">
        <svg class="canvas" ref="canvases" :id="`canvas${dow}`" >
          <line v-for="tick in timelineObject.workDayData.workingHours" :key="tick.epoch" stroke-dasharray="4" class="timelineline" x1="0" x2="100%" :y1="timelineObject.tickYPosition(tick)"
                :y2="timelineObject.tickYPosition(tick)" />
          <line v-if="dow == timelineObject.workDayData.todayKey" stroke="red"
                x1="0"  x2="100%" :y1="timelineObject.currentTime()" :y2="timelineObject.currentTime()"  />
          <g v-for="interval in timelineObject.workDayMeetings(dow)" :key="interval.id">
            <rect
              :x="timelineObject.getIntervalXi(interval)"
              :y="timelineObject.getIntervalY(interval)"
              :width="timelineObject.getIntervalWidthColumn(interval)"
              :fill="interval.color" fill-opacity="0.4"
              stroke="white" stroke-dasharray="5 5"
              :height="timelineObject.getIntervalHeight(interval)" />
            <text :x="timelineObject.getIntervalXi(interval)"
                  :y="timelineObject.getIntervalY(interval)+16"
                  v-if="timelineObject.isLongEnough4Text(interval)" class="taskTitle" >
              <tspan :x="timelineObject.getIntervalXi(interval, 1)" dy="0">{{ interval.summary }}</tspan>
              <tspan :x="timelineObject.getIntervalXi(interval, 1)" dy="1.2em">{{ interval.taskKey }}</tspan>
              <tspan :x="timelineObject.getIntervalXi(interval, 1)" dy="1.2em">{{ timelineObject.getTimeOfDay(interval.elapsed) }}</tspan>
            </text>
          </g>
          <g v-for="interval in timelineObject.workDayIntervals(dow)" :key="interval.id">
            <rect
              :x="timelineObject.getIntervalXi(interval)"
              :y="timelineObject.getIntervalY(interval)"
              :width="timelineObject.getIntervalWidthColumn(interval)"
              :fill="interval.color" :fill-opacity="interval?.tentative ? '70%': '100%'"
              stroke="white"
              :height="timelineObject.getIntervalHeight(interval)"
              :title="interval.task" />
            <text :x="timelineObject.getIntervalXi(interval)"
                  :y="timelineObject.getIntervalY(interval)+16"
                  v-if="timelineObject.isLongEnough4Text(interval)" class="taskTitle" >
              <tspan :x="timelineObject.getIntervalXi(interval, 1)" dy="0">{{ interval.task }}</tspan>
              <tspan :x="timelineObject.getIntervalXi(interval, 1)" dy="1.2em">{{ interval.taskKey }}</tspan>
              <tspan :x="timelineObject.getIntervalXi(interval, 1)" dy="1.2em">{{ timelineObject.getTimeOfDay(interval.elapsed) }}</tspan>
            </text>
          </g>

          <g v-if="timelineObject?.tentativePeriod != null" >
            <rect
              :x="timelineObject.getIntervalXi(timelineObject.tentativePeriod)"
              :y="timelineObject.getIntervalY(timelineObject.tentativePeriod)"
              :width="timelineObject.getIntervalWidthColumn(timelineObject.tentativePeriod)"
              :fill="timelineObject.tentativePeriod.color" :fill-opacity="timelineObject.tentativePeriod?.tentative ? '70%': '100%'"
              stroke="white"
              :height="timelineObject.getIntervalHeight(timelineObject.tentativePeriod)" />
            <text :x="timelineObject.getIntervalXi(timelineObject.tentativePeriod)"
                  :y="timelineObject.getIntervalY(timelineObject.tentativePeriod)+16"
                  v-if="timelineObject.isLongEnough4Text(timelineObject.tentativePeriod)" class="taskTitle" >
              <tspan :x="timelineObject.getIntervalXi(timelineObject.tentativePeriod, 1)" dy="0">{{ timelineObject.tentativePeriod.task }}</tspan>
              <tspan :x="timelineObject.getIntervalXi(timelineObject.tentativePeriod, 1)" dy="1.2em">{{ timelineObject.tentativePeriod.taskKey }}</tspan>
              <tspan :x="timelineObject.getIntervalXi(timelineObject.tentativePeriod, 1)" dy="1.2em">{{ timelineObject.getTimeOfDay(timelineObject.tentativePeriod.elapsed) }}</tspan>
            </text>
          </g>

          <line v-if="dow == timelineObject.workDayData.todayKey" stroke="red"
                x1="0"  x2="100%" :y1="timelineObject.currentTime()" :y2="timelineObject.currentTime()+1"
                :id="`${props.uiId}_currentTime`"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  margin: 4px;
  height: 2350px;
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
  max-height:20px;
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
