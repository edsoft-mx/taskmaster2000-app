<script setup>

defineOptions({
  name: 'TMTask',
})

import {
  allTaskMap
} from 'src/commonObjects'


const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const events = defineEmits([
  'toggleDetail',
  'select',
])


function styleForTask(){
  return `border: solid 3px ${props.task.color}; padding-bottom: 32px;` // ${shadow}; `
}

function getTaskMouseOutStyle(){
  return "this.style.borderStyle='solid'"
}

async function timerClick(){
  let theTask = allTaskMap.get(props.task.idTask);
  await theTask.timerClick()
  //uiStore.setSelectedTask(props.task.idTask)
}

function editTask(){
  let theTask = allTaskMap.get(props.task.idTask);
  theTask.editTask()
}

</script>

<template>
  <div class="task" :style="styleForTask()"
       @click="$emit('select', task)" :id="`task-card-${task.idTask}`"
       onmouseover="this.style.borderStyle='dotted'" :onmouseout="getTaskMouseOutStyle()" style="position: relative;"
       draggable="true"
  >
    <span><b>{{ task.key }}</b><br> </span>
    <span style="padding-right: 8px; ">
              {{ task.title }}
              </span>
    <img v-if="task.isExternal" :src="task.icon" style="position: absolute; right: 4px; top: 4px; width:16px; height: 16px"/>
    <img :src="`${task.taskType}.png`" style="position: absolute; left: 4px; bottom: 6px; width:16px; height: 16px"/>
    <img :src="`${task.priority}.svg`" style="position: absolute; left: 22px; bottom: 6px; width:16px; height: 16px"/>
    <button @click="timerClick" type="button" title="Start/Stop Pomodoro Timer" class="buttonTaskAction" style="bottom: 4px; right: 28px">
      <span class="material-icons-outlined material-icons">timer</span>
    </button>
    <button @click="editTask" type="button" title="Edit task" class="buttonTaskAction" style="bottom: 4px; right: 4px; ">
      <span class="material-icons-outlined material-icons">edit</span>
    </button>
    <button v-if="task.hasSubTasks"  @click="$emit('toggle-detail', task)" :title="task.expanded ? 'Hide Subtasks':'Show Subtasks'"
            class="buttonTaskAction" style="right: 52px; bottom: 4px;" >
      <span class="material-icons-outlined material-icons" v-if="!task.expanded">expand_more</span>
      <span class="material-icons-outlined material-icons" v-if="task.expanded">expand_less</span>
    </button>
  </div>
</template>

<style scoped>

</style>
