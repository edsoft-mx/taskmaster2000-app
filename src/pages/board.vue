<script setup>
import TmTaskDescription from "components/tmTaskDescription.vue";

defineOptions({
  name: 'tm-board'
});
import {ref, reactive, defineProps, watch, inject, computed, onMounted, triggerRef, nextTick} from 'vue'
import { callApi } from 'src/common'
import {
  allStates,
  projectMap,
  BoardState,
  BoardProject,
  BoardEpic,
  BoardTask,
  resetData,
  allTaskMap, epicMap
} from 'src/commonObjects'
import TMKanban from "components/tmKanban.vue";
import TMTaskContainer from 'components/tmTaskContainer.vue'
import TMEpicContainer from 'components/tmEpicContainer.vue'
import { useUISessionStore } from 'stores/ui_state';

const props = defineProps({
  idBoard: Number,
  showSubTask: Number,
  //showSearchResult: String,
  executeOp: Object,
})

const uiStore = useUISessionStore()
let previousUIStoreState = {
  selectedTask: 0,
  pomodoroSession: 0,
  pomodoroIndex: 0,
  task2UpdateState: {id: 0, state: '?'}
}

const currentBoardId = inject('currentBoardId')
const leftDrawerOpen = inject('leftDrawerOpen')
// TODO: remove rightDrawerHeader, rightDrawerSubtasks, rightDrawerContent, rightDrawerContent2
const rightDrawerOpen = inject('rightDrawerOpen')
// const rightDrawerContent = inject('rightDrawerContent')
// const rightDrawerContent2 = inject('rightDrawerContent2')
// const rightDrawerHeader = inject('rightDrawerHeader')
// const rightDrawerSubtasks = inject('rightDrawerSubtasks')
const headerTitle = inject('headerTitle')
const headerIconShow = inject('headerIconShow')
let dragInitialState = ''
const clickPomodoroTimer = inject('clickPomodoroTimer')
const globalSelectedTask = inject('globalSelectedTask')
const daysWithActivity = inject('daysWithActivity')
const maximizedTask = ref(false)

const updater = reactive(new Map([['root', 'root_0']]))

const boardData = reactive({
  name: "",
  states: [],
  tasks: [],
  projects: [],
  epics: [],
//  epicTasks: {},
  task2domMap: new Map(),
  epic2domMap: new Map(),
  //epicTasksMap: new Map(),
})

const expandedEpics = computed(() => boardData.epics.filter(t => t.expanded))

const selectedTask = ref(null)
const maximizedTaskRef = ref(null)
const prevSelectedTask = ref(null)


function updateActivityDate(map, kind, date){
  let baseDate = date.substring(0, 10).replaceAll('-', '/')
  let state
  if (!map.has(baseDate)) {
    // console.log(`New activity for ${baseDate}`)
    state= {
      start: kind==='start',
      due: kind==='due',
    }
    // console.log(state)
  }
  else {
    state = map.get(baseDate)
    //console.log(`data from ${baseDate}`)
    //console.log(state)
    if (kind==='start'){
      state.start = true
    }
    if (kind==='due'){
      state.due = true
    }
  }
  // console.log(`set activity for ${baseDate}`)
  // console.log(state)
  map.set(baseDate, state)
}


async function getData(){
  console.log('board get data')
  boardData.tasks = []
  boardData.epics = []
  boardData.states= []
  boardData.projects = []
  boardData.epicTasks = {}
  resetData()
  let taskObjects= []
  let epicObjects= []
  let statesObjects= []
  let projectObjects= []
  let apiCallBoard = callApi('GET', `user/boards/${props.idBoard}`)
  let apiCallBoardTasks = callApi('GET', `user/boards/${props.idBoard}/tasks`)
  let apiCallBoardEpics = callApi('GET', `user/boards/${props.idBoard}/epics`)
  let result = await apiCallBoard
  boardData.name= result.name
  for (let state of result.states) {
    statesObjects.push(new BoardState(state))
  }
  for (let project of result.projects) {
    projectObjects.push(new BoardProject(project))
  }

  headerTitle.value= boardData.name
  headerIconShow.value= false

  selectedTask.value = null
  prevSelectedTask.value = null
  globalSelectedTask.value = null
  boardData.task2domMap.clear()
  boardData.epic2domMap.clear()

  let epics = await apiCallBoardEpics
  for (let epic of epics){
    let epicObject= new BoardEpic(epic)
    epicObjects.push(epicObject)
    boardData.epic2domMap.set(epic.idEpic, `epic-card-${epic.idEpic}`)
    //updater.set(`epic_${epic.idEpic}`,  `epic_${epic.idEpic}`)
  }

  result = await apiCallBoardTasks
  let activityMap = new Map()
  console.log('new activityMap')
  for (let task of result.tasks){
    let taskObject = new BoardTask(task)
    if (task.dueDate){
      // console.log(`Set ${task.key}.dueDate = ${task.dueDate}`)
      updateActivityDate(activityMap, 'due', task.dueDate)
    }
    if (task.estimatedStartDate){
      // console.log(`Set ${task.key}.estimatedStartDate = ${task.estimatedStartDate}`)
      updateActivityDate(activityMap, 'start', task.estimatedStartDate)
    }
    taskObjects.push(taskObject)
    boardData.task2domMap.set(task.idTask, `task-card-${task.idTask}`)
    // if (task.idEpic!=null){
    //   // console.log('A Task with an Epic!')
    //   // console.log(task)
    //   let epicKey= `epic_${task.idEpic}_tasks`
    //   if (!boardData.epicTasks.hasOwnProperty(epicKey)){
    //     boardData.epicTasks[epicKey] = []
    //   }
    //   boardData.epicTasks[epicKey].push(task)
    // }
    //updater.set(`task_${task.idTask}`, `task_${task.idTask}`)
    if (task.hasSubTasks){
      //boardData.tasksWithSubTasks.push(task)
      for (let subTask of task.subTasks){
        //boardData.allTasksMap.set(`subtask-card-${task.idTask}-${subTask.idTask}`, subTask)
        boardData.task2domMap.set(subTask.idTask, `task-card-${subTask.idTask}`)
        if (subTask.dueDate){
          // console.log(`Set ${subTask.key}.dueDate = ${subTask.dueDate}`)
          updateActivityDate(activityMap, 'due', subTask.dueDate)
        }
        if (subTask.estimatedStartDate){
          // console.log(`Set ${subTask.key}.estimatedStartDate = ${subTask.estimatedStartDate}`)
          updateActivityDate(activityMap, 'start', subTask.estimatedStartDate)
        }
      }
    }
  }
  daysWithActivity.value = activityMap
  leftDrawerOpen.value= false
  // console.log(`allStates.length = ${allStates.length}`)
  // console.log(`Epics.all.length = ${BoardEpic.allEpics.length}`)
  // console.log(`Tasks.root.length= ${BoardTask.rootTasks.length}`)
  // console.log(allStates)
  boardData.states= statesObjects
  boardData.projects = projectObjects
  boardData.epics = epicObjects
  boardData.tasks = BoardTask.rootTasks
  currentBoardId.value = props.idBoard
  maximizedTask.value= false
  closeMaximized()
}

function styleForEpicTab(epic){
  let prj = boardData.projectsMap.get(epic.idProject);
  return `background-color: ${prj.color}`
}

function styleForSuperTask(task){
  let style = ''
  if (task === selectedTask.value && task.expanded && task.hasSubTasks){
    let borderWidth = "4px"
    style = `border: solid ${borderWidth} ${task.color};`
  }
  return style
}

function styleForEpic(epic){
  let style = ''
  let prj = boardData.projectsMap.get(epic.idProject);
  if (epic === selectedTask.value && epic.expanded){
    let borderWidth = "4px"
    style = `border: solid ${borderWidth} ${prj.color};`
  }
  return style
}

function getTaskMouseOutStyle(task){
  if (task.idTask){
    return "this.style.borderStyle='solid'"
  }
  else {
    return "this.style.borderStyle='none'"
  }
}

watch(
    () => props.idBoard,
    (newVal, oldVal) => {
      getData()
    }
)

watch(
    () => props.showSubTask,
    (newVal, oldVal) => {
      viewSubTask(newVal)
    }
)

watch(
    () => props.executeOp,
  async (newVal, oldVal) =>  {
      if (newVal.op==='showTask'){
        await showSearchedTask(newVal.value)
      }
      if (newVal.op==='updateAndShowTask'){
        await updateTask(newVal.value)
        await showSearchedTask(newVal.value)
      }
      else if (newVal.op==='refreshData'){
        let scroll = window.scrollY
        await getData();
        window.scroll(0, scroll)
      }
      // else if (newVal.op==='togglePomodoro'){
      //   clickPomodoroTimer(pomodoroTask)
      // }
      // else if (newVal.op==='pomodoroStartWithPrevious'){
      //   pomodoroStartWithPrevious()
      // }
      // else if (newVal.op==='pomodoroSkip'){
      //   pomodoroSkipToNextSession()
      // }
    }
)

function getStateId(state){
  return `container_${state.state.replace(' ', '_')}`;
}

// function getTasks(state){
//   let stateList = boardData.stateMap.get(state.state)
//   let tasks_without_epic = stateList.filter(task => task.idEpic == null)
//   let epicStateList = boardData.stateMapEpics.get(state.state)
//   // console.log(`Tareas para ${state.state}: ${state_list}`)
//   return epicStateList.concat(tasks_without_epic)
// }
//
// function getEpicTasks(state, epic){
//   // console.log('Epic')
//   // console.log(epic)
//   // console.log('State')
//   // console.log(state)
//   let result = []
//   let tasks4Epic = boardData.epicTasksMap.get(epic.idEpic)
//   // console.log('Epic tasks')
//   // console.log(tasks4Epic)
//   for (let task of tasks4Epic){
//     if (task.state === state.state){
//       result.push(task)
//     }
//   }
//   return result
// }
//
// function getSubTasks(task, state){
//   let result = []
//   for (let sb of task.subTasks){
//     if (sb.state !== state.state){
//       continue
//     }
//     result.push(sb)
//   }
//   return result
// }

async function showSearchedTask(idTask, tryNumber=1){
  if (!idTask){
    return
  }
  console.log('showSearchedTask')
  let task = BoardTask.allTasks.find(t => t.idTask == idTask)
  if (document.getElementById(`task-card-${idTask}`)!=null){
    //task is visible
    setTimeout(`scrollToTask(${idTask})`, 500)
    if (task != null){
      showTask(task)
      if (maximizedTask.value){
        maximizedTaskRef.value= task
      }
    }
    else {
      console.log(`could not find task ${idTask}`)
    }
  }
  else {
    console.log('Task is not visible, trying to show it...')
    if (!maximizedTask.value){
      if (tryNumber===1){
        if (task.parentTask && !task.parentTask.expanded){
          task.parentTask.expanded = true
          if (task.parentTask.idEpic && !task.parentTask.epic.expanded){
            task.parentTask.epic.expanded = true
          }
        }
        if (task.idEpic && !task.epic.expanded){
          task.epic.expanded = true
        }
        await nextTick()
        await showSearchedTask(idTask, 2)
      }
      else{
        alert("Task is not visible")
      }
    }
    else{
      maximizedTaskRef.value= task
    }
    // if (task.idEpic==null && task.isRoot){
    //   if (context.$refs.rootKanban){
    //     context.$refs.rootKanban.expandState= task.state
    //   }
    // }
  }
  // console.log(`Locating and showing ${taskPath}`)
  // if(!taskPath.includes('.')){
  //   selectedTask.value = boardData.tasks.find(t => t.idTask === Number(taskPath))
  //   globalSelectedTask.value = selectedTask.value
  //   if (document.getElementById(`task-card-${selectedTask.value.idTask}`)==null){
  //     let state = boardData.states.find(s => s.state === selectedTask.value.state)
  //     showAll(state)
  //   }
  //   setTimeout(`scrollToTask(${selectedTask.value.idTask})`, 500)
  // }
  // else{
  //   let parts = taskPath.split('.');
  //   selectedTask.value = boardData.tasks.find(t => t.idTask === Number(parts[0]))
  //   globalSelectedTask.value = selectedTask.value
  //   if (document.getElementById(`task-card-${selectedTask.value.idTask}`)==null){
  //     let state = boardData.states.find(s => s.state === selectedTask.value.state)
  //     showAll(state)
  //   }
  //   viewSubTask(Number(parts[1]))
  // }
}

async function updateTask(idTask){
  if (!idTask){
    return
  }
  console.log(`Updating task ${idTask}`)
  let task = BoardTask.allTasks.find(t => t.idTask == idTask)
  let currentValues = await callApi('GET', `user/boards/${props.idBoard}/tasks/${idTask}`)
  task.updateData(currentValues)
  task.updateUIElements()
  // if (task.idTask === selectedTask.value.idTask){
  //   selectedTask.value=null
  //   selectedTask.value=task
  // }
}

function viewSubTask(subTask){
  console.log('viewSubTask')
  console.log(subTask)
  if (selectedTask.value.idEpic){
    selectedTask.value.expanded = true
    setTimeout(`scrollToEpic(${selectedTask.value.idEpic})`, 500)
    let tasks = boardData.epicTasksMap.get(selectedTask.value.idEpic)
    let subtaskPointer= tasks.find((st)=>st.idTask === subTask)
    selectedTask.value = subtaskPointer
    globalSelectedTask.value = selectedTask.value
    showTask(subtaskPointer)
    return
  }
  selectedTask.value.expanded = true
  setTimeout(`scrollToTask(${selectedTask.value.idTask})`, 500)
  //scrollToTask(selectedTask.value.idTask)
  let subtaskPointer= selectedTask.value.subTasks.find((st)=>st.idTask === subTask)
  selectedTask.value = subtaskPointer
  globalSelectedTask.value = selectedTask.value
  showTask(subtaskPointer)
}

function styleForTask(task){
  let prj = boardData.projectsMap.get(task.idProject);
  return `border: solid 3px ${prj.color}; padding-bottom: 32px;` // ${shadow}; `
}

function addClassToTask(task, classTask){
  let elId
  if (task.idTask) {
    elId = boardData.task2domMap.get(task.idTask)
  }
  else if (task.idEpic){
    elId = boardData.epic2domMap.get(task.idEpic)
  }
  let el = document.getElementById(elId)
  if (el!=null) {
    el.classList.add(classTask)
  }
}

function removeClassFromTask(task, classTask){
  let elId
  if (task.idTask) {
    elId = boardData.task2domMap.get(task.idTask)
  }
  else if (task.idEpic){
    elId = boardData.epic2domMap.get(task.idEpic)
  }
  let el = document.getElementById(elId)
  if (el!=null){
    el.classList.remove(classTask)
  }
}

function showTask(task, openRightDrawer=true){
  console.log('showTask')
  console.log(task)
  if (openRightDrawer){
    rightDrawerOpen.value=true;
  }
  if (prevSelectedTask.value && prevSelectedTask.value != task){
    removeClassFromTask(prevSelectedTask.value, 'selectedTask')
  }
  selectedTask.value=task
  globalSelectedTask.value = selectedTask.value
  addClassToTask(task, 'selectedTask')
  prevSelectedTask.value= task
}

function showEpic(epic, openRightDrawer=true){
  console.log('showEpic')
  console.log(epic)
  if (openRightDrawer){
    rightDrawerOpen.value=true;
  }
  if (prevSelectedTask.value && prevSelectedTask.value != epic){
    removeClassFromTask(prevSelectedTask.value, 'selectedTask')
  }
  selectedTask.value=epic
  globalSelectedTask.value = selectedTask.value
  addClassToTask(epic, 'selectedTask')
  prevSelectedTask.value= epic

  let project = boardData.projectsMap.get(epic.idProject)
  rightDrawerHeader.value=`<h3><img class="taskIcon" src="${epic.taskType}.png">
    <strong>${epic.key}</strong> | ${project.name}<p style="margin-top: 8px;">${epic.epic}</p>
    </h3>`
  let subtasksChunk = ''
  let tasks = boardData.epicTasksMap.get(epic.idEpic)
  if (tasks.length > 0){
    subtasksChunk = '\n## Pending Tasks:\n'
    rightDrawerSubtasks.value = tasks.filter(st => !st.endState)
  }
   else {
    rightDrawerSubtasks.value = []
  }
  let taskDescription1 = `

State: \` ${epic.state} \`
Priority: ![alt-priority](${epic.priority}.svg =24x24) ${epic.priority}

`
  if (epic.description){
    taskDescription1 += `## Description:

${epic.description}

`
  }

  rightDrawerContent.value = taskDescription1
  rightDrawerContent2.value = subtasksChunk
}


function updateTasksState(){
  boardData.stateMap.clear();
  for (let state of boardData.states){
    boardData.stateMap.set(state.state, [])
  }
  for (let task of boardData.tasks){
    let state_list = boardData.stateMap.get(task.state)
    if (state_list==null){
      console.log(`Invalid state for task.id ${task.idTask} (${task.title}): ${task.state}`)
      continue
    }
    state_list.push(task)
  }
}

function updateParentTask(parentTask){
  parentTask.updateUIElements()
}

async function toggleTask(task){
  task.expanded = !task.expanded
  let data = {expanded: task.expanded, idBoard: props.idBoard}
  let _= await callApi("POST", `user/tasks/${task.idTask}`, data)
  if (task.expanded){
    //if (task.hasSubTasks && task.expanded) {
    setTimeout(`scrollToTask(${task.idTask})`, 500)
    //}
  }
}

async function toggleEpic(epic){
  let idx = boardData.epics.indexOf(epic)
  epic.expanded = !epic.expanded
  //boardData.epics[idx].expanded = !boardData.epics[epic].expanded
  let data = {expanded: epic.expanded, idBoard: props.idBoard}
  await callApi("POST", `user/epics/${epic.idEpic}`, data)
  if (epic.expanded){
    //if (task.hasSubTasks && task.expanded) {
    setTimeout(`scrollToEpic(${epic.idEpic})`, 500)
    //}
  }
}

// async function toggleSuperTaskInfo(task){
//   if (!task.showDetail){
//     task.showDetail= true
//   }
//   else {
//     task.showDetail = false
//   }
//   showTask(task)
// }

// function superTaskDetail(task){
//   let result = ''
//   if (task.description){
//     result += `## Description:\n${task.description}\n`
//   }
//   if (task.notes){
//     result += `## Notes:\n${task.notes}\n`
//   }
//   return result
// }

window.electronAPI.onRefresh(async() => {
  let scroll = window.scrollY
  console.log(scroll)
  await getData();
  window.scroll(0, scroll)
  console.log(window.scrollY)
})

onMounted(()=>{
  console.log('mounted')
  getData()
})

function getRandomAlphanumeric() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomIndex = Math.floor(Math.random() * characters.length);
  return characters.charAt(randomIndex);
}

async function maximizeTask(task){
  // console.log('maximizeTask')
  // console.log(task)
  // console.log('Hide Main board')
  document.getElementById('mainContainer').style.display = 'none';
  await nextTick()
  //console.log('show maximized panel')
  maximizedTask.value = true;
  await nextTick()
  maximizedTaskRef.value= task
  // console.log('scroll to top')
  await nextTick()
  window.scrollBy(0, 0, "smooth")
}

function closeMaximized(){
  document.getElementById('mainContainer').style.display = 'block';
  maximizedTask.value = false;
}

async function updateAndShowTask(aTask=null){
  if (aTask){
    await updateTask(aTask.idTask)
    showSearchedTask(aTask.idTask)
  }
  else  if (selectedTask.value!=null){
    await updateTask(selectedTask.value.idTask)
    showSearchedTask(selectedTask.value.idTask)
  }
}

uiStore.$subscribe(async (mutation, state) => {
  if (state.task2UpdateState.id > 0) {
    let scroll = window.scrollY
    console.log(`Updating task state ${state.task2UpdateState.id} to ${state.task2UpdateState.state}`)
    //console.log(state)
    let task = allTaskMap.get(state.task2UpdateState.id)
    task.state = state.task2UpdateState.state
    //console.log(task)
    task.updateUIElements()
    triggerRef(boardData)
    if (task.isRoot){
      // let idx = boardData.tasks.findIndex(t => t.idTask === task.idTask)
      // boardData.tasks[idx]= task
      boardData.tasks = BoardTask.rootTasks
      let key = updater.get("root")
      updater.set("root", key+'X')
    }
    else if (task.idEpic){
    //   let tasks= boardData.epicTasks[`epic_${task.idEpic}_tasks`]
    //   let taskIdx = tasks.findIndex(t => t.idTask === task.idTask)
    //   tasks[taskIdx]= task
       let epic = boardData.epics.find((e)=> e.idEpic === task.idEpic)
       epic.uiKey= epic.uiKey + getRandomAlphanumeric()
    }
    else if (task.parentTask){
      let taskIdx = boardData.tasks.findIndex(t => t.idTask === task.parentTaskId)
      let parentTask2= boardData.tasks[taskIdx]
      if (parentTask2){
        // the parent is a root node
        let subTaskIdx = parentTask2.subTasks.findIndex(t => t.idTask === task.idTask)
        boardData.tasks[taskIdx].subTasks[subTaskIdx]= task
        boardData.tasks[taskIdx].subTasks[subTaskIdx].uiKey=
          boardData.tasks[taskIdx].subTasks[subTaskIdx].uiKey + getRandomAlphanumeric()
      }
      else {
        // the parent is not a root node, so, it should belong to an epic
        let parentTask2 = BoardTask.allTasks.find((t)=> t.idTask === task.parentTaskId)
        let epic = boardData.epics.find(e=> e.idEpic === parentTask2.idEpic)
        let tasks= epic.subTasks //boardData.epicTasks[`epic_${epic.idEpic}_tasks`]
        let parentIdx = epic.subTasks.findIndex(t => t.idTask === task.parentTaskId)
        //let childIdx= tasks[parentIdx].subTasks.findIndex(t => t.idTask === task.idTask)
        //tasks[parentIdx].subTasks[childIdx]= task
        tasks[parentIdx].uiKeyContainer= tasks[parentIdx].uiKeyContainer + getRandomAlphanumeric()
      }
    }
    uiStore.setNewState4Task(0, '?')
    setTimeout(`restoreYScroll(${scroll})`, 500)
  }
})

function timerClick(){
  let theTask = allTaskMap.get(maximizedTaskRef.value.idTask);
  theTask.timerClick()
}

function editTask2(){
  let theTask = allTaskMap.get(maximizedTaskRef.value.idTask);
  theTask.editTask()
}

function editEpic2(){
  let theEpic = epicMap.get(maximizedTaskRef.value.idEpic);
  theEpic.editEpic()
}

const maxiProject = computed(() => {
  let result =''
  if (projectMap.has(maximizedTaskRef.value.idProject)){
    let prj = projectMap.get(maximizedTaskRef.value.idProject)
    result= prj.name
  }
  return result
})

const maxiEpic = computed(() => {
  let result = ''
  if (maximizedTaskRef.value.parentTask){
    let pt= maximizedTaskRef.value.parentTask
    if (pt.idEpic){
      let epic = epicMap.get(pt.idEpic)
      result= epic.key
    }
  }
  else if (maximizedTaskRef.value.idEpic){
    let epic = epicMap.get(maximizedTaskRef.value.idEpic)
    result= epic.key
  }
  return result
})

const maxiParentTask = computed(() => {
  let result = ''
  if (maximizedTaskRef.value.idEpic){
    return result
  }
  if (maximizedTaskRef.value.parentTask){
    result = maximizedTaskRef.value.parentTask.key
  }
  else{
    result = maximizedTaskRef.value.key
  }
  return result
})

const maxiSubTask = computed(() => {
  let result = ''
  if (maximizedTaskRef.value.parentTask){
    result = maximizedTaskRef.value.key
  }
  return result
})

</script>

<template>
  <div id="mainContainer" style="position: relative;" >
    <TMKanban id="rootKanban" :key="updater.get('root')" ref="rootKanban"
              :epics="boardData.epics" :tasks="boardData.tasks" :states="boardData.states"
              @toggle-detail="toggleTask" @toggle-epic="toggleEpic" @select="showTask" @maximize="maximizeTask"/>
    <div v-for="epic in boardData.epics" :key="epic.uiKey" >
      <div :style="styleForSuperTask(epic)" v-if="epic.expanded">
        <TMEpicContainer :states="boardData.states" :epic="epic" :id="`epic-container-${epic.idEpic}`"
                         :tasks="epic.subTasks"
                         @toggle-detail="toggleTask"
                         @toggle-epic="toggleEpic" @select="showTask" @maximize="maximizeTask"/>
      </div>
    </div>
    <div v-for="task in boardData.tasks" :key="task.uiKeyContainer" >
      <div :style="styleForSuperTask(task)" v-if="task.expanded && task.hasSubTasks">
        <TMTaskContainer :states="boardData.states" :task="task" :tasks="task.subTasks"
                         :id="`super-task-${task.idTask}`"
                         @toggle-detail="toggleTask" @select="showTask" @maximize="maximizeTask" />
      </div>
    </div>
  </div>
  <div v-if="maximizedTask" class="maxiTask">
    <div class="close-btn">
      <q-btn icon="close" color="red" square size="xs" @click="closeMaximized" />
    </div>
    <tm-task-description :task="maximizedTaskRef" :key="maximizedTaskRef?.uiKey ? maximizedTaskRef.uiKey :'viewMax0'"
                         @task-updated="updateAndShowTask(maximizedTaskRef)">
      <template v-slot:title>
        <h3>
          <q-breadcrumbs>
            <q-breadcrumbs-el :label="maxiProject" icon="work_outline" />
            <q-breadcrumbs-el :label="maxiEpic" icon="img:epic.png" v-if="maxiEpic" />
            <q-breadcrumbs-el :label="maxiParentTask" icon="img:task.png" v-if="maxiParentTask" />
            <q-breadcrumbs-el :label="maxiSubTask" icon="img:subtask.png" v-if="maxiSubTask" />
          </q-breadcrumbs>
          <p style="margin-top: 6px;">
            {{ maximizedTaskRef.title }}{{ maximizedTaskRef.idEpic && !maximizedTaskRef.idTask? maximizedTaskRef.epic:"" }}
          </p>
        </h3>
      </template>
      <template v-slot:actions>
        <br>
        <q-btn @click="timerClick" icon="timer" label="Start Pomodoro" color="primary" v-if="maximizedTaskRef.taskType !== 'epic'" />
        &nbsp;&nbsp;
        <q-btn @click="editTask2" icon="edit" label="Edit Task" color="primary" v-if="maximizedTaskRef.taskType !== 'epic'" />
        <q-btn @click="editEpic2" icon="edit" label="Edit Epic" color="primary" v-if="maximizedTaskRef.taskType === 'epic'" />
      </template>
      <template v-slot:subtasks>
        <div v-if="maximizedTaskRef.idTask">
          <h4 v-if="maximizedTaskRef.hasSubTasks" >SubTasks</h4>
          <TMKanban id="kanbanTask" :key="maximizedTaskRef.uiKey"
                    v-if="maximizedTaskRef.hasSubTasks || maximizedTaskRef.taskType === 'epic'"
                    :tasks="maximizedTaskRef.subTasks" :states="boardData.states"
                    @toggle-detail="toggleTask"  @select="showTask" @maximize="maximizeTask"/>
        </div>
        <div v-if="maximizedTaskRef.idEpic && !maximizedTaskRef.idTask">
          <h4 v-if="maximizedTaskRef.hasSubTasks" >Tasks</h4>
          <TMEpicContainer :states="boardData.states" :epic="maximizedTaskRef"
                           :id="`epic-container-${maximizedTaskRef.idEpic}`"
                           :tasks="maximizedTaskRef.subTasks"
                           @toggle-detail="toggleTask"
                           @toggle-epic="toggleEpic" @select="showTask" @maximize="maximizeTask"/>
        </div>
      </template>
    </tm-task-description>
  </div>
</template>

<style scoped>

div.close-btn{
  position: absolute;
  right: 10px;
  top: 20px;

}

div.maxiTask{
  width: 100%;
  height: 100%;
  padding: 16px;
  position: relative;
}

button.buttonTaskAction3 {
  padding:0;
  margin:0;
  height: 22px;
  color: #707070;
}

</style>

