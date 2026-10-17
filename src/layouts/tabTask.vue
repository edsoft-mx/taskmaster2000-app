<script setup>
import TMTaskContainer from 'components/tmTaskContainer.vue'

defineOptions({
  name: 'tm-tab-task',
})

import {
  ref,
  // reactive,
  //defineProps,
  // watch,
  // inject,
  // computed,
  onMounted,
  reactive,
  //inject,
  provide,
  //defineProps,
  // onUnmounted,
  //  triggerRef,
  // nextTick,
} from 'vue'
import { aLinkInterceptor, callApi, store_configuration } from 'src/common.js'
import TmTaskDescription from 'components/tmTaskDescription.vue'
import TMKanban from 'components/tmKanban.vue'
//import TMEpicContainer from 'components/tmEpicContainer.vue'
import { BoardTask, BoardProject } from 'src/commonObjects.js'

const maximizedTaskRef = ref(null)
let idBoard = ref(null)
//let idTask = ref(null)
let maxiProject = ref(null)
let maxiEpic = ref(null)
let maxiParentTask = ref(null)
let maxiSubTask = ref(null)
let theTask = null

const boardData = reactive({
  name: '',
  states: [],
  projects: [],
  projectsMap: new Map(),
  // stateMap: new Map(),
  // hasSubTasks: false,
})

const boardProjects = ref([])
const boardStates = ref([])
let selectedTask = ref(null)
let prevSelectedTask = ref()
provide('globalSelectedTask', selectedTask)

function searchParam(key) {
  let sp = new URLSearchParams(location.search)
  //console.log(sp)
  return sp.get(key)
}

function updateAndShowTask() {}

onMounted(async () => {
  console.log('tabTask.mounted')
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
    let cancel = await aLinkInterceptor(event, idBoard.value)
    if (cancel) {
      event.preventDefault()
    }
  })
})

async function getData() {
  let idTask = searchParam('idTask')
  let idBoard_ = searchParam('idBoard')

  let apiCallBoard = callApi('GET', `user/boards/${idBoard_}`)
  let parentBoardData = await apiCallBoard
  boardData.name = parentBoardData.name
  boardData.states = parentBoardData.states

  for (let state of boardData.states) {
    boardStates.value.push({ label: state.state, value: state.state })
  }
  //dummy()
  boardData.projectsMap.clear()
  boardData.projects = parentBoardData.projects
  boardProjects.value = []
  for (let prj of boardData.projects) {
    boardProjects.value.push({
      label: prj.name,
      value: prj.idProject,
    })
    boardData.projectsMap.set(prj.idProject, prj)
    let _ = new BoardProject(prj)
  }

  let taskInfo = await callApi('GET', `user/boards/${idBoard_}/tasks/${idTask}`)
  let parentTasks = await callApi('GET', `user/boards/${idBoard_}/hierarchy/${taskInfo.hierarchy}`)
  parentTasks.splice(parentTasks.length - 1, 1)
  maxiProject.value = boardData.projectsMap.get(taskInfo.idProject).name
  for (let parent of parentTasks) {
    console.log(parent.taskType)
    if (parent.taskType === 'epic') {
      maxiEpic.value = parent.key
    }
    if (parent.taskType === 'task') {
      maxiParentTask.value = parent.key
    }
  }
  console.log(taskInfo)
  switch (taskInfo.taskType) {
    case 'epic':
      maxiEpic.value = taskInfo.key
      break
    case 'task':
      maxiParentTask.value = taskInfo.key
      break
    case 'subtask':
      maxiSubTask.value = taskInfo.key
      break
  }
  maximizedTaskRef.value = taskInfo
  idBoard.value = idBoard_
  theTask = new BoardTask(taskInfo)
  window.electronAPI.boardLoaded(taskInfo.key)
  // selectedTask.value = maximizedTaskRef
}

function timerClick() {
  theTask.timerClick()
}

function editTask2() {
  theTask.editTask()
}

async function toggleTask(task) {
  task.expanded = !task.expanded
  if (task.expanded) {
    //if (task.hasSubTasks && task.expanded) {
    setTimeout(`scrollToTask(${task.idTask})`, 500)
    //}
  }
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

function showTask(task, _ = true) {
  // console.log('showTask')
  // console.log(task)
  // if (openRightDrawer) {
  //   rightDrawerOpen.value = true
  // }
  if (prevSelectedTask.value && prevSelectedTask.value != task) {
    removeClassFromTask(prevSelectedTask.value, 'selectedTask')
  }
  selectedTask.value = task
  addClassToTask(task, 'selectedTask')
  prevSelectedTask.value = task
}

async function goToSuperTask(task) {
  //let data = {expanded: task.expanded, idBoard: props.idBoard}
  if (task.expanded) {
    setTimeout(`scrollToTask(${task.idTask})`, 500)
  }
  showTask(task)
}

async function goToParent(task) {
  setTimeout(`scrollToTask(${task.idTask}, true)`, 500)
  showTask(task)
}

window.electronAPI.onRefresh(async () => {
  let scroll = window.scrollY
  console.log(scroll)
  await getData()
  window.scroll(0, scroll)
  console.log(window.scrollY)
})

window.electronAPI.onTaskUpdate(async (_idTask, _idProject, _op) => {
  let scroll = window.scrollY
  console.log(scroll)
  await getData()
  window.scroll(0, scroll)
  console.log(window.scrollY)
  //TODO: implementar
  // console.log(`got signal of an updated/inserted/moved task: ${idTask}`)
  // if (idProject > 0) {
  //   let pIdx = boardData.projects.findIndex((p) => p.idProject === idProject)
  //   if (pIdx < 0) {
  //     console.log(`Project ${idProject} not found on this board`)
  //     return
  //   }
  // }
  // if (op === 'INSERT') {
  //   await insertTask(idTask)
  // } else if (op === 'DELETE') {
  //   console.log('Not implemented yet')
  // } else if (op === 'MOVE') {
  //   console.log('Moving...')
  //   await removeTask(idTask)
  //   console.log('Removed...')
  //   await insertTask(idTask)
  // } else {
  //   await updateTask(idTask)
  // }
})

async function maximizeTask(task) {
  window.electronAPI.openTaskInTab(task.idTask, task.key, idBoard.value)
}
</script>

<template>
  <div class="maxiTask">
    <tm-task-description
      :task="maximizedTaskRef"
      :key="maximizedTaskRef?.uiKey ? maximizedTaskRef.uiKey : 'viewMax0'"
      @task-updated="updateAndShowTask()"
    >
      <template v-slot:title>
        <h3>
          <q-breadcrumbs>
            <q-breadcrumbs-el :label="maxiProject" icon="work_outline" />
            <q-breadcrumbs-el :label="maxiEpic" icon="img:epic.png" v-if="maxiEpic" />
            <q-breadcrumbs-el :label="maxiParentTask" icon="img:task.png" v-if="maxiParentTask" />
            <q-breadcrumbs-el :label="maxiSubTask" icon="img:subtask.png" v-if="maxiSubTask" />
          </q-breadcrumbs>
          <div style="margin-top: 12px">
            {{ maximizedTaskRef.title }}
            {{ maximizedTaskRef.idTask && !maximizedTaskRef.idTask ? maximizedTaskRef.epic : '' }}
          </div>
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
          @click="editTask2"
          icon="edit"
          label="Edit Epic"
          color="primary"
          v-if="maximizedTaskRef.taskType === 'epic'"
        />
      </template>
      <template v-slot:subtasks>
        <div v-if="maximizedTaskRef.idTask">
          <h4 v-if="maximizedTaskRef.hasSubTasks">SubTasks</h4>
          <div class="flexKanban">
            <div class="subtasksContainer">
              <TMKanban
                id="kanbanTask"
                :key="maximizedTaskRef.uiKey"
                :idPrefix="`task_${maximizedTaskRef.idTask}`"
                :id-board="idBoard"
                v-if="maximizedTaskRef.hasSubTasks || maximizedTaskRef.taskType === 'epic'"
                :tasks="maximizedTaskRef.subTasks"
                :states="boardData.states"
                @toggle-detail="toggleTask"
                @select="showTask"
                @maximize="maximizeTask"
                @go-to-detail="goToSuperTask"
              />

              <div
                v-for="task in maximizedTaskRef.subTasks"
                :key="task.uiKeyContainer"
                class="subtasks"
              >
                <div v-if="task.expanded && task.hasSubTasks">
                  <TMTaskContainer
                    :states="boardData.states"
                    :task="task"
                    :tasks="task.subTasks"
                    :id="`super-task-${task.idTask}`"
                    :id-board="idBoard"
                    @go-to-parent="goToParent"
                    @toggle-detail="toggleTask"
                    @select="showTask"
                    @maximize="maximizeTask"
                  />
                </div>
              </div>
            </div>
            <div class="taskView" v-if="selectedTask != null">
              <div class="taskViewScroller">
                <tm-task-description
                  :task="selectedTask"
                  :key="selectedTask?.uiKey ? selectedTask.uiKey : 'view0'"
                  @task-updated="updateAndShowTask(selectedTask)"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </tm-task-description>
  </div>
</template>

<style scoped>
div.maxiTask {
  margin: 8px;
}
div.flexKanban {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}
div.flexKanban > div.subtasksContainer {
  display: flex;
  flex-direction: column;
  flex: 0 0 75%;
  width: 75%;
  box-sizing: border-box;
}
div.subtasks {
  margin-left: 32px;
  margin-right: 32px;
}
div.flexKanban > div.taskView {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}
div.taskViewScroller {
  position: sticky;
  top: 8px;
  max-height: calc(100vh - 16px);
  overflow-y: auto;
}
</style>
