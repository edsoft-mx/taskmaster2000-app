<script setup>

import TMEpic from "components/tmEpic.vue";
import TMTask from "components/tmTask.vue";
import {callApi} from "src/common";
import { useUISessionStore } from 'stores/ui_state';
import {computed, ref, watch} from 'vue'


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
    default: null
  },
  expandState: {
    type: String,
    required: false,
    default: ""
  }
})

const uiStore = useUISessionStore()
let stateDisplayLimit = ref(new Map())
let stateTasksLength = ref(new Map())
let dragInitialState = ''

const events = defineEmits([
  'select',
  'maximize',
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

let rootElements = computed(()=>{
  let result = props.epics ? props.epics : []
  return result.concat(props.tasks)
})

function getTasks(state){
  if (!stateDisplayLimit.value.has(state.state)) {
    stateDisplayLimit.value.set(state.state, 7)
  }
  let result = []
  if (props.parent==null){
    // console.log(`Root node, returning ${state.tasks.length} tasks with state ${state.state}`)
    // console.log(`Root node, returning ${state.epics?.length} epics with state ${state.state}`)
    result = rootElements.value.filter((e)=> e.state === state.state)
  } else {
    // console.log('get sub-Tasks')
    // console.log(props.tasks)
    // console.log(`container has ${tasks.length} tasks`)
    for (let task of props.tasks){
        //console.log(task.key)
        if (task.state === state.state){
          result.push(task)
        }
    }
    //console.log(`and ${r.length} tasks of state ${state.state}`)
  }
  stateTasksLength.value.set(state.state, result.length)
  return result.slice(0, stateDisplayLimit.value.get(state.state))
}


function newTask(state){
  let idBoard = getTasks(state)[0].idBoard
  if (props.parent==null || props.parent.idTask==null){
    window.electronAPI.openTaskPage(`board/${idBoard}/task/0/-1`, `state=${state.state}`)
  }
  else {
    window.electronAPI.openTaskPage(`board/${idBoard}/task/${props.parent.idTask}/0`, `state=${state.state}`)
  }
}

function newEpic(state){
  let idBoard = getTasks(state)[0].idBoard
  window.electronAPI.openEpicPage(`board/${idBoard}/epic/0`, `state=${state.state}`)
}

function dragOverTask(event){
  if (event.preventDefault) {
    event.preventDefault();
  }
  //dummy()
  //console.log(event.currentTarget.id)
  let isValid = dropTargetIsValid(event.currentTarget.id)
  if (isValid){
    //console.log(`dragover: ${event.currentTarget.id}`)
    let dropTarget = document.getElementById(event.currentTarget.id)
    dropTarget.style.borderWidth="2px"
    dropTarget.style.borderStyle="dash"
    dropTarget.style.borderColor="navy"
  }
  return isValid
}

function dragLeaveTask(event){
  if (event.preventDefault) {
    event.preventDefault();
  }
  let isValid = dropTargetIsValid(event.currentTarget.id)
  if (isValid){
    //console.log(`dragleave: ${event.currentTarget.id}`)
    let dropTarget = document.getElementById(event.currentTarget.id)
    dropTarget.style.borderWidth="0px"
    dropTarget.style.borderStyle="solid"
    dropTarget.style.borderColor="black"
  }
  return isValid
}

function copyTaskItems(aList, thisId){
  let result = []
  for (let item of aList){
    if (item.idTask !== thisId){
      result.push(item)
    }
  }
  return result
}

async function dropTask(event){
  if (event.preventDefault) {
    event.preventDefault();
  }
  //dummy()
  console.log('dropTask')
  let data = JSON.parse(event.dataTransfer.getData('text/tm2000task'));
  let isValid = dropTargetIsValid(event.currentTarget.id, data)
  let dropTarget = document.getElementById(event.currentTarget.id)
  if (isValid) {
    console.log(`DROP! task: ${data.id}.state = ${data.state} -> ${dropTarget.id}`)
    let dropResult = await callApi("POST", `user/boards/${data.board}/tasks/${data.id}/dragged_to`,
      {target: dropTarget.id, idBoard: data.board})
    console.log(dropResult)
    uiStore.setNewState4Task(data.id, dropResult.task.state)

    console.log(dropResult)
    // if (dropResult.newParent){
    //   if (dropResult.from === 0){
    //     // console.log('before')
    //     // console.log(boardData.tasks)
    //     boardData.tasks = copyTaskItems(boardData.tasks, data.id)
    //     // console.log('after')
    //     // console.log(boardData.tasks)
    //     updateTasksState()
    //   }
    //   else{
    //     let idx = boardData.tasksWithSubTasks.findIndex(task => task.idTask === data.parentTask)
    //     let parentTask = boardData.tasksWithSubTasks[idx]
    //     parentTask.subTasks = copyTaskItems(parentTask.subTasks, data.id)
    //     updateParentTask(parentTask)
    //   }
    //   if (dropResult.to === 0) {
    //     boardData.tasks.push(dropResult.task)
    //     updateTasksState()
    //   }
    //   else {
    //     let idx = boardData.tasksWithSubTasks.findIndex(task => task.idTask === dropResult.to)
    //     // console.log(`Found parent task ${dropResult.to} at ${idx}`)
    //     let parentTask = boardData.tasksWithSubTasks[idx]
    //     // console.log(parentTask)
    //     parentTask.subTasks.push(dropResult.task)
    //     updateParentTask(parentTask)
    //   }
    // }
    // else {
    //   if (dropResult.to === 0) {
    //     let idx = boardData.tasks.findIndex(task => task.idTask === data.id)
    //     boardData.tasks[idx] = dropResult.task
    //     updateTasksState()
    //   }
    //   else {
    //     let idxParent = boardData.tasksWithSubTasks.findIndex(task => task.idTask === data.parentTask)
    //     let idxTask = boardData.tasksWithSubTasks[idxParent].subTasks.findIndex(task => task.idTask === data.id)
    //     boardData.tasksWithSubTasks[idxParent].subTasks[idxTask] = dropResult.task
    //     updateParentTask(boardData.tasksWithSubTasks[idxParent])
    //   }
    // }
  }
  dropTarget.style.borderWidth="0px"
  dropTarget.style.borderStyle="solid"
  dropTarget.style.borderColor="black"
}

function dragTask(event, task, parent){
  //task, parentTask
  //let taskUI = document.getElementById(event.target.id)
  //props.parent

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.dropEffect = 'move'
  let data = {id: task.idTask, state: task.state, project: task.idProject, board: task.idBoard}
  if (parent){
    if(parent.idTask){
      data.parentTask = parent.idTask
    }
    else if (parent.idEpic){
      data.parentEpic = parent.idEpic
    }
  }
  console.log('drag data')
  console.log(data)
  event.dataTransfer.setData('text/tm2000task', JSON.stringify(data))
  if (parent.idTask) {
    dragInitialState = `task_${parent.idTask}_${task.state.replace(' ','_')}`
  }
  else if (parent.idEpic){
    dragInitialState = `epic_${parent.idEpic}_${task.state.replace(' ','_')}`
  }
  else{
    dragInitialState = `main_${task.state.replace(' ','_')}`
  }
}

function dragOverTask2(event){
  if (event.preventDefault) {
    event.preventDefault();
  }
  //dummy()
  console.log(event.currentTarget.id)
  let isValid = dropTargetIsValid2(event.currentTarget.id)
  if (isValid){
    //console.log(`dragover: ${event.currentTarget.id}`)
    let dropTarget = document.getElementById(event.currentTarget.id)
    //dropTarget.style.borderWidth="2px"
    dropTarget.style.borderTopStyle="dashed"
    dropTarget.style.borderTopColor="red"
    // dropTarget.style.borderStyle="dashed"
  }
  return isValid
}

function dragLeaveTask2(event){
  if (event.preventDefault) {
    event.preventDefault();
  }
  let isValid = dropTargetIsValid2(event.currentTarget.id)
  if (isValid){
    //console.log(`dragleave: ${event.currentTarget.id}`)
    let dropTarget = document.getElementById(event.currentTarget.id)
    //dropTarget.style.borderWidth="0px"
    dropTarget.style.borderTopStyle="solid"
    dropTarget.style.borderTopColor="gray"
    //dropTarget.style.borderColor="black"
  }
  return isValid
}

function dropTargetIsValid(id, data=null){
  //console.log(`drop1: id != dragInitialState: ${id} != ${dragInitialState}`)
  let differentState = id !== dragInitialState
  if (data){
    let extractor = /(main_|epic_|task_\d+_)(.+)/
    let match = extractor.exec(id)
    differentState = data.state.replace(' ','_') !== match[2]
    //console.log(`drop.differentState= ${differentState} = ${data.state.replace(' ','_')} !== ${match[2]}`)
  }
  return (id.startsWith("main_") || id.startsWith("task_") || id.startsWith("epic_") ) && differentState
}

function dropTargetIsValid2(object_id, data=null){
  let validId = /(task-card-\d+)|(subtask-card-\d+-\d+)/
  let match = validId.exec(object_id)
  if (data==null) {
    return match != null
  }
  else {
    return object_id !== data.id && match != null
  }
}

function getSiblingTasksInfo(dropTargetId){
  let sameStateTask
  let targetIndex=-1
  const re_mainTask= /^task-card-(\d+)/
  let targetTask = boardData.allTasksMap.get(dropTargetId)
  console.log('TargetTask', targetTask)
  let matchMainTask = re_mainTask.exec(dropTargetId)
  if (matchMainTask){
    //console.log('por aca', matchMainTask)
    sameStateTask = boardData.stateMap.get(targetTask.state)
    targetIndex = sameStateTask.findIndex(task => task.idTask === Number(matchMainTask[1]))
    console.log('Same lane tasks:')
    console.log(sameStateTask)
    // for (let t2 of sameStateTask) {
    //   console.log(t2.taskId)
    // }
  }
  else{
    const re_subTask= /^subtask-card-(\d+)-(\d+)/
    let matchSubTask = re_subTask.exec(dropTargetId)
    let parentTask = boardData.allTasksMap.get(`task-card-${matchSubTask[1]}`)
    console.log('Parent task:',parentTask)
    sameStateTask = []
    let n=0
    parentTask.subTasks.forEach(subTask => {
      if (subTask.state === targetTask.state) {
        sameStateTask.push(subTask)
        if(subTask.idTask === Number(matchSubTask[2])){
          targetIndex=n
        }
      }
      n++
    })
    console.log('Same lane tasks:')
    console.log(sameStateTask)
  }
  return {
    siblingTasks: sameStateTask,
    targetIndex: targetIndex,
  }
}

async function dropTask2(event){
  if (event.preventDefault) {
    event.preventDefault();
  }
  //dummy()
  console.log('dropTask2')
  let data = JSON.parse(event.dataTransfer.getData('text/tm2000task'));
  let isValid = dropTargetIsValid2(event.currentTarget.id, data)
  let dropTarget = document.getElementById(event.currentTarget.id)

  if (isValid) {
    //data = {id, state, project, parentTask}
    console.log(`DROP-sort task: ${data.id} -> ${dropTarget.id}`)
    let targetData = getSiblingTasksInfo(dropTarget.id)
    await callApi('POST', `user/boards/${props.idBoard}/tasks/${data.id}/insert_before`, targetData)
    let scroll = window.scrollY
    await getData()
    window.scroll(0, scroll)
  }
  else {
    dropTarget.style.borderTopStyle = "solid"
    dropTarget.style.borderTopColor = "gray"
  }
}

function showMore(state){
  let number = stateDisplayLimit.value.get(state.state)
  stateDisplayLimit.value.set(state.state, number + 10)
  console.log(`show ${number + 10} tasks on ${state.state}`)
}

function showAll(state){
  let number = stateTasksLength.value.get(state.state)
  stateDisplayLimit.value.set(state.state, number)
  console.log(`show ${number} tasks on ${state.state}`)
}

function showLess(state){
  let number = stateDisplayLimit.value.get(state.state)
  let limit = number -10 > 7 ? number - 10 : 7
  stateDisplayLimit.value.set(state.state,limit)
  console.log(`show ${limit} tasks on ${state.state}`)
}

// watch(
//   props.expandState,
//   async(state, oldVal) => {
//     let number = stateTasksLength.value.get(state)
//     stateDisplayLimit.value.set(state, number)
//     console.log(`show ${number} tasks on ${state}`)
//   }
// )

</script>

<template>
  <div class="row" style="min-height: 500px; ">
    <div v-for="state in states" :key="state.state" :class="`col stateColumn state_${state.state.replace(' ','_')}`"
         @dragover="dragOverTask($event)" @dragleave="dragLeaveTask($event)" @drop="dropTask($event)"
         :id="`main_${state.state.replace(' ','_')}`"
    >
      <div class="stateTitle">
        {{ state.state }} <span><small>{{ stateTasksLength.get(state) }} </small></span>
      </div>
      <div :class="`state_${state.state}`" :id="`container_${state.state.replace(' ', '_')}`">
        <div v-for="task in getTasks(state)" :key="task.uiKey">
          <TMEpic :id="`epic-card-${task.idEpic}`" :epic="task" v-if="task.idEpic && !task.idTask"
                  @toggle-epic="$emit('toggle-epic', task)" @select="$emit('select', task)"
                  @dragstart="dragEpic($event, task, null)"
                  @dragover="dragOverEpic($event)" @dragleave="dragLeaveEpic($event)" @drop="dropEpic($event)"
                  @dblclick="$emit('maximize', task)"
          />
          <TMTask :id="`task-card-${task.idTask}`" :task="task" v-if="task.idTask"
                  @dblclick="$emit('maximize', task)"
                  @toggle-detail="$emit('toggle-detail', task)"
                  @select="$emit('select', task)"
                  @dragstart="dragTask($event, task, parent)"
                  @dragover="dragOverTask2($event)" @dragleave="dragLeaveTask2($event)" @drop="dropTask2($event)"
          />
        </div>
        <div class="newTask" v-if="state.start">
          <a href=":newTask" @click="newTask(state)" @click.prevent>+ Add a new task</a>
        </div>
        <div class="newTask" v-if="state.start &&  parent==null">
          <a href=":newEpic" @click="newEpic(state)" @click.prevent>+ Add a new epic</a>
        </div>
        <div class="newTask" v-if="stateTasksLength.get(state.state) > 7">
          Show...
          <span v-if="stateDisplayLimit.get(state.state) < stateTasksLength.get(state.state) ">
              <a href="#more" @click="showMore(state)" @click.prevent>More</a>
            </span>
          <span v-if="stateDisplayLimit.get(state.state) < stateTasksLength.get(state.state) ">
              &nbsp;|&nbsp;
              <a href="#more" @click="showAll(state)" @click.prevent>All</a>
            </span>
          <span v-if="stateDisplayLimit.get(state.state) > 7">
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
