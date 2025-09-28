<script setup>
import {VueShowdown} from "vue-showdown";
import { ref, defineProps, defineEmits, watch, computed, onMounted } from 'vue'
import {
  projectMap,
} from 'src/commonObjects'
import {callApi} from "src/common";

defineOptions({
  name: 'tm-task-description',
});

const events = defineEmits([
  'task-updated', "open-task"
])


const props = defineProps(['task'])

const newNotes = ref('')
const showNotesEditor = ref(false)
const localNotes = ref('')


const project = computed(() => {
  if (props.task==null){
    return ""
  }
  //console.log(`get project ${props.task.idProject}`)
  let prj = projectMap.get(props.task.idProject)
  return prj
});

const getTaskNotes = computed(()=> {
  if (localNotes.value){
    return props.task.notes +'\n'+ localNotes.value
  }
  else {
    return props.task.notes
  }
})

onMounted(async ()=>{
  console.log('mounted tmTaskDescription')
  if (!props.task || !props.task.notes){
    return
  }
  console.log(props.task)
  let lines = props.task.notes.split("\n");
  let result = ''
  let reInternalNote = /~\[.*?]\((.+\.md)\)/
  for (let line of lines) {
    let match = reInternalNote.exec(line)
    if (match) {
      let xtra = await window.electronAPI.getLocalNote(props.task.notesDirectory+match[1])
      if (xtra){
        result += xtra + '\n'
      }
    }
  }
  localNotes.value = result
})


function getNormalizedTime(time){
  let result = ''
  let re_time = /(\d+) days (\d+):(\d+):(\d+)/
  let match = re_time.exec(time)
  let days = Number(match[1])
  let hours = Number(match[2])
  let minutes = Number(match[3])
  let seconds = Number(match[4])
  if (hours > 24){
    let days2= Math.floor(hours / 24)
    hours -= days2*24
    days += days2
  }
  if (days > 0){
    result = `${days}d, `
  }
  if (hours > 0) {
    result += `${hours}h, `
  }
  result += `${minutes}m, ${seconds}s`
  return result
}

const timeSpentToday = computed(()=>{
  // "timeSpent": "0 days 04:10:29",
  // "timeSpentToday": "0 days 04:10:29",
  let result=''
  if (props.task.timeSpentToday){
    result = getNormalizedTime(props.task.timeSpentToday)
  }
  return result
})
const timeSpent = computed(()=>{
  let result=''
  if (props.task.timeSpent){
    result = getNormalizedTime(props.task.timeSpent)
  }
  return result
})

const stateAndPriority = computed(() => {
  return `State: \` ${props.task.state} \`
  Priority: ![alt-priority](${props.task.priority}.svg =24x24) ${props.task.priority}`
})

const pendingSubtasks = computed(() => {
  return props.task.subTasks.filter(st => !st.endState)
})

const pendingTasks = computed(() => {
  console.log(props.task)
  return props.task.subTasks.filter(st => !st.endState)
})

const taskChecklists = computed(()=>{
  let result = []
  if (props.task && props.task.xtraData?.checkLists){
    for (let cl of props.task.xtraData.checkLists){
      result.push(cl)
    }
  }
  return result
})

const selectedDay = ref("")

function getCalendarForTask(aDate){
  let events= props.task.daysWorked
  if (props.task.dueDate){
    //console.log("due")
    //console.log(props.task.dueDate.substring(0,10))
    events.push(props.task.dueDate.substring(0,10).replaceAll('-','/'))
  }
  if (props.task.estimatedStartDate){
    //console.log("start")
    //console.log(props.task.estimatedStartDate.substring(0,10))
    events.push(props.task.estimatedStartDate.substring(0,10).replaceAll('-','/'))
  }
  return events.includes(aDate)
}

function getTaskColor(aDate){
  let events= props.task.daysWorked
  if (props.task.dueDate && props.task.dueDate.substring(0,10).replaceAll('-','/')===aDate){
    //console.log("due")
    //console.log(props.task.dueDate)
    return "red"
  }
  if (props.task.estimatedStartDate && props.task.estimatedStartDate.substring(0,10).replaceAll('-','/')===aDate){
    //console.log("start")
    //console.log(props.task.estimatedStartDate)
    return "green"
  }
  return "blue"
}

async function calendarSetStartDate(){
  let data = {
    idBoard: props.task.idBoard,
    estimatedStartDate: selectedDay.value.replaceAll("/", "-")+ " 12:00:00"
  }
  await callApi("POST", `user/tasks/${props.task.idTask}`, data)
}

async function calendarSetDueDate(){
  let data = {
    idBoard: props.task.idBoard,
    dueDate: selectedDay.value.replaceAll("/", "-")+ " 12:00:00"
  }
  await callApi("POST", `user/tasks/${props.task.idTask}`, data)
}

function editNotes(){
  showNotesEditor.value = true
  newNotes.value = props.task.notes ? props.task.notes : ''
}

async function saveNotes(){
  let data = {
    idBoard: props.task.idBoard,
    notes: newNotes.value,
  }
  await callApi("POST", `user/tasks/${props.task.idTask}`, data)
  showNotesEditor.value = false
  console.log('Notes have been saved!')
}

watch(
  () => taskChecklists,
  async (newVal, oldVal) => {
    if (newVal==null || props.task==null){
      return
    }
    let data = {
      idBoard: props.task.idBoard,
      xtraData: props.task.xtraData,
    }
    await callApi("POST", `user/tasks/${props.task.idTask}`, data)
  },
  {deep: true}
)

function getJiraLink(selfLink){
  const url = new URL(selfLink);
  const domain = url.origin;
  return `${domain}/browse/${props.task.key}`;
}


</script>

<template>
<div v-if="task!=null" class="summary">
  <slot name="title">
    <h3>
      <img class="taskIcon" :src="`${task.taskType}.png`">&nbsp;
      <span v-if="!task.jiraSelfLink"><strong>{{ task.key }}</strong></span>
      <span v-if="task.jiraSelfLink"><strong><a class="externalLink" :href="getJiraLink(task.jiraSelfLink)">{{ task.key }}</a></strong></span>
      | {{ project.name }}
      <p style="margin-top: 6px;">
      {{ task.title }}{{ task.idEpic && !task.idTask? task.epic:"" }}
      </p>
    </h3>
  </slot>
  <div class="responsive">
    <div class="r-column">
      <VueShowdown :markdown="stateAndPriority" />
      <slot name="actions"></slot>
      <div v-if="task?.description">
        <h4>Description</h4>
        <VueShowdown :markdown="task.description" />
      </div>
    </div>
    <div class="r-column">
      <div v-if="taskChecklists.length>0">
        <div v-for="checklist in taskChecklists" :key="checklist.id">
          <div class="checklist">
            <h4>{{ checklist.name }}</h4>
            <q-option-group v-model="checklist.completed" :options="checklist.items" type="checkbox" />
          </div>
        </div>
      </div>
      <h4>Notes <q-icon size="xs" name="edit" class="cursor-pointer" @click="editNotes" /></h4>
      <div v-if="task?.notes">
        <VueShowdown :markdown="getTaskNotes" v-if="!showNotesEditor" />
      </div>
      <div v-if="showNotesEditor" class="notesEditor">
        <q-input autofocus v-model="newNotes" type="textarea" autogrow>
        </q-input>
        <q-btn icon="save" size="xs" @click="async ()=> {await saveNotes(); $emit('task-updated')}"></q-btn>
      </div>
    </div>
    <div v-if="task.idTask" class="calendarDiv r-column">
      <h4>Activity</h4>
      <p v-if="timeSpentToday">
      <b>Time Spent Today:</b> {{ timeSpentToday }}<br>
      </p>
      <p v-if="timeSpent">
      <b>Total Time Spent:</b> {{ timeSpent }}<br>
      </p>

      <q-date v-model="selectedDay" today-btn :events="getCalendarForTask" :event-color="getTaskColor" />
      <br>
      <q-btn label="Set Start Date" :disable="selectedDay==='' || !selectedTask" @click="calendarSetStartDate" />
      <q-btn label="Set Due Date" :disable="selectedDay==='' || !selectedTask" @click="calendarSetDueDate" />
    </div>
  </div>
  <slot name="subtasks">
    <div v-if="task.isRoot && task.hasSubTasks && pendingSubtasks.length > 0">
      <h4>Pending SubTasks</h4>
      <q-list bordered>
        <q-item v-for="subtask in pendingSubtasks" @click="$emit('openTask', subtask)" :key="subtask.idTask" :clickable="!subtask.isNew" :v-ripple="!subtask.isNew">
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
    </div>
    <div v-if="task.idEpic && task.idTask==null && pendingTasks.length > 0">
      <h4>Pending Tasks</h4>
      <q-list bordered>
        <q-item v-for="subtask in pendingTasks" @click="$emit('openTask', subtask)" :key="subtask.idTask" :clickable="!subtask.isNew" :v-ripple="!subtask.isNew">
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
    </div>

  </slot>
  <slot name="footer"></slot>
</div>
</template>

<style scoped>

div.r-column{
  //padding: 16px;
  //border: #f39c12 none 1px;
  flex-grow: 1;
}

div.responsive{
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

@media (max-width: 400px) {
  div.responsive{
    flex-direction: column;
  }

  div.r-column {
    padding: 0;
  }

}

div.calendarDiv{
  max-width: 330px;
}

.summary h1{
  font-size: 16px;
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

.summary code{
  background-color: #d0d0d0;
}

div.notesEditor{
  margin-top: 2px;
  padding: 2px;
  border: #707070 1px solid;
}



</style>
