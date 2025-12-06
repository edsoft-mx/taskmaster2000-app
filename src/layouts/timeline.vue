<script setup >
import TMTimeLine from "components/tmTimeline.vue";

defineOptions({
  name: 'tm-weekly-timeline'
});

import {ref, reactive, defineProps, watch, inject, onBeforeMount, onMounted, onUnmounted, useTemplateRef} from 'vue'
import {callApi, store_configuration, Timeline} from 'src/common'
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

//ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)
Chart.register(ChartDataLabels);

let inited=false
let timelineObject = ref(null)
let onlyBilled = ref(false)
let includeBreaks = ref(false)
let chartObject=null
let dateRange = ref({from: "", to: ""})

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
    },
    datalabels: {
      anchor: 'end', // Position the label at the end of the bar
      align: 'top', // Align the label to the top
      formatter: (value, context) => {
        if (context.datasetIndex === context.chart.data.datasets.length - 1) {
          // Calculate the sum only for the last dataset in the stack
          let sum = 0;
          context.chart.data.datasets.forEach((dataset) => {
            if (dataset.stack === context.dataset.stack) {
              sum += dataset.data[context.dataIndex];
            }
          });
          let hours = Math.trunc(sum / 60)
          let minutes = Math.trunc((sum-hours*60) % 60)
          let title= hours>0 ? `${hours}h`: ''
          if(minutes!==0){
            if(title!==''){
              title+=', '
            }
            title+=`${minutes}m`
          }
          return title
        } else {
          return ''; // Don't show labels for other datasets in the stack
        }
      },
      color: '#a0a0a0', // Customize label color
      font: {
        weight: 'bold', // Customize label font
      }
    },
    stacked: true,
  },
  stacked: true,
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

function dateRangeDescr(){
  return `${dateRange.value.from} - ${dateRange.value.to}`
}

function formatDate(aDate){
  let y= aDate.getFullYear()
  let m= `${aDate.getMonth()+1}`.padStart(2,"0")
  let d= aDate.getDate()
  return `${y}/${m}/${d}`
}

async function getData(dataDateRange=null) {
  // let canvas = document.getElementById('canvasTimeline')
  console.log('timeline')
  if (chartObject!=null){
    chartObject.destroy()
  }
  let currentWeek
  // let meetings
  if (dataDateRange==null){
    let today = new Date();
    let sevenDaysAgo = new Date(today); // Create a copy of today's date
    sevenDaysAgo.setDate(today.getDate() - 7); // Subtract 7 days
    dateRange.value = {from: formatDate(sevenDaysAgo), to: formatDate(today)}
    currentWeek = await callApi('GET', 'user/spent_time/week')
    //meetings = await callApi('GET', `user/spent_time/ical/${dateRange.value.from}/${dateRange.value.to}`)
    console.log('Set date range')
    console.log(`${dateRange.value.from} - ${dateRange.value.to}`)
  }
  else {
    currentWeek = await callApi('GET', `user/spent_time/date_range/${dataDateRange.from}/${dataDateRange.to}`)
    //meetings = await callApi('GET', `user/spent_time/ical/${dataDateRange.from}/${dataDateRange.to}`)
  }
  timelineObject.value = new Timeline(
    currentWeek,
    2300,
    includeBreaks.value,
    onlyBilled.value
    )

  chart1Data.datasets = timelineObject.value.chartData.datasets
  chart1Data.labels = timelineObject.value.chartData.labels

  await createChart()
  console.log('Done getting weekly data')
  window.document.title = 'Timeline (last 7 days)'
  inited=true
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
    await getData(dateRange.value)
  }
)

watch(
  () => onlyBilled.value,
  async (newVal, oldVal) => {
    if (chartObject==null){
      console.log('skipping reload')
      return
    }
    await getData(dateRange.value)
  }
)

watch(
  () => dateRange.value,
  async(newVal, oldVal) =>{
    if (!inited){
      return
    }
    await getData(dateRange.value)
  }
)

onMounted(async ()=>{
  console.log('timeline window . mounted')
  let config = await window.electronAPI.getConfiguration()
  if (config) {
    //console.log('Loaded configuration')
    //console.log(config)
    if (!config){
      return
    }
    store_configuration(config)
  }
  await getData()

})

window.electronAPI.onRefreshTimeline(async() => {
  if (chartObject.destroy()) {
    chartObject.destroy()
  }
  await getData();
})

</script>

<template>
  <q-btn-dropdown :label="dateRangeDescr()" >
    <q-date v-model="dateRange" range />
  </q-btn-dropdown>
  <q-toggle v-model="includeBreaks" label="Include break periods" />
  <q-toggle v-model="onlyBilled" label="Only billed projects" />
  <div style="width: 100%;">
    <!--Bar id="chart1" :data="chart1Data" :options="chart1Options" /-->
    <canvas id="chart1"></canvas>
  </div>
  <TMTimeLine :include-breaks="includeBreaks" :only-billed="onlyBilled" uiId="tmMain"
              :end-date="dateRange.to" :start-date="dateRange.from">
  </TMTimeLine>

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
