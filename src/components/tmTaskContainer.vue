<script setup>
import TMKanban from "components/tmKanban.vue";
import {ref, defineProps, inject} from 'vue'

defineOptions({
  name: 'TMTaskContainer',
})


const props = defineProps({
  states: {
    type: Array,
    required: true,
  },
  task: {
    type: Object,
    required: true,
  },
  tasks: {
    type: Array,
    required: true,
  },
  idBoard: {
    type: String,
    required: true,
  }
})

const events = defineEmits(['maximize', 'toggleDetail', 'select', 'goToParent'])
const globalSelectedTask = inject('globalSelectedTask')

let showDetails = ref(false)

async function toggleSuperTaskInfo(){
  showDetails.value = !showDetails.value
  //showTask(task)
}

function editTask(){
  props.task.editTask()
}

function superTaskDetail(){
  let result = ''
  if (props.task.description){
    result += `## Description:\n${props.task.description}\n`
  }
  if (props.task.notes){
    result += `## Notes:\n${props.task.notes}\n`
  }
  return result
}

function getClasses(){
  let result = 'superTask'
  if (globalSelectedTask.value!=null && globalSelectedTask.value.idTask===props.task.idTask){
    result += ' selectedTask'
  }
  return result
}

</script>

<template>
<div :class="getClasses()" :style="`border: solid 2px ${task.color}`">
  <img :src="`${task.taskType}.png`" style="width:16px; height: 16px; vertical-align: middle;"/> &nbsp;
  <button @click="$emit('go-to-parent', task)" title="Go to Parent Task"
          class="buttonTaskAction2" >
    <span class="material-icons-outlined material-icons" >zoom_out</span>
  </button>
  <button @click="$emit('toggle-detail', task)" :title="task.expanded ? 'Hide Subtasks':'Show Subtasks'"
          class="buttonTaskAction2" >
    <span class="material-icons-outlined material-icons" v-if="!task.expanded">expand_more</span>
    <span class="material-icons-outlined material-icons" v-if="task.expanded">expand_less</span>
  </button>
  &nbsp;
  <b>{{ task.key }}</b> - {{ task.title }} <span class="state">{{ task.state }}</span>
  &nbsp;
  <button @click="$emit('select', task);toggleSuperTaskInfo()" title="Show description" class="buttonTaskAction2" >
    <span class="material-icons-outlined material-icons">info</span>
  </button>
  <button @click="editTask" type="button" title="Edit task" class="buttonTaskAction2" >
    <span class="material-icons-outlined material-icons">edit</span>
  </button>
  <div v-if="showDetails" class="summary">
    <VueShowdown :markdown="superTaskDetail()" flavor="github" :options="{ emoji:true, headerLevelStart:3,
                tasklists: true, openLinksInNewWindow: true, moreStyling: true }" />
  </div>

  <TMKanban :parent="task" :tasks="tasks" :states="states" :id-board="idBoard"
            @select="(subTask)=>{$emit('select', subTask)}"
            @maximize="(t)=>$emit('maximize', t)" :idPrefix="`task_${task.idTask}`"
  />
</div>
</template>

