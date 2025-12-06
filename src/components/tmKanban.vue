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
  },
  idBoard: {
    type: String,
    required: true,
  },
  idPrefix: {
    type: String,
    required: false,
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
  'goToDetail',
  'goToDetailEpic',
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

let epicsIndexed = computed(()=>{
  // console.log('Computing epics...')
  let result = new Map()
  let epics = props.epics ? props.epics : []
  let indexTop = new Map();
  for (let epic of epics){
    //console.log('epic', epic)
    if (!stateDisplayLimit.value.has(epic.state)) {
      stateDisplayLimit.value.set(epic.state, 7)
    }
    let index;
    let epics_by_state = []
    if (!result.has(epic.state)){
      index = 0
      indexTop.set(epic.state, 0)
      result.set(epic.state, epics_by_state)
    }
    else {
      index = indexTop.get(epic.state)
      epics_by_state= result.get(epic.state)
    }
    epic.displayIndex=index;
    index++;
    indexTop.set(epic.state, index)
    epics_by_state.push(epic)
  }
  return result
})

let tasksIndexed = computed(()=>{
  // console.log('Computing tasks...')
  let result = new Map()
  let indexTop = new Map()
  for (const [key, value] of epicsIndexed.value) {
    indexTop.set(key, value.length)
  }
  //console.log(indexTop)
  let tasks = props.tasks ? props.tasks : []
  for (let task of tasks){
    //console.log('task', task)
    if (!stateDisplayLimit.value.has(task.state)) {
      stateDisplayLimit.value.set(task.state, 7)
    }
    let index;
    let tasks_by_state = []
    if (indexTop.has(task.state)){
      index = indexTop.get(task.state)
    }
    else {
      index = 0
    }
    if (!result.has(task.state)){
      result.set(task.state, tasks_by_state)
    }
    else {
      tasks_by_state= result.get(task.state)
    }
    task.displayIndex=index;
    index++;
    indexTop.set(task.state, index)
    tasks_by_state.push(task)
  }
  //console.log('tasks done: ', result.get('Done'))
  for (const [key, value] of result) {
    stateTasksLength.value.set(key, value.length)
  }
  return result
})

function newTask(state){
  let idBoard = props.idBoard  //tasksIndexed.value.get(state)[0].idBoard
  console.log(state.state, idBoard, props.parent)
  if (props.parent==null || (props.parent.idTask==null && props.parent.idEpic==null)){
    console.log('new root task')
    window.electronAPI.openTaskPage(`board/${idBoard}/task/0/-1`, `state=${state.state}`)
  }
  else if (props.parent.idEpic!=null){
    console.log('new epic task')
    window.electronAPI.openTaskPage(`board/${idBoard}/epic/${props.parent.idEpic}/0/-1`, `state=${state.state}`)
  }
  else {
    console.log('new subtask')
    window.electronAPI.openTaskPage(`board/${idBoard}/task/${props.parent.idTask}/0`, `state=${state.state}`)
  }
}

function newEpic(state){
  let idBoard = props.idBoard // tasksIndexed.value.get(state)[0].idBoard
  window.electronAPI.openEpicPage(`board/${idBoard}/epic/0`, `state=${state.state}`)
}

function dragOverStateColumn(event){
  if (event.preventDefault) {
    event.preventDefault();
  }
  //dummy()
  console.log('dragOverStateColumn', event.currentTarget.id)
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

function dragLeaveStateColumn(event){
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

async function dropOverStateColumn(event){
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
    let dropResult
    if (data.kind === 'task'){
      dropResult = await callApi("POST", `user/boards/${data.board}/tasks/${data.id}/dragged_to`,
        {target: dropTarget.id, idBoard: data.board})
    }
    else if (data.kind === 'epic'){
      dropResult = await callApi("POST", `user/boards/${data.board}/epics/${data.id}/dragged_to`,
        {target: dropTarget.id, idBoard: data.board})
      // location.reload()
      return
    }
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
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.dropEffect = 'move'
  console.log('dragTask')
  console.log(task)
  console.log(parent)
  let data = {id: task.idTask, kind: 'task', state: task.state, project: task.idProject, board: task.idBoard}
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
  if (parent && parent.idTask) {
    dragInitialState = `task_${parent.idTask}_${task.state.replace(' ','_')}`
  }
  else if (parent && parent.idEpic){
    dragInitialState = `epic_${parent.idEpic}_${task.state.replace(' ','_')}`
  }
  else{
    dragInitialState = `main_${task.state.replace(' ','_')}`
  }
}

function dragEpic(event, epic){
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.dropEffect = 'move'
  console.log('dragEpic')
  console.log(epic)
  let data = {id: epic.idEpic, kind: 'epic', state: epic.state, project: epic.idProject, board: epic.idBoard}
  console.log('drag data')
  console.log(data)
  event.dataTransfer.setData('text/tm2000task', JSON.stringify(data))
  dragInitialState = `main_${epic.state.replace(' ','_')}`
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
    let extractor = /(main_|epic_\d+_|task_\d+_)(.+)/
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

// @dragover="dragOverTask2($event)" @dragleave="dragLeaveTask2($event)" @drop="dropTask2($event)"

</script>

<template>
  <div class="row">
    <div v-for="state in states" :key="state.state" :class="`col stateColumn state_${state.state.replace(' ','_')}`"
         @dragover="dragOverStateColumn($event)" @dragleave="dragLeaveStateColumn($event)"
         @drop="dropOverStateColumn($event)"
         :id="`${idPrefix}_${state.state.replace(' ','_')}`"
    >
      <div class="stateTitle">
        {{ state.state }} <span><small>{{ stateTasksLength.get(state) }} </small></span>
      </div>
      <div :class="`state_${state.state}`" :id="`container_${state.state.replace(' ', '_')}`">
        <div v-for="epic in epicsIndexed.get(state.state)" :key="epic.uiKey">
          <TMEpic :id="`epic-card-${epic.idEpic}`" :epic="epic"
                  v-show="epic.displayIndex < stateDisplayLimit.get(state.state) || epic.ghost"
                  @go-to-detail-epic="$emit('go-to-detail-epic', epic)"
                  @toggle-epic="$emit('toggle-epic', epic)" @select="$emit('select', epic)"
                  @dragstart="dragEpic($event, epic)"
                  @dblclick="$emit('maximize', epic)"
          />
        </div>
        <div v-for="task in tasksIndexed.get(state.state)" :key="task.uiKey">
          <TMTask :id="`task-card-${task.idTask}`" :task="task"
                  v-show="task.displayIndex < stateDisplayLimit.get(state.state) || task.ghost || task.justAdded"
                  @dblclick="$emit('maximize', task)"
                  @toggle-detail="$emit('toggle-detail', task)"
                  @go-to-detail="$emit('go-to-detail', task)"
                  @select="$emit('select', task)"
                  @dragstart="dragTask($event, task, parent)"
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
