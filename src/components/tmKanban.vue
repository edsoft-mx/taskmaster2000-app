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
  parent: {
    type: Object,
    required: false,
  },
  tasks: {
    type: Array,
    required: false,
  },
  epics: {
    type: Array,
    required: false,
  },
})

let stateDisplayLimit = new Map()

const events = defineEmits([
  'select',
  // 'editTask',
  // 'timerClick',
  'toggleDetail',
  'toggleEpic',
  // 'openExternal',
  'dragStarted',
  'dragOver',
  'dragLeave',
  'drop'
])

function getTasks(state){
  if (!stateDisplayLimit.has(state.state)) {
    stateDisplayLimit.set(state.state, 7)
  }
  let result = []
  if (props.parent==null){
    // console.log(`Root node, returning ${state.tasks.length} tasks with state ${state.state}`)
    // console.log(`Root node, returning ${state.epics?.length} epics with state ${state.state}`)
    result = state.epics ? state.epics : []
    if (state.tasks?.length > 0) {
      result = result.concat(state.tasks)
    }
  } else {
    // console.log('getTasks')
    // console.log(props.childPropertyName)
    //console.log(props.parent)
    let tasks = props.parent.subTasks
    //console.log(tasks)
    // console.log(`container has ${tasks.length} tasks`)
    for (let task of tasks){
        //console.log(task.key)
        if (task.state == state.state){
          result.push(task)
        }
    }
    //console.log(`and ${r.length} tasks of state ${state.state}`)
  }
  return result.slice(0, stateDisplayLimit.get(state.state))
}


function newTask(state){

}

function newEpic(state){

}

</script>

<template>
  <div class="row" style="min-height: 500px; ">
    <div v-for="state in states" :key="state.state" :class="`col stateColumn state_${state.state.replace(' ','_')}`"
         :id="`main_${state.state.replace(' ','_')}`"
    >
      <div class="stateTitle">
        {{ state.state }} <span><small>{{ getTasks(state).length }} </small></span>
      </div>
      <div :class="`state_${state.state}`" :id="`container_${state.state.replace(' ', '_')}`">
        <div v-for="task in getTasks(state)" :key="task.idTask">
          <TMEpic :id="`epic-card-${task.idEpic}`" :epic="task" v-if="task.idEpic && !task.idTask"
                  @toggle-epic="$emit('toggle-epic', task)" @select="$emit('select', task)" />
          <TMTask :id="`task-card-${task.idTask}`" :task="task" v-if="task.idTask"
                  @toggle-detail="$emit('toggle-detail', task)" @select="$emit('select', task)" />
        </div>
        <div class="newTask" v-if="state.start">
          <a href=":newTask" @click="newTask(state)" @click.prevent>+ Add a new task</a>
        </div>
        <div class="newTask" v-if="state.start &&  parent==null">
          <a href=":newEpic" @click="newEpic(state)" @click.prevent>+ Add a new epic</a>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
