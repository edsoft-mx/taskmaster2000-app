import { defineStore } from 'pinia';

export const useUISessionStore = defineStore('ui_state_session', {
  state: () => ({
    selectedTask: 0,
    pomodoroSession: 0,
    pomodoroIndex: 0,
    task2UpdateState: {id: 0, state: '?'}
  }),

  actions: {
    setSelectedTask (taskId) {
      this.selectedTask = taskId;
    },
    setPomodoroSession(taskId) {
      this.pomodoroSession = taskId;
    },
    setPomodoroIndex(pomodoroIndex) {
      this.pomodoroIndex = pomodoroIndex;
    },
    setNewState4Task(taskId, state) {
      this.task2UpdateState.id = taskId;
      this.task2UpdateState.state = state;
    }
  }
})
