<script setup>
defineOptions({
  name: 'tm-admin-groups'
});
import {onMounted, ref, watch} from 'vue'
import {callApi, store_configuration} from 'src/common'

const groups = ref([])
const users = ref([])
const groupSelected = ref("")
const userSelected = ref("")
const isDisabledAddRole2User = ref(true)
const isDisabledRemoveRoleFromUser = ref(true)

async function getData()  {
  let usersData= await callApi('GET', 'users/')
  let groupsData= await callApi('GET', 'groups/')
  let tmpUsers = new Map()
  for (let i = 0; i < usersData.length; i++) {
    let user = usersData[i]
    user.roles = []
    tmpUsers.set(user.id, i)
    users.value.push(user)
  }
  for (let g of groupsData){
    groups.value.push(g)
    console.log(g)
    for (let ug=0; ug < g.users.length; ug++){
      let ug_id = g.users[ug]
      if (tmpUsers.has(ug_id)){
        let userIdx=tmpUsers.get(ug_id);
        let thatUser= users.value[userIdx];
        thatUser.roles.push({id: g.id, id_o: `${g.id_o}_u-${thatUser.id}`, username: g.role, icon: "groups"})
      }
    }
  }
  window.document.title = 'Manage Groups'
}

function getUserByIdO(ido){
  return users.value.find((u) => u.id_o === ido);
}

function getRoleByIdO(ido){
  return groups.value.find((u) => u.id_o === ido);
}

watch(
    [groupSelected, () => userSelected.value],
    ([gs, us]) => {
      let oneIsEmpty= gs==="" || us===""
      let usIsRole= us.includes('_')
      let already=false
      isDisabledRemoveRoleFromUser.value = !usIsRole
      if (!oneIsEmpty && !usIsRole){
        let u=getUserByIdO(us);
        for (let userRoles of u.roles){
          if (userRoles.id_o === `${gs}_${us}`){
            already=true
            break
          }
        }
      }
      isDisabledAddRole2User.value= oneIsEmpty || usIsRole || already;
    }
)

async function addRole2User(){
  let user= getUserByIdO(userSelected.value)
  let role= getRoleByIdO(groupSelected.value)
  await callApi("POST", `groups/${role.id}`, {'userId': user.id})
  user.roles.push({
    icon: "groups",
    id: role.id,
    id_o: `r-${role.id}_u-${user.id}`,
    username: role.role,
  })
}

async function removeRole2User(){
  let text = userSelected.value
  let role = text.split("_")[0].split("-")[1]
  let user = text.split("_")[1].split("-")[1]
  await callApi("delete", `groups/${role}/${user}`)
  let userNode = getUserByIdO(`u-${user}`);
  if (userNode!=null){
    let ur = userNode.roles.find((n) => n.id_o == text);
    if (ur!=null){
      userNode.roles.splice(userNode.roles.indexOf(ur), 1)
    }
  }
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
  <table style="border: 1px solid black; width: 100%; height: 100%;">
    <tbody>
    <tr>
      <td>
        <div class="q-pa-md q-gutter-sm">
          <q-tree
              :nodes="users"
              node-key="id_o"
              label-key="username"
              children-key="roles"
              tick-strategy="none"
              v-model:selected="userSelected"
              selected-color="accent"
              title="User Groups"
          />
          {{userSelected}}
        </div>
      </td>
      <td>
        <q-btn round color="primary" @click="addRole2User" icon="group_add" v-model:disabled="isDisabledAddRole2User" />
        <br>
        <br>
        <q-btn round color="primary" @click="removeRole2User" icon="group_remove" v-model:disabled="isDisabledRemoveRoleFromUser" />
      </td>
      <td>
        <div class="q-pa-md q-gutter-sm">
          <q-tree
              :nodes="groups"
              node-key="id_o"
              label-key="role"
              v-model:selected="groupSelected"
              selected-color="accent"
          />
          {{groupSelected}}
        </div>
      </td>
    </tr>
    </tbody>
  </table>
</template>

<style scoped>

</style>
