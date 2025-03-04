import { defineStore } from 'pinia';

export const useUISessionStore = defineStore('ui_state_session', {
  state: () => ({
    selectedTask: 0,
    pomodoroSession: 0,
    pomodoroIndex: 0,
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
    }
  }
})
