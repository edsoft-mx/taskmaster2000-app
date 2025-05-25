<script setup>
defineOptions({
  name: 'tm-boards'
});

import { ref, reactive } from 'vue'
import { callApi } from 'src/common'

const columns = [
  {
    name: 'id',
    required: true,
    label: 'Id',
    align: 'left',
    field: 'idBoard'
  },
  {
    name: 'name',
    required: true,
    label: 'Name',
    align: 'left',
    field: 'name'
  },
  {
    name: 'stateSet',
    required: false,
    label: "Board Type",
    align: 'left',
    field: 'stateSet'
  },
]

const rows = ref([])

const kindsOfBoards = ref([])
const projects = ref([])
//const tags = ref([])

const formData = reactive({
  idBoard: 0,
  name: '',
  //idStateSet: 0,
  //stateSet: '',
  lookupStateSet: {label: '-', value: '-'},
  //projects: [],
  lookupProjects: [],
  //tags: [],
  //lookupTags: []
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
  let apiCallBoards = callApi('GET', 'user/boards')
  let apiCallBoardTypes= callApi('GET', 'user/boards/types/')
  let apiCallProjects = callApi('GET', 'user/projects')
  let apiCallTags = callApi('GET', 'user/tags')
  // dummy();
  rows.value = []
  let boards = await apiCallBoards
  for (let b of boards){
    rows.value.push(b)
  }
  kindsOfBoards.value = []
  let boardTypes = await  apiCallBoardTypes
  for (let b of boardTypes){
    kindsOfBoards.value.push({
      label: b.stateSet,
      value: b.idStateSet,
    })
  }
  projects.value = []
  let prjs = await apiCallProjects
  for (let p of prjs){
    projects.value.push({
      value: p.idProject,
      label: p.name
    })
  }
  //console.log(projects)
  // let tags_ = await apiCallTags
  // for (let t of tags_){
  //   tags.value.push({
  //     value: t.id,
  //     label: t.name
  //   })
  // }
  console.log('Done')
  window.document.title = 'Manage Boards'
}

function clearForm(){
  if (formOp.value !== "edit") {
    formData.idBoard= 0
    formData.name= ''
    formData.idStateSet= 0
    formData.stateSet= ''
  }
}

async function showForm(selectedRow){
  if (formOp.value === "edit"){
    // for (let i = 0; i < kindsOfBoards.value.length; i++) {
    //   if (kindsOfBoards.value[i].idStateSet === formData.idStateSet){
    //     formData.lookupStateSet = kindsOfBoards[i]
    //     break
    //   }
    // }
  }
  else {
    formData.lookupStateSet = kindsOfBoards.value[0]
  }
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

function newObject(){
  formOp.value = "add";
  clearForm()
  showForm()
}

function editObject(event, row, index){
  console.log('edit board')
  console.log(row)
  formOp.value = "edit";
  formData.idBoard= row.idBoard
  formData.name= row.name
  console.log(`looking on kindsOfBoards for ${row.idStateSet}`)
  //console.log(kindsOfBoards.value)
  //formData.lookupStateSet = kindsOfBoards.value.find((ss) => ss.value === row.idStateSet)
  for (let i = 0; i < kindsOfBoards.value.length; i++) {
    let kob = kindsOfBoards.value[i]
    console.log(kob)
    if (kob.value === row.idStateSet){
      formData.lookupStateSet = {label: kob.label, value: kob.value}
      console.log("found")
      console.log(formData.lookupStateSet)
      break
    }
  }
  let selProjects = []
  for (let p of projects.value) {
    //console.log(p)
    for (let i = 0; i < row.projects.length; i++) {
      if (row.projects[i].idProject === p.value) {
        selProjects.push(p.value)
      }
    }
  }
  formData.lookupProjects = selProjects;
  //formData.idStateSet= row.idStateSet
  //formData.stateSet=  row.stateSet
  console.log(formData)
  showForm()
}

function cancelOp(){
  formStyle.value.display = 'none';
}

async function submitForm() {
  console.log(`submit (${formOp.value}): data:`)
  console.log(formData)
  let selProjects = []
  for (let p of formData.lookupProjects) {
    selProjects.push(p)
  }
  const data = {
    idBoard: formData.idBoard,
    name: formData.name,
    idStateSet: formData.lookupStateSet.value,
    projects: selProjects, //formData.lookupProjects.map((p => p.value)),
    tags: [], //formData.tags.map((t) => t.value),
  }
  switch (formOp.value) {
    case "add":
      const newObject = await callApi("POST", "user/boards", data);
      rows.value.push(newObject);
      hideForm();
      break
    case "edit":
      await callApi("POST", `user/boards/${data.idBoard}`, data)
      hideForm();
      await getData();
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
          title="Boards"
          :rows="rows"
          :columns="columns"
          row-key="id"
      >

        <template v-slot:body="props">
          <q-tr :props="props" :key="`m_${props.row.index}`" >
            <q-td
                v-for="col in props.cols"
                :key="col.name"
                :props="props"
            >
              <q-btn v-if="col.name=='id'" dense icon="edit" @click="editObject(null, props.row, props.row.index)" ></q-btn>&nbsp;
              {{ col.value }}
            </q-td>
          </q-tr>
          <q-tr :props="props" :key="`e_${props.row.index}`" >
            <q-td></q-td>
            <q-td style="text-align: right; vertical-align: top;">Projects:</q-td>
            <q-td style="margin:0px; padding-top: 0px;">
              <ul style="margin-top: 0px; margin-bottom: 8px; padding-top: 0px;">
                <li v-for="proj in props.row.projects" :key="proj.idProject">
                  {{ proj.name }}
                </li>
              </ul>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
    <div style="text-align: right; padding-right: 10px">
      <q-btn round color="primary" fab hint="New Project" @click="newObject" icon="work_outline" />
    </div>
    <div :style=formStyle id="divFormProject">
      <q-form @submit="submitForm" @reset="clearForm"> >
        <q-card style="min-width: 350px">
          <q-card-section>
            <q-input v-model="formData.name" label="Name" id="edProjectName" />
            <q-select v-model="formData.lookupStateSet" :options="kindsOfBoards" label="Kind of board" />
            <q-separator />
            <q-select v-model="formData.lookupProjects"
                      :options="projects"
                      multiple
                      emit-value
                      map-options
                      label="Include task from these projects">
              <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                <q-item v-bind="itemProps">
                  <q-item-section>
                    <q-item-label> {{ opt.label }} </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-toggle :model-value="selected" @update:model-value="toggleOption(opt)" />
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

          </q-card-section>

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
