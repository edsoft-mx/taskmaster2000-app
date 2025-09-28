<script setup>
import TMKanban from "components/tmKanban.vue";
import {ref, defineProps} from 'vue'
import TMTaskContainer from "components/tmTaskContainer.vue";

defineOptions({
  name: 'TMEpicContainer',
})

const props = defineProps({
  states: {
    type: Array,
    required: true,
  },
  epic: {
    type: Object,
    required: true,
  },
  tasks: {
    type: Array,
    required: true,
  },
  idBoard: {
    type: String,
    required: true,
  }
})

const events = defineEmits([
  'select',
  'toggleDetail',
  'dragStarted',
  'dragOver',
  'dragLeave',
  'drop',
  'maximize'
])

let showDetails = ref(false)

async function toggleSuperTaskInfo(){
  showDetails.value = !showDetails.value
  //showTask(task)
}

function editTask(){
  window.electronAPI.openEpicPage(`board/${props.epic.idBoard}/epic/${props.epic.idEpic}`, null)
}

function epicDetail(){
  let result = ''
  if (props.epic.description){
    result += `## Description:\n${props.epic.description}\n`
  }
  return result
}

</script>

<template>
  <div class="superTask" >
    <img src="epic.png" style="width:16px; height: 16px; vertical-align: middle;"/>&nbsp;
    <button @click="$emit('toggle-epic', epic)" :title="epic.expanded ? 'Hide Tasks':'Show Tasks'"
            class="buttonTaskAction2" >
      <span class="material-icons-outlined material-icons" v-if="!epic.expanded">expand_more</span>
      <span class="material-icons-outlined material-icons" v-if="epic.expanded">expand_less</span>
    </button>
    &nbsp;
    <b>{{ epic.key }}</b> - {{ epic.epic }} <span class="state">{{ epic.state }}</span>
    &nbsp;
    <button @click="$emit('select', epic);toggleSuperTaskInfo()" title="Show description" class="buttonTaskAction2" style="position: relative;">
      <span class="material-icons-outlined material-icons">info</span>
    </button>
    &nbsp;
    <button @click="editTask" type="button" title="Edit task" class="buttonTaskAction2" style="position: relative">
      <span class="material-icons-outlined material-icons">edit</span>
    </button>
    <div v-if="showDetails" class="summary">
      <VueShowdown :markdown="epicDetail()" flavor="github" :options="{ emoji:true, headerLevelStart:3,
                tasklists: true, openLinksInNewWindow: true, moreStyling: true }" @select="$emit('select', epic)" />
    </div>

    <TMKanban :parent="epic" :tasks="tasks" :states="states" :id-board="idBoard"
              @toggle-detail="(element)=>{$emit('toggle-detail',element)}"
              @select="(subTask)=>{$emit('select', subTask)}"
              @maximize="(t)=>$emit('maximize', t)" :idPrefix="`epic_${epic.idEpic}`"
    />
    <div v-for="task in tasks" :key="task.uiKeyContainer" style="margin-left:32px;">
      <div v-if="task.expanded && task.hasSubTasks" >
        <TMTaskContainer :states="states" :task="task" :tasks="task.subTasks" :id-board="idBoard"
                         :id="`super-task-${task.idTask}`"
                         @toggle-detail="(element)=>{$emit('toggle-detail',element)}"
                         @select="(subTask)=>{$emit('select', subTask)}"
                         @maximize="(t)=>$emit('maximize', t)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
