<script setup>
defineOptions({
  name: 'TMTask',
})

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const events = defineEmits([
  'showTask',
  'editTask',
  'timerClick',
  'toggleDetail',
  'openExternal',
  'dragStarted',
  'dragOver',
  'dragLeave',
  'drop'
])

function styleForTask(){
  return `border: solid 3px ${props.task.color}; padding-bottom: 32px;` // ${shadow}; `
}

function getTaskMouseOutStyle(){
  return "this.style.borderStyle='solid'"
}

function dragTask(event, task, something){

}

function dragOverTask2(event){

}

function dragLeaveTask2(event){

}

function dropTask2(event){

}

async function timerClick(){
  await window.electronAPI.pomodoroTimerClick({
    idTask: props.task.idTask,
    description: props.task.description,
    title: props.task.title,
    key: props.task.key,
    idProject: props.task.idProject,
  })

}


</script>

<template>
  <div class="task" :style="styleForTask()"
       @click="$emit('show-task')" :id="`task-card-${task.idTask}`"
       onmouseover="this.style.borderStyle='dotted'" :onmouseout="getTaskMouseOutStyle()" style="position: relative;"
       draggable="true" @dragstart="dragTask($event, task, null)"
       @dragover="dragOverTask2($event)" @dragleave="dragLeaveTask2($event)" @drop="dropTask2($event)"
  >
    <span><b>{{ task.key }}</b><br> </span>
    <span style="padding-right: 8px; ">
              {{ task.title }}
              </span>
    <img v-if="task.isExternal" :src="`${task.icon}`" style="position: absolute; right: 4px; top: 4px; width:16px; height: 16px"/>
    <img :src="`${task.taskType}.png`" style="position: absolute; left: 4px; bottom: 6px; width:16px; height: 16px"/>
    <img :src="`${task.priority}.svg`" style="position: absolute; left: 22px; bottom: 6px; width:16px; height: 16px"/>
    <button @click="timerClick()" type="button" title="Start/Stop Pomodoro Timer" class="buttonTaskAction" style="bottom: 4px; right: 28px">
      <span class="material-icons-outlined material-icons">timer</span>
    </button>
    <button @click="$emit('edit-task')" type="button" title="Edit task" class="buttonTaskAction" style="bottom: 4px; right: 4px; ">
      <span class="material-icons-outlined material-icons">edit</span>
    </button>
    <button v-if="task.hasSubTasks"  @click="$emit('toggle-detail')" :title="task.expanded ? 'Hide Subtasks':'Show Subtasks'"
            class="buttonTaskAction" style="right: 52px; bottom: 4px;" >
      <span class="material-icons-outlined material-icons" v-if="!task.expanded">expand_more</span>
      <span class="material-icons-outlined material-icons" v-if="task.expanded">expand_less</span>
    </button>
  </div>
</template>

<style scoped>

button.buttonTaskAction {
  position: absolute;
  padding:0;
  margin:0;
  width: 22px;
  height: 22px;
  color: #707070;
}

</style>
