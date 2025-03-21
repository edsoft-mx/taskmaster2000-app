
let allStates = []
let stateMap = new Map()
let projectMap = new Map()
let epicMap = new Map()
let taskMap = new Map()
let allTaskMap = new Map()


function getRandomAlphanumeric() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomIndex = Math.floor(Math.random() * characters.length);
  return characters.charAt(randomIndex);
}


class BoardState {
  constructor(state) {
    this.backgroundColor= state.backgroundColor
    this.end= state.end
    this.hideAfterDays= state.hideAfterDays
    this.nextStates= state.nextStates
    this.order= state.order
    this.showDimmed= state.showDimmed
    this.start= state.start
    this.state= state.state
    this.tasks = []
    this.epics = []
    allStates.push(this)
    stateMap.set(this.state, this)
  }
}

class BoardProject {
  constructor(project) {
    this.color= project.color
    this.enableBilling= project.enableBilling
    this.idProject= project.idProject
    this.name= project.name
    this.projectKey= project.projectKey
    this.epics = []
    this.epicMap = new Map()
    this.tasks = []
    this.taskMap = new Map()
    projectMap.set(this.idProject, this)
  }

  addEpic(epic) {
    this.epics.push(epic)
    this.epicMap.set(epic.idEpic, epic)
    epicMap.set(epic.idEpic, epic)
  }

  addTask(task) {
    this.tasks.push(task)
    this.taskMap.set(task.idTask, task)
    taskMap.set(task.idTask, task)
  }
}

class BoardEpic{
  constructor(epic) {
    this.description= epic.description
    this.epic= epic.epic
    this.expanded= epic.expanded
    this.idBoard = epic.idBoard
    this.idEpic= epic.idEpic
    this.idProject= epic.idProject
    this.key= epic.key
    this.priority= epic.priority
    this.projectKey= epic.projectKey
    this.state= epic.state
    this.subTasks = []
    this.taskType = 'epic'
    this.color = epic.color
    this.uiKey= `${this.idEpic}`
    let prj = projectMap.get(this.idProject)
    prj.addEpic(this)
    let state= stateMap.get(this.state)
    state.epics.push(this)
    BoardEpic.allEpics.push(this)
  }

  static allEpics = []

  editEpic(){
    window.electronAPI.openEpicPage(`board/${this.idBoard}/epic/${this.idEpic}`, null)
  }

}

class BoardTask {
  constructor(task, parentTaskId=null) {
    this.setMainValues(task)
    this.parentTaskId= parentTaskId
    this.isRoot= parentTaskId == null && !this.idEpic
    this.subTasks=[]
    this.uiKeyContainer= `taskContainer-${this.idTask}`
    this.uiKey= `task-${this.idTask}`
    this.epic= null
    this.parentTask= null
    allTaskMap.set(this.idTask, this)
    BoardTask.allTasks.push(this)
    if (this.hasSubTasks) {
      for (let subtask of task.subTasks) {
        let subTaskObject= new BoardTask(subtask, this.idTask)
        subTaskObject.parentTask= this
        this.subTasks.push(subTaskObject)
      }
    }
    if (parentTaskId==null) {
      if (this.idEpic){
        let epic= epicMap.get(this.idEpic)
        epic.subTasks.push(this)
        this.epic= epic
      }
      else {
        BoardTask.rootTasks.push(this)
        taskMap.set(this.idTask, this)
        let state= stateMap.get(this.state)
        state.tasks.push(this)
      }
      let project = projectMap.get(this.idProject)
      project.addTask(this)
    }
  }

  updateUIElements(){
    if (this.epic){
      console.log('Updating epic UI key')
      console.log(this.epic)
      this.epic.uiKey = this.epic.uiKey + getRandomAlphanumeric()
    }
    if (this.parentTask) {
      console.log('Updating parent task UI keys')
      console.log(this.parentTask)
      this.parentTask.uiKey = this.parentTask.uiKey + getRandomAlphanumeric()
      this.parentTask.uiKeyContainer = this.parentTask.uiKeyContainer + getRandomAlphanumeric()
    }
    console.log('Updating UI keys')
    console.log(this)
    this.uiKeyContainer = this.uiKeyContainer + getRandomAlphanumeric()
    this.uiKey = this.uiKey + getRandomAlphanumeric()
  }

  setMainValues(data){
    this.color= data.color
    this.daysWorked= data.daysWorked
    this.formattedDaysWorked= []
    if (this.daysWorked && this.daysWorked.length > 0){
      this.formattedDaysWorked= this.daysWorked.map((dayWorked) => BoardTask.getCalendarFormat(dayWorked))
    }
    this.description= data.description
    this.dueDate= data.dueDate
    this.formattedDueDate= BoardTask.getCalendarFormat(this.dueDate)
    this.endState= data.endState
    this.estimatedStartDate= data.estimatedStartDate
    this.formattedEstimatedStartDate= BoardTask.getCalendarFormat(this.estimatedStartDate)
    this.expanded= data.expanded
    this.hasSubTasks= data.hasSubTasks
    this.hierarchy= data.hierarchy
    this.icon= data.icon
    this.idBoard= data.idBoard
    this.idEpic= data.idEpic
    this.idProject= data.idProject
    this.idTags= data.idTags
    this.idTask= data.idTask
    this.initialState= data.initialState
    this.isExternal= data.isExternal
    this.key= data.key
    this.notes= data.notes
    this.priority= data.priority
    this.projectKey= data.projectKey
    this.projectName= data.projectName
    this.sortOrder= data.sortOrder
    this.state= data.state
    this.taskType= data.taskType
    this.title= data.title
    this.xtraData= data.xtraData
  }

  //updateData(newData, parentTaskId=null){
  updateData(newData){
    let previousState = this.state
    this.setMainValues(newData)
    //this.parentTask= parentTaskId
    //this.isRoot= parentTaskId == null && !this.idEpic
    // if (this.hasSubTasks) {
    //   for (let subtask of newData.subTasks) {
    //     let subTaskObject = this.subTasks.find((st)=>st.idTask === subtask.idTask)
    //     if (subTaskObject!=null){
    //       subTaskObject.updateData(subtask, parentTaskId)
    //     }
    //   }
    // }
    //if (parentTaskId==null && previousState != this.state) {
    if (previousState != this.state) {
      let stateP = stateMap.get(previousState)
      let idx= stateP.tasks.findIndex((t)=> t.idTask === this.idTask)
      if (idx!=-1) {
        stateP.tasks.splice(idx,1)
      }
      let state= stateMap.get(this.state)
      let idx2= state.tasks.findIndex((t)=> t.idTask === this.idTask)
      if (idx2==-1) {
        state.tasks.push(this)
      }
    }
  }

  static rootTasks = []
  static allTasks = []

  static getCalendarFormat(aDate){
    if (aDate!=null){
      return aDate.substring(0, 10).replaceAll('-', '/')
    }
    else {
      return null
    }
  }

  getPendingSubtasks() {
    let result = [];
    if (this.hasSubTasks) {
      result = this.subTasks.filter(st => !st.endState)
    }
    return result;
  }

  editTask(){
    if (this.parentTask==null) {
      console.log(`board/${this.idBoard}/task/${this.idTask}/-1`)
      window.electronAPI.openTaskPage(`board/${this.idBoard}/task/${this.idTask}/-1`, null)
    }
    else{
      console.log(`board/${this.idBoard}/task/${this.parentTaskId}/${this.idTask}`)
      window.electronAPI.openTaskPage(`board/${this.idBoard}/task/${this.parentTaskId}/${this.idTask}`, null)
    }
  }

  async timerClick(){
    await window.electronAPI.pomodoroTimerClick({
      idTask: this.idTask,
      description: this.description,
      title: this.title,
      key: this.key,
      idProject: this.idProject,
    })
  }

  getMainInfo() {
    let description = `<h3><img class="taskIcon" src="${task.taskType}.png">
    <strong>${this.key}</strong> | ${this.projectName}<br>${this.title}
    </h3>`
  }

  getBasicInfo() {
    let taskDescription1 = `

State: \` ${task.state} \`
Priority: ![alt-priority](${this.priority}.svg =24x24) ${this.priority}

`
    if (this.description) {
      taskDescription1 += `## Description:

${this.description}

`
    }
    if (this.notes) {
      taskDescription1 += `## Notes:

${this.notes}

`
    }
    taskDescription1 += `

## Activity:

`
    return taskDescription1;
  }

  getActitivyInfo(){
    let result = `
Estimated Duration: ${this.estimatedDuration ? this.estimatedDuration : 'n/a'}
Time Spent: ${ this.timeSpent ? this.timeSpent : 'n/a' }
Time Spent Today: ${ this.timeSpentToday ? this.timeSpentToday : 'n/a' }

  `
      return result;
  }
}

function resetData(){
  allStates = []
  stateMap.clear()
  projectMap.clear()
  epicMap.clear()
  taskMap.clear()
  allTaskMap.clear()
  BoardEpic.allEpics = []
  BoardTask.allTasks = []
  BoardTask.rootTasks = []
}

export { allStates, taskMap, allTaskMap, projectMap, stateMap, epicMap, BoardState, BoardProject, BoardEpic, BoardTask, resetData }
