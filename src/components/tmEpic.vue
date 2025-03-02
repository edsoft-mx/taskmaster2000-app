<script setup>
defineOptions({
  name: 'TMEpic',
})

const props = defineProps({
  epic: {
    type: Object,
    required: true,
  },
  boardData: {
    type: Object,
    required: true,
  }
})

const events = defineEmits([
  'showEpic',
  'editEpic',
  'toggleDetail',
  'dragStarted',
  'dragOver',
  'dragLeave',
  'drop'
])

function styleForTask(){
  let prj = props.boardData.projectsMap.get(props.epic.idProject);
  return `border: solid 3px ${prj.color}; padding-bottom: 32px;` // ${shadow}; `
}

function getTaskMouseOutStyle(){
  return "this.style.borderStyle='none'"
}

function dragTask(event, task, something){

}

function dragOverTask2(event){

}

function dragLeaveTask2(event){

}

function dropTask2(event){

}

function styleForEpicTab(){
  let prj = props.boardData.projectsMap.get(props.epic.idProject);
  return `background-color: ${prj.color}`
}

</script>

<template>
  <div @click="$emit('show-epic')"
       onmouseover="this.style.borderStyle='dotted'" :onmouseout="getTaskMouseOutStyle()"
       draggable="true" @dragstart="dragTask($event, task, null)"
       @dragover="dragOverTask2($event)" @dragleave="dragLeaveTask2($event)" @drop="dropTask2($event)"
       class="folder-container"
  >
    <div class="folder-tab" :style="styleForEpicTab()">
      Epic
    </div>
    <div class="folder" :style="styleForTask()">
      <span><b>{{epic.key }}</b><br> </span>
      {{ epic.epic }}
      <br>({{ boardData.epicTasksMap.get(epic.idEpic).length }} tasks)
      <img src="epic.png" style="position: absolute; left: 4px; bottom: 6px; width:16px; height: 16px"/>
      <img :src="`${epic.priority}.svg`" style="position: absolute; left: 22px; bottom: 6px; width:16px; height: 16px"/>
      <button @click="$emit('edit-epic')" type="button" title="Edit epic" class="buttonTaskAction" style="bottom: 4px; right: 4px; ">
        <span class="material-icons-outlined material-icons">edit</span>
      </button>
      <button  @click="$emit('' +
       '' +
        '' +
         '' +
          '' +
           '' +
            'toggle-detail')" :title="epic.expanded ? 'Hide Tasks':'Show Tasks'"
               class="buttonTaskAction" style="right: 28px; bottom: 4px;" >
        <span class="material-icons-outlined material-icons" v-if="!epic.expanded">expand_more</span>
        <span class="material-icons-outlined material-icons" v-if="epic.expanded">expand_less</span>
      </button>
    </div>
  </div>
</template>

<style scoped>

button.buttonTaskAction {
  position: absolute;
  padding:0;
  margin:0;
  width: 22px;
  height: 22px;
  color: #707070;
}

.folder-container {
  //display: flex;
  align-items: left;
  justify-content: center;
  padding-top: 20px;
  margin-bottom: 8px;
  position: relative;
}

.folder {
  min-height: 100px;
  position: relative;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  padding: 4px;
}

.folder-tab {
  width: 70px;
  height: 22px;
  background-color: #f39c12;
  position: absolute;
  top: 0px;
  right: 0px;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  text-align: center;
}

.folder-label {
  margin-left: 10px;
}

.folder-label p {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

</style>

