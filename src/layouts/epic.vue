<script setup>
defineOptions({
  name: 'tm-epic'
});
import { ref, reactive, defineProps, watch, inject, computed, onMounted } from 'vue'
import {callApi, store_configuration} from 'src/common'

const props = defineProps({
  idBoard: Number,
  idEpic: Number,
  initialState: String,
})

const isNewEpic = computed(() => {
  return props.idEpic == 0
})

const boardData = reactive({
  name: "",
  states: [],
  projects: [],
  projectsMap: new Map(),
  // stateMap: new Map(),
  // hasSubTasks: false,
})

const formData = reactive({
  idEpic: 0,
  epic: "",
  description: "",
  priority: "normal",
  project: 0,
  lookupProjects: [],
  state: "",
  tasks: [],
  inEdition: false,
  newTaskTitle: "",
  epicRef: null,
})

const formOp = ref("")

const boardProjects = ref([])
const boardStates = ref([])
const taskPriorities = [
  {label: "Normal", value: "normal"},
  {label: "Low", value: "low"},
  {label: "Medium", value: "medium"},
  {label: "High", value: "high"},
  {label: "Critical", value: "critical"},
]

function searchParam(key) {
  let sp=new URLSearchParams(location.search)
  console.log(sp)
  return sp.get(key)
}

async function getData(){
  let apiCallBoard = callApi('GET', `user/boards/${props.idBoard}`)
  let result = await apiCallBoard
  boardData.name= result.name
  boardData.states = result.states

  //let sel = document.getElementById('selTaskType')
  for (let state of boardData.states){
    // boardData.stateMap.set(state.state, [])
    boardStates.value.push({label: state.state, value: state.state} )
  }
  boardData.projectsMap.clear()
  boardData.projects = result.projects
  boardProjects.value = []
  for (let prj of boardData.projects){
    boardProjects.value.push({
      label: prj.name,
      value: prj.idProject
    })
    boardData.projectsMap.set(prj.idProject, prj)
  }

  let title
  if (isNewEpic.value) {
    console.log('New epic')
    formData.project = boardProjects.value[0]
    title = "New epic"
    formData.state = searchParam('state')
    formData.priority = taskPriorities.find(tp => tp.label === "Normal")
  }
  else {
    console.log('Edit epic')
    let idSearch = props.idEpic
    let currentValues = await callApi('GET', `user/epics/${idSearch}`)
    formData.idEpic = idSearch
    formData.project = boardProjects.value.find(p => p.value === currentValues.idProject)
    formData.epic = currentValues.epic
    formData.description = currentValues.description
    formData.state = boardStates.value.find(bs => bs.value === currentValues.state)
    formData.priority = taskPriorities.find(p => p.value === currentValues.priority)
    formData.tasks = currentValues.tasks != null ? currentValues.tasks : []
    formData.epicRef = currentValues
    title = `Edit Epic ${formData.idEpic}`
  }
  document.title = title
}

function assignValueFromOptions(object, options, firstOneNew=false){
  if (formOp.value === "edit" || !firstOneNew){
    for (let i = 0; i < options.length; i++) {
      // console.log(options[i])
      if (options[i].value === object){
        return options[i]
      }
    }
  }
  else {
    return options[0]
  }
}

function addSubtaskEditor() {
  formData.inEdition = true
}

async function addSubtask(){
  // dummy()
  console.log(formData.project.value)
  let stcpy = (' ' + formData.newTaskTitle).slice(1)
  let project = boardData.projectsMap.get(formData.project.value)
  if (stcpy) {
    const searchParams = new URLSearchParams('');
    searchParams.append('text', stcpy)
    searchParams.append('epic', formData.idEpic)
    let references = await callApi('GET',
      `user/boards/${props.idBoard}/task-reference?`+searchParams.toString())
    let lines = stcpy.split("\n")
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      if (references[line]) {
        alert(`Moving task ${line} under this epic`)
        formData.tasks.push({
          idTask: references[line].idTask,
          key: references[line].key,
          title: references[line].title,
          isNew: false,
          isNewReference: true,
          taskType: "task",
          priority: references[line].priority,
          state: references[line].state,
        })
      }
      else{
        formData.tasks.push({
          title: line,
          isNew: true,
          isNewReference: false,
          taskType: "task",
          priority: "normal",
          state: formData.state,
        })
      }
    }
  }
  formData.inEdition = false
  formData.newTaskTitle = ''
}

function hideForm(){
  window.close()
}

function cancelOp(){
  hideForm()
}

async function submitForm() {
  console.log(formData)
  //dummy()
  const data = {
    idBoard: props.idBoard,
    idEpic: formData.idEpic,
    epic: formData.epic,
    description: formData.description,
    priority: formData.priority.value,
    idProject: formData.project.value,
    state: !isNewEpic.value ? formData.state.value : formData.state,
    tasks: formData.tasks,
  }
  let result = null
  switch (isNewEpic.value) {
    case true:
      result = await callApi("POST", 'user/epics', data);
      break
    case false:
      result= await callApi("POST", `user/epics/${formData.idEpic}`, data)
      break
  }
  console.log('POSTed this data:')
  console.log(data)
  if (result){
    hideForm();
  }
}

function editTask(subtask, parentTask){
  window.electronAPI.openTaskPage(`board/${props.idBoard}/task/${parentTask.idTask}/${subtask.idTask}`, null)
}

onMounted(async ()=> {
  console.log('mounted')
  let config = await window.electronAPI.getConfiguration()
  if (config) {
    console.log('Loaded configuration')
    //console.log(config)
    if (!config){
      return
    }
    store_configuration(config)
  }
  await getData()
})

</script>

<template>
  <div id="divFormTask">
    <q-form @submit="submitForm" @reset="clearForm">
      <q-card flat >
        <q-card-section>
          <q-select v-model="formData.project" :options="boardProjects" label="Project" />
          <q-input v-model="formData.epic" label="Epic" type="textarea" autogrow/>
          <q-input v-model="formData.description" label="Description" type="textarea"/>
          <div style="display: flex;">
            <div style="width: 50%; padding-right: 16px">
              <q-select v-if="!isNewTask" v-model="formData.state" :options="boardStates" label="State" />
            </div>
            <div style="width: 50%; padding-right: 16px">
              <q-select v-model="formData.priority" :options="taskPriorities" label="Priority" />
            </div>
          </div>

          <q-separator />
          <div style="margin-top: 24px;">
            Tasks:
            <q-list bordered dense>
              <q-item v-for="task in formData.tasks" :key="task.idTask" @click="editTask(task, formData.taskRef);formData.taskRef.expanded=true" :clickable="!task.isNew" :v-ripple="!task.isNew" >
                <q-item-section avatar>
                  <q-avatar>
                    <img src="../../public/subtask.png" style="width: 16px; height: 16px;">
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label lines="2">
                    {{ task.key }} - {{ task.title }}
                    <q-chip color="primary" dense square size="xs" text-color="white">{{ task.state }}</q-chip>
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-if="formData.inEdition">
                <q-item-section avatar>
                  <q-avatar>
                    <img src="../../public/subtask.png" style="width: 16px; height: 16px;">
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>
                    <q-input v-model="formData.newTaskTitle" label="New Task or existing task key. (Press ENTER to add several at once)" autogrow type="textarea">
                      <template v-slot:after>
                        <q-btn label="Add" type="button" size="xs" outline color="primary" @click="addSubtask" />
                      </template>
                    </q-input>
                  </q-item-label>
                </q-item-section>
              </q-item>

            </q-list>
            <q-btn flat type="button" @click="addSubtaskEditor" color="primary" >Add Task(s)</q-btn>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat type="submit" color="primary" >Submit</q-btn>
          <q-btn flat type="button" @click="cancelOp" >Cancel</q-btn>
        </q-card-actions>
      </q-card>
    </q-form>
  </div>
</template>

<style scoped>

</style>
