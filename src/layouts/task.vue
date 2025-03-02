<script setup>
defineOptions({
  name: 'tm-task'
});
import { ref, reactive, defineProps, watch, inject, computed } from 'vue'
import { callApi } from 'src/common'

const props = defineProps({
  idBoard: Number,
  idTask: Number,
  idSubTask: Number,
  initialState: String,
})

const isNewTask = computed(() => {
  return props.idTask == 0 || props.idSubTask == 0
})

const isSubTask = computed(() => {
  return props.idSubTask >= 0
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
  key: "",
  title: "",
  description: "",
  notes: "",
  project: 0,
  lookupProjects: [],
  state: "",
  tasksIndex: -1,
  priority: "normal",
  taskType: "task",
  dueDate: null,
  estimatedStartDate: null,
  estimatedDuration: null,
  parentTask: null,
  subTasks: [],
  newSubTaskTitle: "",
  inEdition: false,
  taskRef: null,
  tags: [],
})

const formOp = ref("")

const boardProjects = ref([])
const boardAllEpics = ref([])
const boardProjectEpics = ref([])
const boardStates = ref([])
const taskPriorities = [
  {label: "Normal", value: "normal"},
  {label: "Low", value: "low"},
  {label: "Medium", value: "medium"},
  {label: "High", value: "high"},
  {label: "Critical", value: "critical"},
]
const taskTypes = reactive([
  {value: "task", label: "Task"},
  {value: "subtask", label: "Subtask"},
  {value: "defect", label: "Defect"},
  {value: "idea", label: "Idea"},
  {value: "discarded", label: "Discarded"},
  {value: "archived", label: "Archived"},
])

let tags = ref([])


function searchParam(key) {
  let sp=new URLSearchParams(location.search)
  console.log(sp)
  return sp.get(key)
}

async function getData(){
  let apiCallBoard = callApi('GET', `user/boards/${props.idBoard}`)
  let apiCallEpics = callApi('GET', `user/boards/${props.idBoard}/epics`)
  let result = await apiCallBoard
  boardData.name= result.name
  boardData.states = result.states

  let sel = document.getElementById('selTaskType')
  for (let state of boardData.states){
    // boardData.stateMap.set(state.state, [])
    boardStates.value.push({label: state.state, value: state.state} )
  }
  //dummy()
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
  let epics = await apiCallEpics
  console.log(`epics for board ${props.idBoard}`)
  console.log(epics)
  boardAllEpics.value = epics
  boardProjectEpics.value = []

  if (isSubTask.value) {
    formData.parentTask = await callApi('GET', `user/boards/${props.idBoard}/tasks/${props.idTask}`)
    // let idx_t = taskTypes.findIndex(tt => tt.value === 'task')
    // if (idx_t !== -1) {
    //   taskTypes[idx_t].disable = true
    // }
    for (let i=0; i < boardProjects.value.length; i++) {
      let p= boardProjects.value[i]
      if (p.value !== formData.parentTask.idProject) {
        boardProjects.value[i].disable = true
      }
    }
  }
  let allTags = await callApi('GET', 'user/tags')
  let tags_ = []
  for (let i=0; i < allTags.length; i++) {
    let p= allTags[i]
    if (p.system){
      continue
    }
    tags_.push({
      label: p.tag,
      value: p.idTag,
    })
  }
  tags.value = tags_
  let title
  if (isNewTask.value) {
    formData.priority = taskPriorities.find(tp => tp.label === "Normal")
    formData.taskType = taskTypes.find(tt => tt.value === (!isSubTask.value ? "task" : "subtask"))
    formData.project = boardProjects.value[0]
    updateEpics4Project(formData.project)
    title = !isSubTask.value ?  "New Task" : `New Subtask for ${formData.parentTask.key}`
    formData.state = searchParam('state')
  }
  else {
    let idSearch = !isSubTask.value ? props.idTask : props.idSubTask
    let currentValues = await callApi('GET', `user/boards/${props.idBoard}/tasks/${idSearch}`)
    formData.idTask = idSearch
    formData.project = boardProjects.value.find(p => p.value === currentValues.idProject)
    updateEpics4Project(formData.project)
    formData.epic = boardProjectEpics.value.find(p => p.value === currentValues.epic)
    formData.key = currentValues.key
    formData.title = currentValues.title
    formData.description = currentValues.description
    formData.notes = currentValues.notes
    formData.state = boardStates.value.find(bs => bs.value === currentValues.state)
    formData.priority = taskPriorities.find(p => p.value === currentValues.priority)
    formData.taskType = taskTypes.find(tt => tt.value == currentValues.taskType)
    formData.estimatedDuration = currentValues.estimatedDuration
    formData.dueDate = currentValues.dueDate
    formData.estimatedStartDate = currentValues.estimatedStartDate
    formData.subTasks = currentValues.subTasks != null ? currentValues.subTasks : []
    formData.taskRef = currentValues
    if (currentValues.idTags.length > 0) {
      let selectedTags= tags_.filter(tp => currentValues.idTags.find(t => t=== tp.value))
      formData.tags = selectedTags
    }
    title = !isSubTask.value ?  `Edit Task ${formData.key}` : `Edit ${formData.parentTask.key}'s subtask ${formData.key}`
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
  let stcpy = (' ' + formData.newSubTaskTitle).slice(1)
  let project = boardData.projectsMap.get(formData.project.value)
  props.idBoard
  if (stcpy) {
    const searchParams = new URLSearchParams('');
    searchParams.append('text', stcpy)
    searchParams.append('task', formData.idTask)
    let references = await callApi('GET',
      `user/boards/${props.idBoard}/task-reference?`+searchParams.toString())
    let lines = stcpy.split("\n")
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      if (references[line]) {
        alert(`Moving task ${line} as subtask`)
        formData.subTasks.push({
          idTask: references[line].idTask,
          key: references[line].key,
          title: references[line].title,
          isNew: false,
          isNewReference: true,
          taskType: "subtask",
          priority: references[line].priority,
          state: references[line].state,
        })
      }
      else{
        formData.subTasks.push({
          title: line,
          isNew: true,
          isNewReference: false,
          taskType: "subtask",
          priority: "normal",
          state: formData.state,
        })
      }
    }
  }
  formData.inEdition = false
  formData.newSubTaskTitle = ''
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
    idTask: formData.idTask,
    title: formData.title,
    description: formData.description,
    notes: formData.notes,
    idProject: formData.project.value,
    idEpic: formData.epic?.value,
    state: !isNewTask.value ? formData.state.value : formData.state,
    priority: formData.priority.value,
    taskType: formData.taskType.value,
    dueDate: formData.dueDate,
    estimatedStartDate: formData.estimatedStartDate,
    estimatedDuration: formData.estimatedDuration,
    hasSubTasks: formData.subTasks != null ? formData.subTasks.length > 0 : false,
    subTasks: formData.subTasks,
    tags: formData.tags
  }
  let result = null
  switch (isNewTask.value) {
    case true:
      if (formData.parentTask != null){
        data.idProject = formData.parentTask.idProject
        data.idParentTask = formData.parentTask.idTask
      }
      result = await callApi("POST", 'user/tasks', data);
      break
    case false:
      result= await callApi("POST", `user/tasks/${formData.idTask}`, data)
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

function updateEpics4Project(newValue){
  let result = []
  if (newValue) {
    for (let epic of boardAllEpics.value){
      if (epic.idProject === newValue.value){
        result.push({
          value: epic.idEpic,
          label: epic.epic,
        })
      }
    }
  }
  boardProjectEpics.value = result
  formData.epic= null
}

getData()
</script>

<template>
  <div id="divFormTask">
    <q-form @submit="submitForm" @reset="clearForm">
      <q-card flat >
        <q-card-section>
          <div style="display: flex;">
            <div style="width: 50%; padding-right: 16px">
              <q-select v-model="formData.project" :options="boardProjects" label="Project" @update:model-value="updateEpics4Project" />
            </div>
            <div style="width: 50%; ">
              <q-select v-model="formData.epic" :options="boardProjectEpics" label="Epic" />
            </div>
          </div>
          <q-input v-model="formData.title" label="Title" type="textarea" autogrow/>
          <q-input v-model="formData.description" label="Description" type="textarea"/>
          <q-input v-model="formData.notes" label="Notes" type="textarea"/>
          <div style="display: flex;">
            <div style="width: 33%; padding-right: 16px">
              <q-select v-if="!isNewTask" v-model="formData.state" :options="boardStates" label="State" />
            </div>
            <div style="width: 33%; padding-right: 16px">
              <q-select v-model="formData.priority" :options="taskPriorities" label="Priority" />
            </div>
            <div style="width: 33%">
              <q-select ref="selTaskType" v-model="formData.taskType" :options="taskTypes" label="Type" />
            </div>
          </div>
          <q-select v-model="formData.tags" label="Tags" :options="tags" multiple>
            <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
              <q-item v-bind="itemProps">
                <q-item-section>
                  <q-item-label>{{ opt.label }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle :model-value="selected" @update:model-value="toggleOption(opt)" />
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <div style="display: flex;">
            <div style="width: 33%; padding-right: 16px">
              <q-input v-model="formData.estimatedStartDate" label="Estimated Start Date">
                <template v-slot:prepend>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="formData.estimatedStartDate" mask="YYYY-MM-DD">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div style="width: 33%; padding-right: 16px">
              <q-input v-model="formData.dueDate" label="Due Date">
                <template v-slot:prepend>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="formData.dueDate" mask="YYYY-MM-DD">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div style="width: 33%; padding-right: 16px">
              <q-input v-model="formData.estimatedDuration" label="Estimated Duration"/>
            </div>
          </div>
          <q-separator />
          <div v-if="formData.taskType.value === 'task' " style="margin-top: 24px;">
            Subtasks:
            <q-list bordered dense>
              <q-item v-for="subtask in formData.subTasks" :key="subtask.idTask" @click="editTask(subtask, formData.taskRef);formData.taskRef.expanded=true" :clickable="!subtask.isNew" :v-ripple="!subtask.isNew" >
                <q-item-section avatar>
                  <q-avatar>
                    <img src="../../public/subtask.png" style="width: 16px; height: 16px;">
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label lines="2">
                    {{ subtask.key }} - {{ subtask.title }}
                    <q-chip color="primary" dense square size="xs" text-color="white">{{ subtask.state }}</q-chip>
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
                    <q-input v-model="formData.newSubTaskTitle" label="New Subtask" autogrow type="textarea" />
                    <q-btn label="Add" type="button" size="xs" outline color="primary" @click="addSubtask" />
                  </q-item-label>
                </q-item-section>
              </q-item>

            </q-list>
            <q-btn flat type="button" @click="addSubtaskEditor" color="primary" >Add Subtask</q-btn>
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
