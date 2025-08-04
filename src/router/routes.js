const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      //{ path: '', component: () => import('pages/IndexPage.vue') }
      { path: 'boards/:idBoard', component: () => import('pages/board.vue'),  name: 'aBoard', props: true  },
    ]
  },
  {
    path: '/timeline',
    component: ()=> import('layouts/timeline.vue')
  },
  {
    path: '/pomodoroTimer',
    component: ()=> import('layouts/pomodoroTimer.vue')
  },
  {
    path: '/admin_boards',
    component: ()=> import('layouts/boards.vue')
  },
  {
    path: '/admin_projects',
    component: ()=> import('layouts/projects.vue')
  },
  {
    path: '/admin_users',
    component: ()=> import('layouts/users.vue')
  },
  {
    path: '/admin_groups',
    component: ()=> import('layouts/groups.vue')
  },
  {
    path: '/board/:idBoard/task/:idTask/:idSubTask/:initialState?',
    component: ()=> import('layouts/task.vue'),
    name: 'taskEditor',
    props: true
  },
  {
    path: '/board/:idBoard/epic/:idEpic/:idTask/:initialState?',
    component: ()=> import('layouts/task.vue'),
    name: 'taskEditor2',
    props: true
  },
  {
    path: '/board/:idBoard/epic/:idEpic/:initialState?',
    component: ()=> import('layouts/epic.vue'),
    name: 'epicEditor',
    props: true
  },
  {
    path: '/timeEntry',
    component: ()=> import('layouts/timeEntry.vue'),
    name: 'timeEntry',
    props: true
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
