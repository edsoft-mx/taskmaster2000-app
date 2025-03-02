<script setup >
defineOptions({
  name: 'tm-weekly-timeline'
});

import {ref, reactive, defineProps, watch, inject, onBeforeMount, onMounted} from 'vue'
import { callApi, Timeline } from 'src/common'
import Chart from 'chart.js/auto';
//import { Bar } from 'vue-chartjs'
//import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

//ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)


// let workDayData = reactive({
//   length: 0,
//   first: 0,
//   last: 0,
//   cw: 500,
//   canvasHeight: 500,
//   conversion: 0,
//   weeklyData: new Map(),
//   dayNameMap: new Map(),
//   //dayNameReverseMap: new Map(),
//   daysToShow: [],
//   workingHours: [],
//   projects: {},
//   projectTotals: {}
// })

let timelineObject = ref(null)
let onlyBilled = ref(false)
let includeBreaks = ref(true)
let chartObject=null

let chart1Data = {
  labels: [],
  datasets: []
}

let chart1Options = {
  responsive: true,
  animation: false,
  transitions: {
    active: {
      animation: {
        duration: 0
      }
    },
    resize: {
      animation: {
        duration: 0
      }
    }
  },
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
      beginAtZero: true,
      min: 0,
      //max: 12,
      ticks: {
        callback: function(value, index, ticks){
          let hours = Math.trunc(value / 60)
          let minutes = Math.trunc((value-hours*60) % 60)
          let title= hours>0 ? `${hours}h`: ''
          if(minutes!==0){
            if(title!==''){
              title+=', '
            }
            title+=`${minutes}m`
          }
          return title
        }
      }
    }
  },
  plugins: {
    tooltip:{
      callbacks: {
        label: function(context){
          let value = context.raw
          let hours = Math.trunc(value / 60)
          let minutes = Math.trunc((value-hours*60) % 60)
          let title= hours>0 ? `${hours}h`: ''
          if(minutes!==0){
            if(title!==''){
              title+=', '
            }
            title+=`${minutes}m`
          }
          return title
        }
      }
    }
  }
}

async function createChart(){
  const ctx = document.getElementById('chart1')
  if (ctx==null){
    console.log("Sorry, can't create chart b/c element does not exists")
    return
  }
  chartObject = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chart1Data.labels,
      datasets: chart1Data.datasets,
    },
    options: chart1Options
  })
  // }
  // else{
  //   chart1.data.datasets= chart1Data.datasets
  // }
  chartObject.options.animation = false; // disables all animations
  //chart.options.animations.colors = false; // disables animation defined by the collection of 'colors' properties
  //chart.options.animations.x = false; // disables animation defined by the 'x' property
  chartObject.options.transitions.active.animation.duration = 0; // disables the animation for 'active' mode
  chartObject.options.transitions.resize.animation.duration = 0; // disables the animation for 'active' mode
}

async function getData() {
  let canvas = document.getElementById('canvasTimeline')
  console.log('timeline')
  if (chartObject!=null){
    chartObject.destroy()
  }
  let currentWeek = await callApi('GET', 'user/spent_time/week')
  timelineObject.value = new Timeline(
    currentWeek,
    canvas ? canvas.clientHeight : 2300,
    includeBreaks.value,
    onlyBilled.value
    )

  chart1Data.datasets = timelineObject.value.chartData.datasets
  chart1Data.labels = timelineObject.value.chartData.labels

  await createChart()
  console.log('Done getting weekly data')
  window.document.title = 'Timeline (last 7 days)'
}

watch(
  () => includeBreaks.value,
  async (newVal, oldVal) => {
    if (chartObject==null){
      console.log('skipping reload')
      return
    }
    chart1Data.datasets[0].hidden = newVal
    console.log(newVal)
    await getData()
  }
)

watch(
  () => onlyBilled.value,
  async (newVal, oldVal) => {
    if (chartObject==null){
      console.log('skipping reload')
      return
    }
    await getData()
  }
)

onMounted(async ()=> {
  await getData()
})

</script>

<template>
  <q-toggle v-model="includeBreaks" label="Include break periods" />
  <q-toggle v-model="onlyBilled" label="Only billed projects" />
  <div style="width: 100%;">
    <!--Bar id="chart1" :data="chart1Data" :options="chart1Options" /-->
    <canvas id="chart1"></canvas>
  </div>
  <div class="flex-container">
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

      <div class="canvasContainer"><svg class="canvas">
        <line v-for="tick in timelineObject.workDayData.workingHours" :key="tick.epoch" stroke-dasharray="4" class="timelineline" x1="0" x2="100%" :y1="timelineObject.tickYPosition(tick)"
              :y2="timelineObject.tickYPosition(tick)" />
        <line v-if="dow == timelineObject.workDayData.todayKey" stroke="red"
              x1="0"  x2="100%" :y1="timelineObject.currentTime()" :y2="timelineObject.currentTime()"  />
        <g v-for="interval in timelineObject.workDayIntervals(dow)" :key="interval.id">
          <rect
              x="0"
              :y="timelineObject.getIntervalY(interval)"
              width="100%"
              :fill="timelineObject.workDayData.projects[interval.project].color"
              stroke="white"
              :height="timelineObject.getIntervalHeight(interval)"
              :title="interval.task" />
          <text x="2" :y="timelineObject.getIntervalY(interval)+16" v-if="timelineObject.isLongEnough4Text(interval)" class="taskTitle" >
            <tspan x="2" dy="0">{{ interval.task }}</tspan>
            <tspan x="2" dy="1.2em">{{ interval.taskKey }}</tspan>
            <tspan x="2" dy="1.2em">{{ timelineObject.getTimeOfDay(interval.elapsed) }}</tspan>
          </text>
        </g>
      </svg></div>
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
  width: 98%;
  border: solid 1px black;
  min-height: 500px;
  margin: 16px;
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
