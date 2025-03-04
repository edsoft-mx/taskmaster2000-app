<script setup>
defineOptions({
  name: 'TMEpic',
})

const props = defineProps({
  epic: {
    type: Object,
    required: true,
  },
})

const events = defineEmits([
  'select',
  'toggleEpic',
])

function styleForTask(){
  return `border: solid 3px ${props.epic.color}; padding-bottom: 32px;` // ${shadow}; `
}

function getTaskMouseOutStyle(){
  return "this.style.borderStyle='none'"
}

function styleForEpicTab(){
  return `background-color: ${props.epic.color}`
}

</script>

<template>
  <div @click="$emit('select')"
       onmouseover="this.style.borderStyle='dotted'" :onmouseout="getTaskMouseOutStyle()"
       draggable="true"
       class="folder-container"
  >
    <div class="folder-tab" :style="styleForEpicTab()">
      Epic
    </div>
    <div class="folder" :style="styleForTask()">
      <span><b>{{epic.key }}</b><br> </span>
      {{ epic.epic }}
      <br>({{ epic.subTasks.length }} tasks)
      <img src="epic.png" style="position: absolute; left: 4px; bottom: 6px; width:16px; height: 16px"/>
      <img :src="`${epic.priority}.svg`" style="position: absolute; left: 22px; bottom: 6px; width:16px; height: 16px"/>
      <button @click="$emit('edit-epic')" type="button" title="Edit epic" class="buttonTaskAction" style="bottom: 4px; right: 4px; ">
        <span class="material-icons-outlined material-icons">edit</span>
      </button>
      <button  @click="$emit('toggle-epic', epic)" :title="epic.expanded ? 'Hide Tasks':'Show Tasks'"
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
  background-color: #fff;
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

@media (prefers-color-scheme: dark) {
  .folder {
    background-color: #2b2d30;
  }
}

</style>

