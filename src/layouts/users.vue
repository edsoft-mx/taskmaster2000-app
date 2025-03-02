<script setup>
defineOptions({
  name: 'tm-admin-users'
});

import { ref } from 'vue'
import { callApi } from 'src/common'

const userId= ref(0)
const username= ref("")
const firstName= ref("")
const lastName= ref("")
const active= ref(true)
const password= ref("")

const columns = [
  {
    name: 'id',
    required: true,
    label: 'Id',
    align: 'left',
    field: 'id'
  },
  {
    name: 'active',
    required: true,
    label: 'Active',
    align: 'center',
    field: 'active'
  },
  {
    name: 'username',
    required: true,
    label: 'Username',
    align: 'left',
    field: 'username'
  },
  {
    name: 'first_name',
    required: false,
    label: 'First Name',
    align: 'left',
    field: 'first_name'
  },
  {
    name: 'last_name',
    required: false,
    label: 'Last Name',
    align: 'left',
    field: 'last_name'
  },
  {
    name: 'password',
    required: true,
    label: 'Password',
    align: 'left',
    field: 'password',
    format: (val, row) => '*'.repeat(val.length),
  },
]

const rows = ref([])
const formStyle = ref({
  left: "20px",
  top: "20px",
  position: "absolute",
  width: "500px",
  display: "none"
})
const formOp = ref("")

async function getData()  {
  let result = await callApi('GET', 'users')
  for (let r of result){
    rows.value.push(r)
  }
  window.document.title = 'Manage Users'
}

function clearUser(){
  username.value = ''
  firstName.value = ''
  lastName.value = ''
  active.value = true
  password.value = ''
}

function showForm(){
  const parent = document.getElementById('userMainContainer')
  const divFormUser = document.getElementById('divFormUser')
  const x = (parent.offsetWidth - 500) / 2;
  formStyle.value.left = x + 'px'
  formStyle.value.display = 'block'
  const idEd = divFormUser.getElementsByTagName('input')[0].id
  setTimeout(()=>{
    console.log(idEd)
    document.getElementById(idEd).focus();
  }, 500)
  console.log("show time")
}

function newUser(){
  formOp.value = "add";
  clearUser()
  showForm()
}

function editUser(event, row, index){
  formOp.value = "edit";
  showForm()
  username.value = row.username
  firstName.value = row.first_name
  lastName.value = row.last_name
  active.value = row.active
  userId.value = row.id
  password.value = row.password
  console.log(row)
}

function cancelOp(){
  formStyle.value.display = 'none';
}

async function submitUser() {
  console.log(`submit (${formOp.value}): user (${userId.value}, ${username.value}, ${password.value}, ${firstName.value}, ${lastName.value}, ${active.value})`)
  const data = {
    username: username.value,
    password: password.value,
    firstName: firstName.value,
    lastName: lastName.value,
    active: active.value,
  }
  switch (formOp.value) {
    case "add":
      const newUser = await callApi("POST", "users", data);
      console.log(newUser);
      rows.value.push(newUser);
      break
    case "edit":
      callApi("POST", `users/${userId.value}`, data)
      break
  }
}

getData();

</script>

<template>
  <div id="userMainContainer" style="position: relative;">
  <div class="q-pa-md">
    <q-table
        class="my-sticky-header-table"
        flat bordered
        title="Users"
        :rows="rows"
        :columns="columns"
        row-key="id"
        @row-dblclick="editUser"
    />
  </div>
  <div style="text-align: right; padding-right: 10px">
    <q-btn round color="primary" fab hint="New User" @click="newUser" icon="person_add_alt" />
  </div>
  <div :style=formStyle id="divFormUser">
    <q-form @submit="submitUser" @reset="clearUser"> >
    <q-card style="min-width: 350px">
      <q-card-section>
        <q-input v-model="username" label="Username" id="edUsername" />
        <q-input v-model="password" type="password"  label="Password" />
        <q-input v-model="firstName" label="First Name" />
        <q-input v-model="lastName" label="Last Name" />
        <q-checkbox v-model="active" label="Active" />
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
