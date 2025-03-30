<script setup>
defineOptions({
  name: 'tm-admin-projects'
});

import { ref, reactive } from 'vue'
import { callApi, dummy } from 'src/common'

const columns = [
  {
    name: 'id',
    required: true,
    label: 'Id',
    align: 'left',
    field: 'idProject'
  },
  {
    name: 'name',
    required: true,
    label: 'Name',
    align: 'left',
    field: 'name'
  },
  {
    name: 'projectKey',
    required: false,
    label: "Key",
    align: 'left',
    field: 'projectKey'
  },
  {
    name: 'enableBilling',
    required: false,
    label: "Enable Billing",
    align: 'center',
    field: 'enableBilling',
  },
  {
    name: 'color',
    required: false,
    label: 'Color',
    align: 'center',
    field: 'color'
  },
]

const rows = ref([])

const projectData = reactive({
  idProject: 0,
  name: '',
  projectKey: '',
  enableBilling: false,
  color: "#0880c0",
  notesDirectory: ""
})

const formStyle = ref({
  left: "20px",
  top: "20px",
  position: "absolute",
  width: "500px",
  display: "none"
})
const formOp = ref("")

async function getData()  {
  let apiCallProjects = callApi('GET', 'user/projects')
  let result = await apiCallProjects
  for (let r of result){
    rows.value.push(r)
  }
  window.document.title = 'Manage Projects'
}

function clearProject(){
  if (formOp.value !== "edit") {
    projectData.idProject= 0
    projectData.name= ''
    projectData.projectKey= ''
    projectData.enableBilling= false
    projectData.color= "#0880c0"
  }
}

function showForm(){
  const parent = document.getElementById('mainContainer')
  const divFormUser = document.getElementById('divFormProject')
  const x = (parent.offsetWidth - 500) / 2;
  formStyle.value.left = x + 'px'
  formStyle.value.display = 'block'
  const idEd = divFormUser.getElementsByTagName('input')[0].id
  setTimeout(()=>{
    document.getElementById(idEd).focus();
  }, 500)
  console.log("show time")
}

function hideForm(){
  formStyle.value.display = 'none'
}

function newProject(){
  formOp.value = "add";
  clearProject()
  showForm()
}

function editProject(event, row, index){
  formOp.value = "edit";
  showForm()
  console.log(row)
  projectData.idProject= row.idProject;
  projectData.name= row.name;
  projectData.projectKey= row.projectKey;
  projectData.enableBilling= row.enableBilling;
  projectData.color= row.color;
  projectData.notesDirectory= row.notesDirectory
  console.log(row)
}

function cancelOp(){
  formStyle.value.display = 'none';
}

async function submitProject() {
  console.log(`submit (${formOp.value}): data: ${projectData}`)
  const data = {
    idProject: projectData.idProject,
    name: projectData.name,
    projectKey: projectData.projectKey,
    enableBilling: projectData.enableBilling,
    color: projectData.color,
    notesDirectory: projectData.notesDirectory,
  }
  switch (formOp.value) {
    case "add":
      const newProject = await callApi("POST", "user/projects", data);
      rows.value.push(newProject);
      hideForm();
      break
    case "edit":
      callApi("POST", `user/projects/${data.idProject}`, data)
      hideForm();
      break
  }
}

getData();

</script>

<template>
  <div id="mainContainer" style="position: relative;">
    <div class="q-pa-md">
      <q-table
          class="my-sticky-header-table"
          flat bordered
          title="Projects"
          :rows="rows"
          :columns="columns"
          row-key="id"
          @row-dblclick="editProject"
      />
    </div>
    <div style="text-align: right; padding-right: 10px">
      <q-btn round color="primary" fab hint="New Project" @click="newProject" icon="work_outline" />
    </div>
    <div :style=formStyle id="divFormProject">
      <q-form @submit="submitProject" @reset="clearProject"> >
        <q-card style="min-width: 350px">
          <q-card-section>
            <q-input v-model="projectData.name" label="Name" id="edProjectName" />
            <q-input v-model="projectData.projectKey" label="Key" />
            <q-checkbox v-model="projectData.enableBilling" label="Enable Billing" />
            <q-input v-model="projectData.color" label="Color">
              <template v-slot:append>
                <q-icon name="colorize" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-color v-model="projectData.color" />
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
            <q-input v-model="projectData.notesDirectory" label="External Notes Directory" />
          </q-card-section>
          <q-separator />
          <q-card-actions align="right">
            <q-btn flat type="submit" color="primary" >Submit</q-btn>
            <q-btn flat type="reset">Reset</q-btn>
            <q-btn flat type="button" @click="cancelOp" >Cancel</q-btn>
          </q-card-actions>
        </q-card>
      </q-form>
    </div>
  </div>
</template>

<style scoped>

</style>
