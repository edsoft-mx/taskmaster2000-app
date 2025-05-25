<script setup>
defineOptions({
  name: 'tm-time-entry'
});
import { ref, reactive, defineProps, watch, inject, computed, onMounted } from 'vue'
import { callApi } from 'src/common'

// const props = defineProps({
//   minTime: Number,
//   maxTime: Number,
//   startTime: Number,
//   endTime: Number,
//   idTask: Number,
// })


//const timelineObject = ref(null)
const task = ref("")
const tasks = ref([])
const selectedTask = ref(null)
//const eventIndex = ref(-1)
//const day = ref("")
const timeStart = ref("")
const timeEnd = ref("")
const timespan = ref({
  min: 0,
  max: 100,
})
const timespanLimits = ref({
  min: 0,
  max: 100,
})
let flag1= false
let flag2= false
const colorStart = ref("primary")
const colorEnd = ref("primary")
const formOp = ref("")
const formInterval = ref(0)

function getParameter(parameterName){
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(parameterName);
}

function timestampToTime(timestamp){
  let ts = Number(timestamp)
  let hours = Math.floor(ts / 3600)
  let hours_secs = hours * 3600
  let secs_remaining = ts - hours_secs
  let seconds = Math.floor(secs_remaining / 60)
  let result = `${hours}`.padStart(2, '0') + ':' + `${seconds}`.padStart(2, '0')
  //console.log(result)
  return result
}

function isBreak(interval){
  //console.log('is break?')
  //console.log(interval)
  return interval.project === 'Break' && interval.task === 'Break'
}

async function getData(){
  let timelineObject = await window.electronAPI.getSharedTimeline()
  let idTask=getParameter("idTask")
  let eventIndex=Number(getParameter("index"))
  let day=getParameter("day")
  let intervals_with_idle = timelineObject.week_intervals[day].intervals_with_idle
  console.log("intervals_with_idle")
  console.log(intervals_with_idle)
  if (!idTask || idTask === 'null'){
    let recentTasks = await callApi('GET', 'user/tasks/recent/')
    let rt = []
    for (let task of recentTasks){
      rt.push({
        label: `${task.key}: ${task.title} (${task.projectName})`,
        value: task.idTask,
      })
    }
    tasks.value = rt
    selectedTask.value= rt[0]
    console.log(tasks.value)
    formOp.value='add'
  }
  else {
    task.value = await callApi('GET', `user/tasks/${idTask}`)
    console.log(task.value)
    formOp.value='edit'
  }
  timeStart.value = timestampToTime(intervals_with_idle[eventIndex].start)
  timeEnd.value = timestampToTime(intervals_with_idle[eventIndex].end)
  timespan.value.min = Math.floor(intervals_with_idle[eventIndex].start)
  timespan.value.max = Math.floor(intervals_with_idle[eventIndex].end)
  if (isBreak(intervals_with_idle[eventIndex])){
    timespanLimits.value.min= Math.floor(intervals_with_idle[eventIndex].start)
    timespanLimits.value.max= Math.floor(intervals_with_idle[eventIndex].end)
  }
  if (eventIndex > 0){
    if (isBreak(intervals_with_idle[eventIndex-1])){
      timespanLimits.value.min= Math.floor(intervals_with_idle[eventIndex-1].start)
    }
    else {
      timespanLimits.value.min= Math.floor(intervals_with_idle[eventIndex].start)
    }
  }
  if (eventIndex < intervals_with_idle.length-1){
    if (isBreak(intervals_with_idle[eventIndex+1])){
      timespanLimits.value.max= Math.floor(intervals_with_idle[eventIndex+1].end)
    }
    else {
      timespanLimits.value.max= Math.floor(intervals_with_idle[eventIndex].end)
    }
  }
  else if (eventIndex === intervals_with_idle.length-1){
      timespanLimits.value.max= 23*3600
  }
  formInterval.value= intervals_with_idle[eventIndex].idInterval

  let title = !task.value ? 'New Time Entry' : `Edit Time Entry for ${task.value.key}`
  document.title = title
  console.log(timelineObject)
}

async function submit(){
  if (formOp.value==='edit'){
    let data = {
      day: getParameter("day"),
      start: timespan.value.min,
      end: timespan.value.max
    }
    await callApi('POST', `user/spent_time/entries/${formInterval.value}`, data)
    window.close()
  }
  else if (formOp.value==='add'){
    let data = {
      day: getParameter("day"),
      start: timespan.value.min,
      end: timespan.value.max,
      idTask: selectedTask.value.value
    }
    await callApi('POST', `user/spent_time/entries/`, data)
    window.close()
  }
}

async function deleteEntry(){
  if (formOp.value==='edit') {
    await callApi('DELETE', `user/spent_time/entries/${formInterval.value}`)
    window.close()
  }
}

function cancelOp(){
  window.close()
}

let invalidData = computed(() => {
  let validationRange1 = timespan.value.min >= timespanLimits.value.min && timespan.value.min <= timespanLimits.value.max
  let validationRange2 = timespan.value.max >= timespanLimits.value.min && timespan.value.min <= timespanLimits.value.max
  let parts= timeStart.value.split(":")
  let hour= Number(parts[0])
  let minute= Number(parts[1])
  let ts=hour*3600 + minute*60
  let validationRange3 = ts >= timespanLimits.value.min && ts <= timespanLimits.value.max
  parts= timeEnd.value.split(":")
  hour= Number(parts[0])
  minute= Number(parts[1])
  ts=hour*3600 + minute*60
  let validationRange4 = ts >= timespanLimits.value.min && ts <= timespanLimits.value.max
  //console.log(validationRange1, validationRange2, validationRange3, validationRange4 ,validationRange1 && validationRange2 && validationRange3 && validationRange4)
  return !(validationRange1 && validationRange2 && validationRange3 && validationRange4)
})

watch(
  timespan,
(newVal, oldVal)=>{
  //console.log(newVal)
  if (flag2){
    return
  }
  flag1= true
  timeStart.value= timestampToTime(newVal.min)
  timeEnd.value= timestampToTime(newVal.max)
  flag1= false
}, { immediate: false })

watch (
  timeStart,
  (newVal, oldVal)=>{
    if (flag1){
      return
    }
    flag2= true
    let parts= newVal.split(":")
    let hour= Number(parts[0])
    let minute= Number(parts[1])
    let newMin=hour*3600 + minute*60
    if (newMin >= timespanLimits.value.min && newMin <= timespanLimits.value.max){
      timespan.value = {min: newMin, max: timespan.value.max}
      colorStart.value= "primary"
    }
    else {
      colorStart.value= "red"
      //console.log("bad value")
    }
    //console.log('new starting time', timespan.value.min)
    flag2= false
  }, { immediate: false }
)

watch (
  timeEnd,
  (newVal, oldVal)=>{
    if (flag1){
      return
    }
    flag2= true
    let parts= newVal.split(":")
    let hour= Number(parts[0])
    let minute= Number(parts[1])
    let newMax=hour*3600 + minute*60
    if (newMax >= timespanLimits.value.min && newMax <= timespanLimits.value.max) {
      timespan.value = {max: newMax, min: timespan.value.min}
      colorEnd.value= "primary"
    }
    else{
      colorEnd.value= "red"
    }
    //console.log('new starting time', timespan.value.max)
    flag2= false
  }, { immediate: false }
)

onMounted(async ()=> {
  await getData()
})

</script>

<template>
  <q-card flat>
    <q-card-section>
      <div id="divFormEvent" v-if="task" class="form">
        <q-input v-model="task.projectName" label="Project" readonly></q-input>
        <q-input v-model="task.key" label="Task Key" readonly></q-input>
        <q-input v-model="task.title" label="Task Title" readonly></q-input>
      </div>
      <div id="divFormNewEvent" v-if="!task">
        <q-select :options="tasks" v-model="selectedTask" ></q-select>
      </div>
      <div class="form">
        <q-range v-model="timespan" :min="timespanLimits.min" :max="timespanLimits.max"  />
        <div style="display: flex">
          <div>
            Start<br>
            <q-time v-model="timeStart" now-btn format24h :color="colorStart" />

          </div>
          <div class="cell">
            End<br>
            <q-time v-model="timeEnd" now-btn format24h :color="colorEnd" />
          </div>
        </div>
      </div>
    </q-card-section>
    <q-card-actions align="right">
      <q-btn type="button" @click="submit" color="primary" :disable="invalidData" >Submit</q-btn>
      <q-btn type="button" @click="deleteEntry" :disable="formOp!=='edit'" >Delete</q-btn>
      <q-btn type="button" @click="cancelOp" >Cancel</q-btn>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

div.form{
  margin: 16px;
}

div.cell{
  margin-left: 16px;
}

</style>
