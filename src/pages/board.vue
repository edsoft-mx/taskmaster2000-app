<script setup>
defineOptions({
  name: 'tm-board'
});
import {ref, reactive, defineProps, watch, inject, computed, onMounted} from 'vue'
import { callApi } from 'src/common'
import { allStates, projectMap, BoardState, BoardProject, BoardEpic, BoardTask, resetData } from 'src/commonObjects'
import TMKanban from "components/tmKanban.vue";
import TMTaskContainer from 'components/tmTaskContainer.vue'
import TMEpicContainer from 'components/tmEpicContainer.vue'

const props = defineProps({
  idBoard: Number,
  showSubTask: Number,
  //showSearchResult: String,
  executeOp: Object,
})

const currentBoardId = inject('currentBoardId')
const leftDrawerOpen = inject('leftDrawerOpen')
const rightDrawerOpen = inject('rightDrawerOpen')
const rightDrawerContent = inject('rightDrawerContent')
const rightDrawerContent2 = inject('rightDrawerContent2')
const rightDrawerHeader = inject('rightDrawerHeader')
const rightDrawerSubtasks = inject('rightDrawerSubtasks')
const headerTitle = inject('headerTitle')
const headerIconShow = inject('headerIconShow')
let dragInitialState = ''
const clickPomodoroTimer = inject('clickPomodoroTimer')
const globalSelectedTask = inject('globalSelectedTask')
const daysWithActivity = inject('daysWithActivity')


const boardData = reactive({
  name: "",
  states: [],
  tasks: [],
  projects: [],
  epics: [],
  stateDisplayLimit: new Map(),
  // projectsMap: new Map(),
  // stateMap: new Map(),
  // stateMapEpics: new Map(),
  // hasSubTasks: false,
  // tasksWithSubTasks: [],
  // allTasksMap: new Map(),
  task2domMap: new Map(),
  epic2domMap: new Map(),
  //epicTasksMap: new Map(),
})

const expandedEpics = computed(() => boardData.epics.filter(t => t.expanded))

const selectedTask = ref(null)
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
  boardData.tasks = []
  boardData.epics = []
  boardData.states= []
  boardData.projects = []
  resetData()
  let taskObjects= []
  let epicObjects= []
  let statesObjects= []
  let projectObjects= []
  currentBoardId.value = props.idBoard
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
  //boardData.states = result.states
  //boardData.hasSubTasks = result.hasSubTasks
  boardData.stateDisplayLimit.clear()
  // boardData.projectsMap.clear()
  // boardData.stateMap.clear()
  // boardData.tasksWithSubTasks = []

  //boardData.allTasksMap.clear()
  headerTitle.value= boardData.name
  headerIconShow.value= false
  // for (let state of boardData.states){
  //   boardData.stateMap.set(state.state, [])
  //   boardData.stateMapEpics.set(state.state, [])
  //   boardData.stateDisplayLimit.set(state.state, 7)
  // }
  // for (let prj of result.projects) {
  //   boardData.projects.push(new BoardProject(prj))
  // }
  // boardData.projects = result.projects
  // for (let prj of boardData.projects){
  //   boardData.projectsMap.set(prj.idProject, prj)
  // }

  selectedTask.value = null
  prevSelectedTask.value = null
  globalSelectedTask.value = null

  //boardData.epicTasksMap.clear()
  boardData.epic2domMap.clear()
  let epics = await apiCallBoardEpics
  for (let epic of epics){
    let epicObject= new BoardEpic(epic)
    epicObjects.push(epicObject)
    //let state_list = boardData.stateMapEpics.get(epic.state)
    //epic.taskType = 'epic'
    //state_list.push(epic)
    //boardData.epicTasksMap.set(epic.idEpic, [])
    boardData.epic2domMap.set(epic.idEpic, `epic-card-${epic.idEpic}`)
  }
  //boardData.epics= epics

  result = await apiCallBoardTasks
  //boardData.tasksWithSubTasks = []
  boardData.task2domMap.clear()
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
    // let state_list = boardData.stateMap.get(task.state)
    // state_list.push(task)
    taskObjects.push(taskObject)
    //boardData.allTasksMap.set(`task-card-${task.idTask}`, task)
    boardData.task2domMap.set(task.idTask, `task-card-${task.idTask}`)
    // if (task.idEpic){
    //   // console.log('A Task with an Epic!')
    //   // console.log(task)
    //   let epicTaskList = boardData.epicTasksMap.get(task.idEpic)
    //   epicTaskList.push(task)
    // }
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
  console.log(`allStates.length = ${allStates.length}`)
  console.log(`Epics.all.length = ${BoardEpic.allEpics.length}`)
  console.log(`Tasks.root.length= ${BoardTask.rootTasks.length}`)
  console.log(allStates)
  boardData.states= statesObjects
  boardData.projects = projectObjects
  boardData.epics = epicObjects
  boardData.tasks = BoardTask.rootTasks
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
        showSearchedTask(newVal.value)
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

function getTasks(state){
  let stateList = boardData.stateMap.get(state.state)
  let tasks_without_epic = stateList.filter(task => task.idEpic == null)
  let epicStateList = boardData.stateMapEpics.get(state.state)
  // console.log(`Tareas para ${state.state}: ${state_list}`)
  return epicStateList.concat(tasks_without_epic)
}

function getEpicTasks(state, epic){
  // console.log('Epic')
  // console.log(epic)
  // console.log('State')
  // console.log(state)
  let result = []
  let tasks4Epic = boardData.epicTasksMap.get(epic.idEpic)
  // console.log('Epic tasks')
  // console.log(tasks4Epic)
  for (let task of tasks4Epic){
    if (task.state === state.state){
      result.push(task)
    }
  }
  return result
}

function getSubTasks(task, state){
  let result = []
  for (let sb of task.subTasks){
    if (sb.state !== state.state){
      continue
    }
    result.push(sb)
  }
  return result
}

function newTask(state, parentTask=null){
  if (parentTask==null){
    window.electronAPI.openTaskPage(`board/${props.idBoard}/task/0/-1`, `state=${state.state}`)
  }
  else {
    window.electronAPI.openTaskPage(`board/${props.idBoard}/task/${parentTask.idTask}/0`, `state=${state.state}`)
  }
}

function newEpic(state){
  window.electronAPI.openEpicPage(`board/${props.idBoard}/epic/0`, `state=${state.state}`)
}

function editEpic(epic){
  window.electronAPI.openEpicPage(`board/${props.idBoard}/epic/${epic.idEpic}`, null)
}

function editTask(task, parentTask=null){
  if (parentTask==null) {
    window.electronAPI.openTaskPage(`board/${props.idBoard}/task/${task.idTask}/-1`, null)
  }
  else{
    window.electronAPI.openTaskPage(`board/${props.idBoard}/task/${parentTask.idTask}/${task.idTask}`, null)
  }
}

function showSearchedTask(taskPath){
  if (taskPath===''){
    return
  }
  console.log(`Locating and showing ${taskPath}`)
  if(!taskPath.includes('.')){
    selectedTask.value = boardData.tasks.find(t => t.idTask === Number(taskPath))
    globalSelectedTask.value = selectedTask.value
    if (document.getElementById(`task-card-${selectedTask.value.idTask}`)==null){
      let state = boardData.states.find(s => s.state === selectedTask.value.state)
      showAll(state)
    }
    setTimeout(`scrollToTask(${selectedTask.value.idTask})`, 500)
  }
  else{
    let parts = taskPath.split('.');
    selectedTask.value = boardData.tasks.find(t => t.idTask === Number(parts[0]))
    globalSelectedTask.value = selectedTask.value
    if (document.getElementById(`task-card-${selectedTask.value.idTask}`)==null){
      let state = boardData.states.find(s => s.state === selectedTask.value.state)
      showAll(state)
    }
    viewSubTask(Number(parts[1]))
  }
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
  let project = projectMap.get(task.idProject)
  rightDrawerHeader.value=`<h3><img class="taskIcon" src="${task.taskType}.png">
    <strong>${task.key}</strong> | ${project.name}<br>${task.title}
    </h3>`
  let subtasksChunk = ''
  if (task.hasSubTasks){
    subtasksChunk = '\n## Pending Subtasks:\n'
    rightDrawerSubtasks.value = task.subTasks.filter(st => !st.endState)
  }
   else {
    rightDrawerSubtasks.value = []
  }
  let taskDescription1 = `

State: \` ${task.state} \`
Priority: ![alt-priority](${task.priority}.svg =24x24) ${task.priority}

`
  if (task.description){
    taskDescription1 += `## Description:

${task.description}

`
  }
  if (task.notes){
    taskDescription1 += `## Notes:

${task.notes}

`
  }
  taskDescription1 += `

## Activity:

`
  //${subtasksChunk}
  rightDrawerContent.value = taskDescription1
  rightDrawerContent2.value = `
Estimated Duration: ${task.estimatedDuration ? task.estimatedDuration : 'n/a'}
Time Spent: ${ task.timeSpent ? task.timeSpent : 'n/a' }
Time Spent Today: ${ task.timeSpentToday ? task.timeSpentToday : 'n/a' }

  ` + subtasksChunk
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
  console.log('y ora?')
}

function showMore(state){
  let number = boardData.stateDisplayLimit.get(state.state)
  boardData.stateDisplayLimit.set(state.state, number + 10)
  console.log(`show ${number + 10} tasks on ${state.state}`)
}

function showAll(state){
  let number = getTasks(state).length
  boardData.stateDisplayLimit.set(state.state,number)
  console.log(`show ${number} tasks on ${state.state}`)
}

function showLess(state){
  let number = boardData.stateDisplayLimit.get(state.state)
  let limit = number -10 > 7 ? number - 10 : 7
  boardData.stateDisplayLimit.set(state.state,limit)
  console.log(`show ${limit} tasks on ${state.state}`)
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

function dragTask(event, task, parentTask){
  //let taskUI = document.getElementById(event.target.id)
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.dropEffect = 'move'
  let data = {id: task.idTask, state: task.state, project: task.idProject}
  if (parentTask){
    data.parentTask = parentTask.idTask
  }
  console.log('drag data')
  console.log(data)
  event.dataTransfer.setData('text/tm2000task', JSON.stringify(data))
  if (parentTask) {
    dragInitialState = `task_${parentTask.idTask}_${task.state.replace(' ','_')}`
  }
  else{
    dragInitialState = `main_${task.state.replace(' ','_')}`
  }
}

function dropTargetIsValid(id, data=null){
  //console.log(`drop1: id != dragInitialState: ${id} != ${dragInitialState}`)
  let differentState = id !== dragInitialState
  if (data){
    let extractor = /(main_|task_\d+_)(.+)/
    let match = extractor.exec(id)
    differentState = data.state.replace(' ','_') !== match[2]
    //console.log(`drop.differentState= ${differentState} = ${data.state.replace(' ','_')} !== ${match[2]}`)
  }
  return (id.startsWith("main_") || id.startsWith("task_")) && differentState
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
    let dropResult = await callApi("POST", `user/boards/${props.idBoard}/tasks/${data.id}/dragged_to`,
        {target: dropTarget.id, idBoard: props.idBoard})
    console.log(dropResult)
    if (dropResult.newParent){
      if (dropResult.from === 0){
        // console.log('before')
        // console.log(boardData.tasks)
        boardData.tasks = copyTaskItems(boardData.tasks, data.id)
        // console.log('after')
        // console.log(boardData.tasks)
        updateTasksState()
      }
      else{
        let idx = boardData.tasksWithSubTasks.findIndex(task => task.idTask === data.parentTask)
        let parentTask = boardData.tasksWithSubTasks[idx]
        parentTask.subTasks = copyTaskItems(parentTask.subTasks, data.id)
        updateParentTask(parentTask)
      }
      if (dropResult.to === 0) {
        boardData.tasks.push(dropResult.task)
        updateTasksState()
      }
      else {
        let idx = boardData.tasksWithSubTasks.findIndex(task => task.idTask === dropResult.to)
        // console.log(`Found parent task ${dropResult.to} at ${idx}`)
        let parentTask = boardData.tasksWithSubTasks[idx]
        // console.log(parentTask)
        parentTask.subTasks.push(dropResult.task)
        updateParentTask(parentTask)
      }
    }
    else {
      if (dropResult.to === 0) {
        let idx = boardData.tasks.findIndex(task => task.idTask === data.id)
        boardData.tasks[idx] = dropResult.task
        updateTasksState()
      }
      else {
        let idxParent = boardData.tasksWithSubTasks.findIndex(task => task.idTask === data.parentTask)
        let idxTask = boardData.tasksWithSubTasks[idxParent].subTasks.findIndex(task => task.idTask === data.id)
        boardData.tasksWithSubTasks[idxParent].subTasks[idxTask] = dropResult.task
        updateParentTask(boardData.tasksWithSubTasks[idxParent])
      }
    }
  }
  dropTarget.style.borderWidth="0px"
  dropTarget.style.borderStyle="solid"
  dropTarget.style.borderColor="black"
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

</script>

<template>
  <div id="mainContainer" style="position: relative;" >
    <TMKanban id="rootKanban" :epics="boardData.epics" :tasks="boardData.tasks" :states="boardData.states"
              @toggle-detail="toggleTask" @toggle-epic="toggleEpic" @select="showTask"/>
    <div v-for="epic in boardData.epics" :key="epic.idEpic" >
      <div :style="styleForSuperTask(epic)" v-if="epic.expanded">
        <TMEpicContainer :states="boardData.states" :epic="epic" :id="`epic-container-${epic.idEpic}`"
                         @toggle-detail="toggleTask"
                         @toggle-epic="toggleEpic" @select="showTask"/>
      </div>
    </div>
    <div v-for="task in boardData.tasks" :key="task.idTask" >
      <div :style="styleForSuperTask(task)" v-if="task.expanded && task.hasSubTasks">
        <TMTaskContainer :states="boardData.states" :task="task" :id="`super-task-${task.idTask}`"
                         @toggle-detail="toggleTask" @select="showTask" />
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

