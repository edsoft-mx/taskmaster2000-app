import parentTask from "postcss-selector-parser";

let allStates = []
let stateMap = new Map()
let projectMap = new Map()
let epicMap = new Map()
let taskMap = new Map()
let allTaskMap = new Map()


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
    this.idEpic= epic.idEpic
    this.idProject= epic.idProject
    this.key= epic.key
    this.priority= epic.priority
    this.projectKey= epic.projectKey
    this.state= epic.state
    this.subTasks = []
    this.taskType = 'epic'
    this.color = epic.color
    let prj = projectMap.get(this.idProject)
    prj.addEpic(this)
    let state= stateMap.get(this.state)
    state.epics.push(this)
    BoardEpic.allEpics.push(this)
  }

  static allEpics = []
}

class BoardTask {
  constructor(task, parentTaskId=null) {
    this.color= task.color
    this.daysWorked= task.daysWorked
    this.formattedDaysWorked= []
    if (this.daysWorked && this.daysWorked.length > 0){
      this.formattedDaysWorked= this.daysWorked.map((dayWorked) => BoardTask.getCalendarFormat(dayWorked))
    }
    this.description= task.description
    this.dueDate= task.dueDate
    this.formattedDueDate= BoardTask.getCalendarFormat(this.dueDate)
    this.endState= task.endState
    this.estimatedStartDate= task.estimatedStartDate
    this.formattedEstimatedStartDate= BoardTask.getCalendarFormat(this.estimatedStartDate)
    this.expanded= task.expanded
    this.hasSubTasks= task.hasSubTasks
    this.hierarchy= task.hierarchy
    this.icon= task.icon
    this.idBoard= task.idBoard
    this.idEpic= task.idEpic
    this.idProject= task.idProject
    this.idTags= task.idTags
    this.idTask= task.idTask
    this.initialState= task.initialState
    this.isExternal= task.isExternal
    this.key= task.key
    this.notes= task.notes
    this.priority= task.priority
    this.projectKey= task.projectKey
    this.projectName= task.projectName
    this.sortOrder= task.sortOrder
    this.state= task.state
    this.taskType= task.taskType
    this.title= task.title
    this.parentTask= parentTaskId
    this.isRoot= parentTask == null
    this.subTasks=[]
    allTaskMap.set(this.idTask, this)
    BoardTask.allTasks.push(this)
    if (this.hasSubTasks) {
      for (let subtask of task.subTasks) {
        let subTaskObject= new BoardTask(subtask, this.idTask)
        this.subTasks.push(subTaskObject)
      }
    }
    if (parentTaskId==null) {
      if (this.idEpic){
        let epic= epicMap.get(this.idEpic)
        epic.subTasks.push(this)
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
      window.electronAPI.openTaskPage(`board/${this.idBoard}/task/${this.idTask}/-1`, null)
    }
    else{
      window.electronAPI.openTaskPage(`board/${this.idBoard}/task/${this.parentTask}/${this.idTask}`, null)
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
  BoardEpic.epics = []
  BoardTask.allTasks = []
  BoardTask.rootTasks = []
}

export { allStates, taskMap, allTaskMap, projectMap, stateMap, epicMap, BoardState, BoardProject, BoardEpic, BoardTask, resetData }
