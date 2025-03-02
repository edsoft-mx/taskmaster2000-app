<script setup>

import TMEpic from "components/tmEpic.vue";
import TMTask from "components/tmTask.vue";

defineOptions({
  name: 'TMKanban',
})

const props = defineProps({
  states: {
    type: Array,
    required: true,
  },
  tasks: {
    type: Array,
    required: true,
  },
  epics: {
    type: Array,
    required: true,
  },
  // boardData: {
  //   type: Object,
  //   required: true,
  // }
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

function getTasks(state){

}

</script>

<template>
  <div class="row" style="min-height: 500px; ">
    <div v-for="state in states" :key="state.state" :class="`col stateColumn state_${state.state.replace(' ','_')}`"
         @dragover="dragOverTask($event)" @dragleave="dragLeaveTask($event)" @drop="dropTask($event)"
         :id="`main_${state.state.replace(' ','_')}`"
    >
      <div class="stateTitle">
        {{ state.state }} <span><small>{{ getTasks(state).length }} </small></span>
      </div>
      <div :class="`state_${state.state}`" :id="`container_${state.state.replace(' ', '_')}`">
        <div v-for="(task, taskIndex) in getTasks(state)" :key="task.idTask">

          <TMEpic :id="`epic-card-${task.idEpic}`" :board-data="boardData" :epic="task"  v-if="task.idEpic && !task.idTask"
                  @toggle-detail="toggleEpic(task)" @show-epic="showEpic(epic)" @edit-epic="editEpic(task)" />
          <TMTask :id="`task-card-${task.idTask}`"
                  :task="task" :boardData="boardData" @show-task="showTask(task)" @edit-task="editTask(task)"
                  @toggle-detail="toggleTask(task)"
                  v-if="taskIndex < boardData.stateDisplayLimit.get(state.state) && task.idTask" />
        </div>
        <div class="newTask" v-if="state.start">
          <a href=":newTask" @click="newTask(state)" @click.prevent>+ Add a new task</a>
        </div>
        <div class="newTask" v-if="state.start">
          <a href=":newEpic" @click="newEpic(state)" @click.prevent>+ Add a new epic</a>
        </div>
        <div class="newTask" v-if="getTasks(state).length > 7">
          Show...
          <span v-if="boardData.stateDisplayLimit.get(state.state) < getTasks(state).length ">
              <a href="#more" @click="showMore(state)" @click.prevent>More</a>
            </span>
          <span v-if="boardData.stateDisplayLimit.get(state.state) < getTasks(state).length ">
              &nbsp;|&nbsp;
              <a href="#more" @click="showAll(state)" @click.prevent>All</a>
            </span>
          <span v-if="boardData.stateDisplayLimit.get(state.state) > 7">
              &nbsp;|&nbsp;
              <a href="#less" @click="showLess(state)" @click.prevent>Less</a>
            </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
