<script setup>
defineOptions({
  name: 'TMTimeLineH',
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
let mountedFlag = false
let timelineObject = ref(null)
//let allProjects = null


async function getData(dataDateRange=null) {
  console.log('timeline')
  //allProjects = await callApi('GET', 'user/projects')
  let currentWeek
  // let meetings
  currentWeek = await callApi('GET', `user/spent_time/date_range/${props.startDate}/${props.endDate}`)
  let canvas = document.getElementById('canvasWorkDay')
  let canvasWidth = canvas.clientWidth //? canvas.clientWidth : 1024
  timelineObject.value = new Timeline(
    currentWeek,
    0,
    props.includeBreaks,
    props.onlyBilled,
    false,
    canvasWidth,
  )
  if (props.pomodoroData != null && props.pomodoroData.timerActive){
    timelineObject.value.startTentativePeriod(props.pomodoroData, true)
  }
  console.log('Done getting timelineH data')
  console.log(timelineObject.value)
  inited=true
}

onMounted(async ()=>{
  mountedFlag = false
  console.log('timelineH component mounted')
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
  console.log('watch props tmTimelineH')
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

window.electronAPI.pomodoroTick(async(pomodoroMsg) => {
  // console.log('pomodoroMsg')
  // console.log(pomodoroMsg)
  switch (pomodoroMsg.type) {
    case 'updateTimer':
      //console.log('pomodoro tick')
      if (timelineObject.value != null && timelineObject.value.tentativePeriod!=null) {
        timelineObject.value.updateTentativePeriod()
        triggerRef(timelineObject)
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
//     case 'pomodoroEnd':
//
//       //pomodoroSessions.value[pomodoroData.session] = false
//       //pomodoroSessions.value[pomodoroMsg.value] = true;
//       pomodoroData.session = pomodoroMsg.value
//       setPomodoroDataValues(pomodoroMsg.pomodoroData)
//       if(timelineObject.value!=null){
//         timelineObject.value.tentativePeriod=-1
//       }
//       await getData()
//       break;
//     case 'pomodoroTaskChanged':
//       pomodoroData.session = pomodoroMsg.value
//       setPomodoroDataValues(pomodoroMsg.pomodoroData)
//       if(timelineObject.value!=null){
//         timelineObject.value.tentativePeriod=-1
//       }
//       await getData()
//       break;
//   }
// })

</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="32px" class="timescale" id="canvasWorkDay" >
    <defs>
      <linearGradient id="horzGrad1">
        <stop offset="0%" stop-opacity="85" />
        <stop offset="50%" stop-opacity="0" />
        <stop offset="100%" stop-opacity="85" />
      </linearGradient>
    </defs>
    <rect v-for="interval in timelineObject?.workDayIntervals(timelineObject.workDayData.todayKey)"
          :x="timelineObject.getIntervalX(interval)" :key="interval.id"
          y="0" height="100%" :fill="interval.color" stroke="white"
          :fill-opacity="interval?.tentative ? '70%' : '100%'"
          :width="timelineObject.getIntervalWidth(interval)" />
    <rect v-if="timelineObject?.tentativePeriod != null"
          :x="timelineObject.getIntervalX(timelineObject.tentativePeriod)"
          y="0" height="100%" :fill="timelineObject.tentativePeriod.color" stroke="white"
          :fill-opacity="timelineObject.tentativePeriod?.tentative ? '70%' : '100%'"
          :width="timelineObject.getIntervalWidth(timelineObject.tentativePeriod)" />
  </svg>
</template>

<style scoped>

</style>
