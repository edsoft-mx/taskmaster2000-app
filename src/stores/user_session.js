import { defineStore } from 'pinia';

export const useSessionStore = defineStore('user_session', {
  state: () => ({
    username: "",
    jwt: "",
    apiUrl: "http://localhost:5000/",
  }),

  getters: {
    getCurrentUser (state) {
      return state.username;
    },
    getJwt(state){
      return state.jwt
    },
    getAPIUrl(state) {
      return state.apiUrl;
    }
  },
  actions: {
    setCurrentUser (userName, jwt) {
      this.username = userName
      this.jwt = jwt
    },
    setApiURL(apiUrl) {
      this.apiUrl = apiUrl
    }
  }
})
