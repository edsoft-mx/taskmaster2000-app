<script setup>
import TmTaskDescription from 'components/tmTaskDescription.vue'

defineOptions({
  name: 'tm-board',
})
import {
  ref,
  reactive,
  defineProps,
  watch,
  inject,
  computed,
  onMounted,
  onUnmounted,
  //  triggerRef,
  nextTick,
} from 'vue'
import { callApi, store_configuration } from 'src/common'
import {
  projectMap,
  BoardState,
  BoardProject,
  //  BoardEpic,
  BoardTask,
  resetData,
  allTaskMap,
  epicMap,
  taskIndexMap,
} from 'src/commonObjects'
import TMKanban from 'components/tmKanban.vue'
import TMTaskContainer from 'components/tmTaskContainer.vue'
import TMEpicContainer from 'components/tmEpicContainer.vue'
// import { useUISessionStore } from 'stores/ui_state'

const props = defineProps({
  idBoard: Number,
  showSubTask: Number,
  //showSearchResult: String,
  executeOp: Object,
})

// const uiStore = useUISessionStore()
// let previousUIStoreState = {
//   selectedTask: 0,
//   pomodoroSession: 0,
//   pomodoroIndex: 0,
//   task2UpdateState: {id: 0, state: '?'}
// }

const currentBoardId = inject('currentBoardId')
const leftDrawerOpen = inject('leftDrawerOpen')
const filterOutOldFinishedTasks = inject('filterOutOldFinishedTasks')
// TODO: remove rightDrawerHeader, rightDrawerSubtasks, rightDrawerContent, rightDrawerContent2
const rightDrawerOpen = inject('rightDrawerOpen')
// const rightDrawerContent = inject('rightDrawerContent')
// const rightDrawerContent2 = inject('rightDrawerContent2')
// const rightDrawerHeader = inject('rightDrawerHeader')
// const rightDrawerSubtasks = inject('rightDrawerSubtasks')
const headerTitle = inject('headerTitle')
const headerIconShow = inject('headerIconShow')
// let dragInitialState = ''
//const clickPomodoroTimer = inject('clickPomodoroTimer')
const globalSelectedTask = inject('globalSelectedTask')
const daysWithActivity = inject('daysWithActivity')
const maximizedTask = ref(false)
let updatingTaskNumber = 0

const updater = reactive(new Map([['root', 'root_0']]))

const boardData = reactive({
  name: '',
  states: [],
  workItems: [],
  // workItemMapping: new Map(),
  itemHierarchyMapping: new Map(),
  // tasks: [],
  projects: [],
  //epics: [],
  //  epicTasks: {},
  //  task2domMap: new Map(),
  //  epic2domMap: new Map(),
  //epicTasksMap: new Map(),
})

let epicList = computed(() => {
  let epics = []
  for (let item of boardData.workItems) {
    if (item.taskType === 'epic') {
      epics.push(item)
    }
  }
  return epics
})

let taskList = computed(() => {
  let tasks = []
  for (let item of boardData.workItems) {
    if (item.taskType !== 'epic') {
      tasks.push(item)
    }
  }
  return tasks
})

// const expandedEpics = computed(() => boardData.epics.filter(t => t.expanded))

const selectedTask = ref(null)
const maximizedTaskRef = ref(null)
const prevSelectedTask = ref(null)

function updateActivityDate(map, kind, date) {
  let baseDate = date.substring(0, 10).replaceAll('-', '/')
  let state
  if (!map.has(baseDate)) {
    // console.log(`New activity for ${baseDate}`)
    state = {
      start: kind === 'start',
      due: kind === 'due',
    }
    // console.log(state)
  } else {
    state = map.get(baseDate)
    //console.log(`data from ${baseDate}`)
    //console.log(state)
    if (kind === 'start') {
      state.start = true
    }
    if (kind === 'due') {
      state.due = true
    }
  }
  // console.log(`set activity for ${baseDate}`)
  // console.log(state)
  map.set(baseDate, state)
}

function processSubTasks(workItem) {
  //, taskList
  if ('subTasks' in workItem) {
    for (let item of workItem.subTasks) {
      let taskObject = new BoardTask(item)
      allTaskMap.set(item.idTask, taskObject)
      boardData.itemHierarchyMapping.set(taskObject.hierarchy, taskObject.idTask)
      //taskList.push(taskObject)
      processSubTasks(item) //, taskList)
    }
  }
}

async function getData() {
  console.log('(board) get data')
  boardData.workItems = []
  // boardData.tasks = []
  // boardData.epics = []
  boardData.states = []
  boardData.projects = []
  // boardData.epicTasks = {}
  resetData()
  // let taskObjects = []
  // let epicObjects = []
  let statesObjects = []
  let projectObjects = []
  let apiCallBoard = callApi('GET', `user/boards/${props.idBoard}`)
  let apiCallBoardTasks = callApi(
    'GET',
    `user/boards/${props.idBoard}/tasks?` +
      `filterOutOldFinishedTasks=${filterOutOldFinishedTasks.value}`,
  )
  // let apiCallBoardEpics = callApi(
  //   'GET',
  //   `user/boards/${props.idBoard}/epics` +
  //     `?filterOutOldFinishedTasks=${filterOutOldFinishedTasks.value}`,
  // )
  let result = await apiCallBoard
  boardData.name = result.name
  for (let state of result.states) {
    statesObjects.push(new BoardState(state))
  }
  for (let project of result.projects) {
    projectObjects.push(new BoardProject(project))
  }

  headerTitle.value = boardData.name
  headerIconShow.value = false

  selectedTask.value = null
  prevSelectedTask.value = null
  globalSelectedTask.value = null
  // boardData.task2domMap.clear()
  // boardData.epic2domMap.clear()
  allTaskMap.clear()
  let boardTasks = await apiCallBoardTasks
  //let allTasks = []
  // let filteredEpics = new Map()
  //if (result.filtered) {
  // when applying a filter, we're going to hide any epic w/o a filtered task.
  //console.log('filtered tasks')
  let activityMap = new Map()
  console.log('slow 1')
  for (let task of boardTasks.tasks) {
    boardData.itemHierarchyMapping.set(task.hierarchy, task.idTask)
    let taskObject = new BoardTask(task)
    //allTasks.push(taskObject)
    allTaskMap.set(task.idTask, taskObject)
    processSubTasks(task) //, allTasks)
  }
  console.log('slow 2')
  await window.electronAPI.storeOnGlobalCache('board', 'tasks', BoardTask.allTasks)
  await window.electronAPI.storeOnGlobalCache('board', 'tasksMap', allTaskMap)
  console.log('board data stored on global cache')
  //console.log(allTaskMap)
  // console.log('searching for epics')
  // for (let task of result.tasks) {
  //   if (task.taskType === 'epic') {
  //     let epicObject = new BoardEpic(task)
  //     epicObjects.push(epicObject)
  //     boardData.epic2domMap.set(task.idTask, `epic-card-${task.idTask}`)
  //     if (task.subTasks != null && task.subTasks.length > 0) {
  //       for (let epicTask of task.subTasks) {
  //         epicTask.idEpic = task.idTask
  //         let taskObject = setTaskData(epicTask, activityMap)
  //         taskObjects.push(taskObject)
  //       }
  //     }
  //   }
  // if (task.idEpic) {
  //   filteredEpics.set(task.idEpic, true)
  // }
  // }
  // let epics = await apiCallBoardEpics
  // for (let epic of epics) {
  //   if (result.filtered) {
  //     if (!filteredEpics.has(epic.idEpic)) {
  //       continue
  //     }
  //     epic.expanded = true
  //   }

  //updater.set(`epic_${epic.idEpic}`,  `epic_${epic.idEpic}`)
  //}

  // console.log('new activityMap')
  // console.log(result.tasks)
  // for (let task of result.tasks) {
  //   if (task.taskType === 'epic') {
  //     continue
  //   }
  //   if (result.filtered) {
  //     task.expanded = true
  //   }
  //   let taskObject = setTaskData(task, activityMap)
  //   taskObjects.push(taskObject)
  // }
  daysWithActivity.value = activityMap

  leftDrawerOpen.value = false
  // console.log(`allStates.length = ${allStates.length}`)
  // console.log(`Epics.all.length = ${BoardEpic.allEpics.length}`)
  // console.log(`Tasks.root.length= ${BoardTask.rootTasks.length}`)
  // console.log(allStates)
  boardData.states = statesObjects
  boardData.projects = projectObjects
  // boardData.epics = epicObjects
  // boardData.tasks = BoardTask.rootTasks
  boardData.workItems = boardTasks.tasks
  currentBoardId.value = props.idBoard
  maximizedTask.value = false
  closeMaximized()
}

// function styleForEpicTab(epic){
//   let prj = boardData.projectsMap.get(epic.idProject);
//   return `background-color: ${prj.color}`
// }

// function styleForSuperTask(task){
//   let style = ''
//   if (task === selectedTask.value && task.expanded && task.hasSubTasks){
//     let borderWidth = "4px"
//     style = `border: solid ${borderWidth} ${task.color};`
//   }
//   return style
// }

// function styleForEpic(epic){
//   let style = ''
//   let prj = boardData.projectsMap.get(epic.idProject);
//   if (epic === selectedTask.value && epic.expanded){
//     let borderWidth = "4px"
//     style = `border: solid ${borderWidth} ${prj.color};`
//   }
//   return style
// }
//
// function getTaskMouseOutStyle(task){
//   if (task.idTask){
//     return "this.style.borderStyle='solid'"
//   }
//   else {
//     return "this.style.borderStyle='none'"
//   }
// }

watch(
  () => props.idBoard,
  () => {
    getData()
  },
)

watch(
  () => props.showSubTask,
  (newVal) => {
    viewSubTask(newVal)
  },
)

watch(
  () => props.executeOp,
  async (newVal) => {
    if (newVal.op === 'showTask') {
      await showSearchedTask(newVal.value)
    }
    if (newVal.op === 'updateAndShowTask') {
      await updateTask(newVal.value)
      await showSearchedTask(newVal.value)
    } else if (newVal.op === 'refreshData') {
      let scroll = window.scrollY
      await getData()
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
  },
)

// function getStateId(state){
//   return `container_${state.state.replace(' ', '_')}`;
// }

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

async function showSearchedTask(idTask, tryNumber = 1) {
  if (!idTask) {
    return
  }
  console.log('showSearchedTask')
  let task = BoardTask.allTasks.find((t) => t.idTask == idTask)
  if (document.getElementById(`task-card-${idTask}`) != null) {
    //task is visible
    setTimeout(`scrollToTask(${idTask})`, 500)
    if (task != null) {
      showTask(task)
      if (maximizedTask.value) {
        maximizedTaskRef.value = task
      }
    } else {
      console.log(`could not find task ${idTask}`)
    }
  } else {
    console.log('Task is not visible, trying to show it...')
    if (!maximizedTask.value) {
      if (tryNumber === 1) {
        if (task.parentTask && !task.parentTask.expanded) {
          task.parentTask.expanded = true
          if (task.parentTask.idTask && !task.parentTask.epic.expanded) {
            task.parentTask.epic.expanded = true
          }
        }
        if (task.idTask && !task.epic.expanded) {
          task.epic.expanded = true
        }
        await nextTick()
        await showSearchedTask(idTask, 2)
      } else {
        alert('Task is not visible')
      }
    } else {
      maximizedTaskRef.value = task
    }
    // if (task.idTask==null && task.isRoot){
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

function setTaskData(task, activityMap, parentTaskId = null) {
  let taskObject = new BoardTask(task, parentTaskId)
  console.log('setTaskData')
  console.log(taskObject)
  if (task.dueDate) {
    // console.log(`Set ${task.key}.dueDate = ${task.dueDate}`)
    updateActivityDate(activityMap, 'due', task.dueDate)
  }
  if (task.estimatedStartDate) {
    // console.log(`Set ${task.key}.estimatedStartDate = ${task.estimatedStartDate}`)
    updateActivityDate(activityMap, 'start', task.estimatedStartDate)
  }
  //boardData.task2domMap.set(task.idTask, `task-card-${task.idTask}`)
  if (task.hasSubTasks) {
    for (let subTask of task.subTasks) {
      //boardData.allTasksMap.set(`subtask-card-${task.idTask}-${subTask.idTask}`, subTask)
      //boardData.task2domMap.set(subTask.idTask, `task-card-${subTask.idTask}`)
      if (subTask.dueDate) {
        // console.log(`Set ${subTask.key}.dueDate = ${subTask.dueDate}`)
        updateActivityDate(activityMap, 'due', subTask.dueDate)
      }
      if (subTask.estimatedStartDate) {
        // console.log(`Set ${subTask.key}.estimatedStartDate = ${subTask.estimatedStartDate}`)
        updateActivityDate(activityMap, 'start', subTask.estimatedStartDate)
      }
    }
  }
  return taskObject
}

function getParentIdFromHierarchy(hierarchy) {
  console.log('getParentIdFromHierarchy')
  let parentId = null
  let parts = hierarchy.split('.')
  if (parts.length <= 1) {
    return parentId
  }
  let count = parts.length - 1
  let parentPath = ''
  for (let i = 0; i < count; i++) {
    if (parentPath !== '') {
      parentPath += '.'
    }
    parentPath += parts[i]
  }
  console.log('parentPath', parentPath)
  if (boardData.itemHierarchyMapping.has(parentPath)) {
    parentId = boardData.itemHierarchyMapping.get(parentPath)
  } else {
    console.log('parentPath not found')
  }
  console.log(parentId)
  return parentId
}

async function insertTask(idTask) {
  console.log(`Insert task ${idTask}`)
  if (updatingTaskNumber === idTask) {
    console.log(`Already updating task with id ${idTask}`)
    return
  }
  updatingTaskNumber = idTask
  let existingTask = BoardTask.allTasks.find((t) => t.idTask === idTask)
  if (existingTask != null) {
    console.log('Task already exists')
    return
  }
  console.log('Insert Task')
  //let result = true
  let activityMap = daysWithActivity.value
  let currentValues = await callApi('GET', `user/boards/${props.idBoard}/tasks/${idTask}`)
  currentValues.justAdded = true
  console.log(currentValues)
  let taskObject = setTaskData(currentValues, activityMap)
  let parentId = getParentIdFromHierarchy(currentValues.hierarchy)
  if (
    currentValues.hierarchy.includes('.') &&
    // currentValues.hierarchy.startsWith('e') &&
    currentValues.hierarchy.split('.').length - 1 === 1
  ) {
    let epicIdx = boardData.workItems.findIndex((t) => t.idTask == parentId)
    boardData.workItems[epicIdx].subTasks.push(taskObject)
    console.log(`inserted new task ${idTask} into epic or root task ${parentId}`)
  } else if (!currentValues.hierarchy.includes('.')) {
    console.log(`inserted new root task ${idTask}`)
    boardData.workItems.push(taskObject)
  } else if (parentId) {
    console.log(`inserted new task at third level... ${idTask}`)
    taskObject.parentTaskId = parentId
    let parent = allTaskMap.get(parentId)
    let grandParentId = getParentIdFromHierarchy(parent.hierarchy)
    console.log(`inserted new sub-task ${idTask} into parent task ${grandParentId}.${parentId}`)
    let epicIdx = boardData.workItems.findIndex((t) => t.idTask == grandParentId)
    let taskIdx = boardData.workItems[epicIdx].subTasks.findIndex((t) => t.idTask == parentId)
    boardData.workItems[epicIdx].subTasks[taskIdx].subTasks.push(taskObject)
  }
  daysWithActivity.value = activityMap
  updatingTaskNumber = 0
  console.log('finish updateTask.insert')
}

async function updateTask(idTask) {
  if (!idTask) {
    return
  }
  console.log(`updateTask, prev=${updatingTaskNumber}`)
  if (updatingTaskNumber === idTask) {
    console.log(`Already updating task with id ${idTask}`)
    return
  }
  updatingTaskNumber = idTask
  console.log(`Updating task ${idTask}`)
  let task = BoardTask.allTasks.find((t) => t.idTask === idTask)
  console.log(task)
  let currentValues = await callApi('GET', `user/boards/${props.idBoard}/tasks/${idTask}`)
  currentValues.justAdded = true
  // let prevState = task.state
  task.updateData(currentValues)
  if (!task.isRoot) {
    if (task.parentTask == null) {
      console.log("Fixing a possible error due to a missing parent :'(")
      let parentId = getParentIdFromHierarchy(task.hierarchy)
      let parent = allTaskMap.get(parentId)
      task.parentTask = parent
    }
  }
  let hierarchyParts = task.hierarchy.split('.')
  let level0Idx
  let level1Idx
  let idx
  let checkMaximized = []
  switch (hierarchyParts.length) {
    case 1:
      // root task
      checkMaximized.push(task.idTask)
      console.log('This is a root task')
      boardData.workItems = BoardTask.rootTasks.slice()
      await nextTick()
      break
    case 2:
      checkMaximized.push(task.parentTask.idTask)
      checkMaximized.push(task.idTask)
      level0Idx = boardData.workItems.findIndex((t) => t.idTask == task.parentTask.idTask)
      idx = boardData.workItems[level0Idx].subTasks.findIndex((t) => t.idTask == idTask)
      console.log(`${level0Idx}-${idx}`)
      boardData.workItems[level0Idx].subTasks.splice(idx, 1, { ...task, state: task.state })
      console.log(`Updating task @ index ${level0Idx}`)
      await nextTick()
      break
    default:
      checkMaximized.push(task.parentTask.parentTask.idTask)
      checkMaximized.push(task.parentTask.idTask)
      checkMaximized.push(task.idTask)
      level0Idx = boardData.workItems.findIndex(
        (t) => t.idTask == task.parentTask.parentTask.idTask,
      )
      level1Idx = boardData.workItems[level0Idx].subTasks.findIndex(
        (t) => t.idTask == task.parentTask.idTask,
      )
      idx = boardData.workItems[level0Idx].subTasks[level1Idx].subTasks.findIndex(
        (t) => t.idTask == task.idTask,
      )
      boardData.workItems[level0Idx].subTasks[level1Idx].subTasks.splice(idx, 1, {
        ...task,
        state: task.state,
      })
      break
  }
  for (let idMax in checkMaximized) {
    if (maximizedTaskRef.value != null && idMax == maximizedTaskRef.value.idTask) {
      maximizedTaskRef.value = idMax
      await nextTick()
      break
    }
  }

  // if (task.hierarchy.includes('.') && !task.hierarchy.startsWith('e')) {
  //   console.log('This is a subtask, parent is a root task. Trying to force parent task update')
  //   let ptIdx = boardData.workItems.findIndex((t) => t.idTask == task.parentTask.idTask)
  //   let idx = boardData.workItems[ptIdx].subTasks.findIndex((t) => t.idTask == idTask)
  //   console.log(`${ptIdx}-${idx}`)
  //   boardData.workItems[ptIdx].subTasks.splice(idx, 1, { ...task, state: task.state })
  //   console.log(`Updating task @ index ${ptIdx}`)
  //   if (maximizedTaskRef.value != null && task.parentTask.idTask == maximizedTaskRef.value.idTask) {
  //     maximizedTaskRef.value = task.parentTask
  //     await nextTick()
  //   }
  //   await nextTick()
  // } else if (task.isRoot) {
  //   // root task
  //   console.log('This is a root task')
  //   boardData.workItems = BoardTask.rootTasks.slice()
  //   await nextTick()
  // } else if (
  //   task.hierarchy.includes('.') &&
  //   task.hierarchy.startsWith('e') &&
  //   task.hierarchy.split('.').length - 1 === 1
  // ) {
  //   console.log('This is an Epic task, searching parent epic...')
  //   let ptIdx = boardData.workItems.findIndex((t) => t.idTask == task.parentTask.idTask)
  //   let idx = boardData.workItems[ptIdx].subTasks.findIndex((t) => t.idTask == idTask)
  //   console.log(`${ptIdx}-${idx}`)
  //   boardData.workItems[ptIdx].subTasks.splice(idx, 1, { ...task, state: task.state })
  //   console.log(`Updating task @ index ${ptIdx}`)
  //   if (maximizedTaskRef.value != null && task.parentTask.idTask == maximizedTaskRef.value.idTask) {
  //     maximizedTaskRef.value = task.parentTask
  //     await nextTick()
  //   }
  //   await nextTick()
  // } else if (
  //   task.hierarchy.includes('.') &&
  //   task.hierarchy.startsWith('e') &&
  //   task.hierarchy.split('.').length - 1 > 1
  // ) {
  //   console.log(
  //     'This is a subtask, which parent task has an epic',
  //     task.parentTask.parentTask.idTask,
  //   )
  //   let epicIdx = boardData.workItems.findIndex(
  //     (e) => e.idTask == task.parentTask.parentTask.idTask,
  //   )
  //   console.log('found epic', epicIdx)
  //   console.log(boardData.workItems[epicIdx])
  //   let ptaskIdx = boardData.workItems[epicIdx].subTasks.findIndex(
  //     (t) => t.idTask == task.parentTask.idTask,
  //   )
  //   console.log('found parent task', ptaskIdx)
  //   let taskIdx = boardData.workItems[epicIdx].subTasks[ptaskIdx].subTasks.findIndex(
  //     (t) => t.idTask == task.idTask,
  //   )
  //   console.log(boardData.workItems[epicIdx].subTasks[ptaskIdx])
  //   console.log('found parent task', taskIdx)
  //   boardData.workItems[epicIdx].subTasks[ptaskIdx].subTasks.splice(taskIdx, 1, {
  //     ...task,
  //     state: task.state,
  //   })
  // } else {
  //   console.log("don't know which kind of task is this")
  // }
  if (task.idTask === selectedTask.value?.idTask) {
    selectedTask.value = null
    globalSelectedTask.value = null
    await nextTick()
    showTask(task)
  }
  updatingTaskNumber = 0
  console.log('finish updateTask.update')
}

// TODO: reimplement, need to adjust to single root model, instead of relying on idEpic
async function removeTask(idTask) {
  if (!idTask) {
    return
  }
  let task = BoardTask.allTasks.find((t) => t.idTask === idTask)
  console.log(task)
  if (task == null) {
    return
  }
  let hierarchyParts = task.hierarchy.split('.')
  let level0Idx
  let level1Idx
  let idx
  switch (hierarchyParts.length) {
    case 1:
      // root task
      console.log('This is a root task')
      idx = boardData.workItems.findIndex((t) => t.idTask == task.idTask)
      boardData.workItems.splice(idx, 1)
      idx = BoardTask.rootTasks.findIndex((t) => t.idTask === idTask)
      BoardTask.rootTasks.splice(idx, 1)
      break
    case 2:
      level0Idx = boardData.workItems.findIndex((t) => t.idTask == task.parentTask.idTask)
      idx = boardData.workItems[level0Idx].subTasks.findIndex((t) => t.idTask == idTask)
      boardData.workItems[level0Idx].subTasks.splice(idx, 1)
      break
    default:
      level0Idx = boardData.workItems.findIndex(
        (t) => t.idTask == task.parentTask.parentTask.idTask,
      )
      level1Idx = boardData.workItems[level0Idx].subTasks.findIndex(
        (t) => t.idTask == task.parentTask.idTask,
      )
      idx = boardData.workItems[level0Idx].subTasks[level1Idx].subTasks.findIndex(
        (t) => t.idTask == task.idTask,
      )
      boardData.workItems[level0Idx].subTasks[level1Idx].subTasks.splice(idx, 1)
      break
  }
  idx = BoardTask.allTasks.findIndex((t) => t.idTask === idTask)
  BoardTask.allTasks.splice(idx, 1)
  if (taskIndexMap.has(idTask)) {
    taskIndexMap.delete(idTask)
  }

  //   if (task.hierarchy.includes('.') && !task.hierarchy.startsWith('e')) {
  //     console.log('This is a subtask, parent is a root task.')
  //     let ptIdx = boardData.workItems.findIndex((t) => t.idTask == task.parentTask.idTask)
  //     let tIdx = boardData.workItems[ptIdx].subTasks.findIndex((t) => t.idTask == task.idTask)
  //     boardData.workItems[ptIdx].subTasks.splice(tIdx, 1)
  //     console.log(`Updating task @ index ${ptIdx}`)
  //     await nextTick()
  //   } else if (task.isRoot) {
  //     console.log('This is a root task')
  //     let tIdx = boardData.workItems.findIndex((t) => t.idTask == task.idTask)
  //     boardData.workItems.splice(tIdx, 1)
  //     await nextTick()
  //   } else if (task.parentTask == null && task.idEpic != null && !task.isRoot) {
  //     console.log('This is an Epic task, searching parent epic...')
  //     let epic = boardData.epics.find((e) => e.idEpic === task.idEpic)
  //     console.log('found epic')
  //     console.log(epic)
  //     let tIdx = epic.subTasks.findIndex((t) => t.idTask == task.idTask)
  //     epic.subTasks.splice(tIdx, 1)
  //     await nextTick()
  //   } else if (task.parentTask != null && task.parentTask.idEpic != null && !task.isRoot) {
  //     console.log('This is a subtask, which parent task has an epic')
  //     let epic = boardData.epics.find((e) => e.idEpic === task.parentTask.idEpic)
  //     console.log('found epic', epic)
  //     let ptask = epic.subTasks.find((t) => t.idTask == task.parentTask.idTask)
  //     console.log('found parent task', ptask)
  //     let tIdx = ptask.subTasks.findIndex((t) => t.idTask == task.idTask)
  //     ptask.subTasks.splice(tIdx, 1)
  //   } else {
  //     console.log("don't know which kind of task is this")
  //   }
  //   if (task.idTask === selectedTask.value?.idTask) {
  //     selectedTask.value = null
  //     globalSelectedTask.value = null
  //     await nextTick()
  //   }
  //   let taskIdx = BoardTask.allTasks.findIndex((t) => t.idTask === idTask)
  //   BoardTask.allTasks.splice(taskIdx, 1)
  //   console.log('finish updateTask.delete')
  // }
}

//TODO: reimplement, it depends on deprecated idEpic
function viewSubTask(subTask) {
  console.log('viewSubTask')
  console.log(subTask)
  if (selectedTask.value.idEpic) {
    selectedTask.value.expanded = true
    setTimeout(`scrollToEpic(${selectedTask.value.idEpic})`, 500)
    let tasks = boardData.epicTasksMap.get(selectedTask.value.idEpic)
    let subtaskPointer = tasks.find((st) => st.idTask === subTask)
    selectedTask.value = subtaskPointer
    globalSelectedTask.value = selectedTask.value
    showTask(subtaskPointer)
    return
  }
  selectedTask.value.expanded = true
  setTimeout(`scrollToTask(${selectedTask.value.idTask})`, 500)
  //scrollToTask(selectedTask.value.idTask)
  let subtaskPointer = selectedTask.value.subTasks.find((st) => st.idTask === subTask)
  selectedTask.value = subtaskPointer
  globalSelectedTask.value = selectedTask.value
  showTask(subtaskPointer)
}

function addClassToTask(task, classTask) {
  let el
  if (task.taskType !== 'epic') {
    el = document.getElementById(`task-card-${task.idTask}`)
  } else {
    el = document.getElementById(`epic-card-${task.idTask}`)
  }
  if (el != null) {
    el.classList.add(classTask)
  }
}

function removeClassFromTask(task, classTask) {
  let el
  if (task.taskType !== 'epic') {
    el = document.getElementById(`task-card-${task.idTask}`)
  } else {
    el = document.getElementById(`epic-card-${task.idTask}`)
  }
  if (el != null) {
    el.classList.remove(classTask)
  }
}

function showTask(task, openRightDrawer = true) {
  // console.log('showTask')
  // console.log(task)
  if (openRightDrawer) {
    rightDrawerOpen.value = true
  }
  if (prevSelectedTask.value && prevSelectedTask.value != task) {
    removeClassFromTask(prevSelectedTask.value, 'selectedTask')
  }
  selectedTask.value = task
  globalSelectedTask.value = selectedTask.value
  addClassToTask(task, 'selectedTask')
  prevSelectedTask.value = task
}

async function toggleTask(task) {
  task.expanded = !task.expanded
  let data = { expanded: task.expanded, idBoard: props.idBoard }
  await callApi('POST', `user/tasks/${task.idTask}`, data)
  if (task.expanded) {
    //if (task.hasSubTasks && task.expanded) {
    setTimeout(`scrollToTask(${task.idTask})`, 500)
    //}
  }
}

async function goToParent(task) {
  setTimeout(`scrollToTask(${task.idTask}, true)`, 500)
  showTask(task)
}

async function goToSuperTask(task) {
  //let data = {expanded: task.expanded, idBoard: props.idBoard}
  if (task.expanded) {
    setTimeout(`scrollToTask(${task.idTask})`, 500)
  }
  showTask(task)
}

async function toggleEpic(epic) {
  // let idx = boardData.epics.indexOf(epic)
  epic.expanded = !epic.expanded
  //boardData.epics[idx].expanded = !boardData.epics[epic].expanded
  console.log('toggleEpic')
  console.log(epic)
  let data = { expanded: epic.expanded, idBoard: props.idBoard, idProject: epic.idProject }
  await callApi('POST', `user/epics/${epic.idTask}`, data)
  if (epic.expanded) {
    //if (task.hasSubTasks && task.expanded) {
    setTimeout(`scrollToEpic(${epic.idTask})`, 500)
    //}
  }
}

async function goToEpicDetail(epic) {
  // let idx = boardData.epics.indexOf(epic)
  setTimeout(`scrollToEpic(${epic.idTask})`, 500)
}

async function goToEpicParent(epic) {
  // let idx = boardData.epics.indexOf(epic)
  setTimeout(`scrollToEpic(${epic.idTask}, true)`, 500)
}

window.electronAPI.onRefresh(async () => {
  let scroll = window.scrollY
  console.log(scroll)
  await getData()
  window.scroll(0, scroll)
  console.log(window.scrollY)
})

window.electronAPI.onTaskUpdate(async (idTask, idProject, op) => {
  console.log(`got signal of an updated/inserted/moved task: ${idTask}`)
  if (idProject > 0) {
    let pIdx = boardData.projects.findIndex((p) => p.idProject === idProject)
    if (pIdx < 0) {
      console.log(`Project ${idProject} not found on this board`)
      return
    }
  }
  if (op === 'INSERT') {
    await insertTask(idTask)
  } else if (op === 'DELETE') {
    console.log('Not implemented yet')
  } else if (op === 'MOVE') {
    console.log('Moving...')
    await removeTask(idTask)
    console.log('Removed...')
    await insertTask(idTask)
  } else {
    await updateTask(idTask)
  }
})

// //TODO: refactor, get rid of idEpic, epic2domMap logic
// window.electronAPI.onEpicUpdate(async (idEpic, idProject, op) => {
//   console.log(`got signal of an updated/inserted epic: ${idEpic}`)
//   if (idProject > 0) {
//     let pIdx = boardData.projects.findIndex((p) => p.idProject === idProject)
//     if (pIdx < 0) {
//       console.log(`Project ${idProject} not found on this board`)
//       return
//     }
//   }
//   let currentValues = await callApi('GET', `user/boards/${props.idBoard}/epics/${idEpic}`)
//   currentValues.justAdded = true
//   if (op === 'INSERT') {
//     console.log('Epic inserted: Not implemented yet')
//     currentValues.expanded = true
//     let epicObject = new BoardEpic(currentValues)
//     let epicObjects = boardData.epics
//     epicObjects.push(epicObject)
//     boardData.epic2domMap.set(currentValues.idEpic, `epic-card-${currentValues.idEpic}`)
//     boardData.epics = epicObjects
//   } else if (op === 'DELETE') {
//     console.log('Not implemented yet')
//   } else {
//     console.log('Epic updated: Not implemented yet')
//     let pIdx = boardData.epics.findIndex((e) => e.idEpic === idEpic)
//     let epic = boardData.epics[pIdx]
//     epic.description = currentValues.description
//     epic.epic = currentValues.epic
//     epic.priority = currentValues.priority
//     epic.state = currentValues.state
//     boardData.epics[pIdx] = epic
//   }
// })

onUnmounted(async () => {
  console.log('board.unmounted')
})

onMounted(async () => {
  console.log('board.mounted')
  let config = await window.electronAPI.getConfiguration()
  if (config) {
    console.log('Loaded configuration')
    //console.log(config)
    if (!config) {
      return
    }
    store_configuration(config)
  }
  await getData()
  document.addEventListener('click', async (event) => {
    // Check if the clicked element or any of its parent elements is an <a> tag
    let target = event.target
    while (target && target.tagName !== 'A') {
      target = target.parentNode
    }

    // If a link was clicked
    //console.log(target.classList)
    if (
      target &&
      target.tagName === 'A' &&
      target.href &&
      target.classList?.contains('externalLink')
    ) {
      // Prevent the default behavior of the link
      event.preventDefault()
      if (event.ctrlKey) {
        await navigator.clipboard.writeText(target.href)
        window.electronAPI.notifyMessage(event, `Link ${target.href} was copied to the clipboard`)
      } else {
        // Open the URL in the default browser
        window.electronAPI.openExternalLink(event, target.href)
      }
      //const url = new URL(urlString);
      //const domain = url.origin;
    }
  })
})

// function getRandomAlphanumeric() {
//   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
//   const randomIndex = Math.floor(Math.random() * characters.length)
//   return characters.charAt(randomIndex)
// }

async function maximizeTask(task) {
  // console.log('maximizeTask')
  // console.log(task)
  // console.log('Hide Main board')
  document.getElementById('mainContainer').style.display = 'none'
  await nextTick()
  //console.log('show maximized panel')
  maximizedTask.value = true
  await nextTick()
  maximizedTaskRef.value = task
  // console.log('scroll to top')
  await nextTick()
  window.scrollBy(0, 0, 'smooth')
}

function closeMaximized() {
  let panel = document.getElementById('mainContainer')
  if (panel != null) {
    panel.style.display = 'block'
  }
  maximizedTask.value = false
}

async function updateAndShowTask(aTask = null) {
  if (aTask) {
    await updateTask(aTask.idTask)
    showSearchedTask(aTask.idTask)
  } else if (selectedTask.value != null) {
    await updateTask(selectedTask.value.idTask)
    showSearchedTask(selectedTask.value.idTask)
  }
}

// uiStore.$subscribe(async (mutation, state) => {
//   // console.log('skipping old drag & drop state updater')
//   // return
//   if (state.task2UpdateState.id > 0) {
//     console.log('uiStore.$subscribe')
//     if (updatingTaskNumber === state.task2UpdateState.id) {
//       console.log(`Already updating task with id ${state.task2UpdateState.id}`)
//       return
//     }
//     updatingTaskNumber = state.task2UpdateState.id
//     let scroll = window.scrollY
//     console.log(
//       `Updating task state ${state.task2UpdateState.id} to ${state.task2UpdateState.state}`,
//     )
//     //console.log(state)
//     let task = allTaskMap.get(state.task2UpdateState.id)
//     task.state = state.task2UpdateState.state
//     //console.log(task)
//     task.updateUIElements()
//     triggerRef(boardData)
//     if (task.isRoot) {
//       // let idx = boardData.tasks.findIndex(t => t.idTask === task.idTask)
//       // boardData.tasks[idx]= task
//       boardData.tasks = BoardTask.rootTasks
//       let key = updater.get('root')
//       updater.set('root', key + 'X')
//     } else if (task.idEpic) {
//       //   let tasks= boardData.epicTasks[`epic_${task.idEpic}_tasks`]
//       //   let taskIdx = tasks.findIndex(t => t.idTask === task.idTask)
//       //   tasks[taskIdx]= task
//       let epic = boardData.epics.find((e) => e.idEpic === task.idEpic)
//       epic.uiKey = epic.uiKey + getRandomAlphanumeric()
//     } else if (task.parentTask) {
//       let taskIdx = boardData.tasks.findIndex((t) => t.idTask === task.parentTaskId)
//       let parentTask2 = boardData.tasks[taskIdx]
//       if (parentTask2) {
//         // the parent is a root node
//         let subTaskIdx = parentTask2.subTasks.findIndex((t) => t.idTask === task.idTask)
//         boardData.tasks[taskIdx].subTasks[subTaskIdx] = task
//         boardData.tasks[taskIdx].subTasks[subTaskIdx].uiKey =
//           boardData.tasks[taskIdx].subTasks[subTaskIdx].uiKey + getRandomAlphanumeric()
//       } else {
//         // the parent is not a root node, so, it should belong to an epic
//         let parentTask2 = BoardTask.allTasks.find((t) => t.idTask === task.parentTaskId)
//         let epic = boardData.epics.find((e) => e.idEpic === parentTask2.idEpic)
//         let tasks = epic.subTasks //boardData.epicTasks[`epic_${epic.idEpic}_tasks`]
//         let parentIdx = epic.subTasks.findIndex((t) => t.idTask === task.parentTaskId)
//         //let childIdx= tasks[parentIdx].subTasks.findIndex(t => t.idTask === task.idTask)
//         //tasks[parentIdx].subTasks[childIdx]= task
//         tasks[parentIdx].uiKeyContainer = tasks[parentIdx].uiKeyContainer + getRandomAlphanumeric()
//       }
//     }
//     uiStore.setNewState4Task(0, '?')
//     setTimeout(`restoreYScroll(${scroll})`, 500)
//     updatingTaskNumber = 0
//     console.log('finish uiStore.$subscribe')
//   }
// })

function timerClick() {
  let theTask = allTaskMap.get(maximizedTaskRef.value.idTask)
  theTask.timerClick()
}

function editTask2() {
  let theTask = allTaskMap.get(maximizedTaskRef.value.idTask)
  theTask.editTask()
}

function editEpic2() {
  let theEpic = epicMap.get(maximizedTaskRef.value.idTask)
  theEpic.editEpic()
}

const maxiProject = computed(() => {
  let result = ''
  if (projectMap.has(maximizedTaskRef.value.idProject)) {
    let prj = projectMap.get(maximizedTaskRef.value.idProject)
    result = prj.name
  }
  return result
})

const maxiEpic = computed(() => {
  let result = ''
  if (maximizedTaskRef.value.parentTask) {
    let pt = maximizedTaskRef.value.parentTask
    if (pt.idTask) {
      let epic = epicMap.get(pt.idTask)
      result = epic.key
    }
  } else if (maximizedTaskRef.value.idTask) {
    let epic = epicMap.get(maximizedTaskRef.value.idTask)
    result = epic.key
  }
  return result
})

const maxiParentTask = computed(() => {
  let result = ''
  if (maximizedTaskRef.value.idTask) {
    return result
  }
  if (maximizedTaskRef.value.parentTask) {
    result = maximizedTaskRef.value.parentTask.key
  } else {
    result = maximizedTaskRef.value.key
  }
  return result
})

const maxiSubTask = computed(() => {
  let result = ''
  if (maximizedTaskRef.value.parentTask) {
    result = maximizedTaskRef.value.key
  }
  return result
})
</script>

<template>
  <div id="mainContainer" class="boardMainContainer">
    <TMKanban
      idPrefix="main"
      :key="updater.get('root')"
      ref="rootKanban"
      :id-board="props.idBoard"
      :epics="epicList"
      :tasks="taskList"
      :states="boardData.states"
      @go-to-detail="goToSuperTask"
      @toggle-detail="toggleTask"
      @go-to-detail-epic="goToEpicDetail"
      @toggle-epic="toggleEpic"
      @select="showTask"
      @maximize="maximizeTask"
    />
    <div v-for="epic in epicList" :key="epic.uiKey">
      <div v-if="epic.expanded">
        <TMEpicContainer
          :states="boardData.states"
          :epic="epic"
          :id="`epic-container-${epic.idTask}`"
          :tasks="epic.subTasks"
          :id-board="props.idBoard"
          @toggle-detail="toggleTask"
          @go-to-parent-epic="goToEpicParent"
          @go-to-detail="goToSuperTask"
          @go-to-parent="goToParent"
          @toggle-epic="toggleEpic"
          @select="showTask"
          @maximize="maximizeTask"
        />
      </div>
    </div>
    <div v-for="task in taskList" :key="task.uiKeyContainer">
      <div v-if="task.expanded && task.hasSubTasks">
        <TMTaskContainer
          :states="boardData.states"
          :task="task"
          :tasks="task.subTasks"
          :id="`super-task-${task.idTask}`"
          :id-board="props.idBoard"
          @go-to-parent="goToParent"
          @toggle-detail="toggleTask"
          @select="showTask"
          @maximize="maximizeTask"
        />
      </div>
    </div>
  </div>
  <div v-if="maximizedTask" class="maxiTask">
    <div class="close-btn">
      <q-btn icon="close" color="red" square size="xs" @click="closeMaximized" />
    </div>
    <tm-task-description
      :task="maximizedTaskRef"
      :key="maximizedTaskRef?.uiKey ? maximizedTaskRef.uiKey : 'viewMax0'"
      @task-updated="updateAndShowTask(maximizedTaskRef)"
    >
      <template v-slot:title>
        <h3>
          <q-breadcrumbs>
            <q-breadcrumbs-el :label="maxiProject" icon="work_outline" />
            <q-breadcrumbs-el :label="maxiEpic" icon="img:epic.png" v-if="maxiEpic" />
            <q-breadcrumbs-el :label="maxiParentTask" icon="img:task.png" v-if="maxiParentTask" />
            <q-breadcrumbs-el :label="maxiSubTask" icon="img:subtask.png" v-if="maxiSubTask" />
          </q-breadcrumbs>
          <p style="margin-top: 6px">
            {{ maximizedTaskRef.title
            }}{{ maximizedTaskRef.idTask && !maximizedTaskRef.idTask ? maximizedTaskRef.epic : '' }}
          </p>
        </h3>
      </template>
      <template v-slot:actions>
        <br />
        <q-btn
          @click="timerClick"
          icon="timer"
          label="Start Pomodoro"
          color="primary"
          v-if="maximizedTaskRef.taskType !== 'epic'"
        />
        &nbsp;&nbsp;
        <q-btn
          @click="editTask2"
          icon="edit"
          label="Edit Task"
          color="primary"
          v-if="maximizedTaskRef.taskType !== 'epic'"
        />
        <q-btn
          @click="editEpic2"
          icon="edit"
          label="Edit Epic"
          color="primary"
          v-if="maximizedTaskRef.taskType === 'epic'"
        />
      </template>
      <template v-slot:subtasks>
        <div v-if="maximizedTaskRef.idTask">
          <h4 v-if="maximizedTaskRef.hasSubTasks">SubTasks</h4>
          <TMKanban
            id="kanbanTask"
            :key="maximizedTaskRef.uiKey"
            :idPrefix="`task_${maximizedTaskRef.idTask}`"
            :id-board="props.idBoard"
            v-if="maximizedTaskRef.hasSubTasks || maximizedTaskRef.taskType === 'epic'"
            :tasks="maximizedTaskRef.subTasks"
            :states="boardData.states"
            @toggle-detail="toggleTask"
            @select="showTask"
            @maximize="maximizeTask"
          />
        </div>
        <div v-if="maximizedTaskRef.idTask && !maximizedTaskRef.idTask">
          <h4 v-if="maximizedTaskRef.hasSubTasks">Tasks</h4>
          <TMEpicContainer
            :states="boardData.states"
            :epic="maximizedTaskRef"
            :id="`epic-container-${maximizedTaskRef.idTask}`"
            :tasks="maximizedTaskRef.subTasks"
            @toggle-detail="toggleTask"
            @toggle-epic="toggleEpic"
            @select="showTask"
            @maximize="maximizeTask"
          />
        </div>
      </template>
    </tm-task-description>
  </div>
</template>

<style scoped>
div.boardMainContainer {
  position: relative;
}

div.close-btn {
  position: absolute;
  right: 10px;
  top: 20px;
}

div.maxiTask {
  width: 100%;
  height: 100%;
  padding: 16px;
  position: relative;
}

button.buttonTaskAction3 {
  padding: 0;
  margin: 0;
  height: 22px;
  color: #707070;
}
</style>
