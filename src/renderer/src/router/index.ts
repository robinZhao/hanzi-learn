import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@renderer/views/HomeView.vue')
    },
    {
      path: '/collection',
      name: 'collection',
      component: () => import('@renderer/views/CollectionView.vue')
    },
    {
      path: '/character/:id',
      name: 'character-detail',
      component: () => import('@renderer/views/CharacterDetail.vue'),
      props: true
    },
    {
      path: '/dictionary',
      name: 'dictionary',
      component: () => import('@renderer/views/DictionaryView.vue')
    },
    {
      path: '/radicals',
      name: 'radicals',
      component: () => import('@renderer/views/RadicalExplorer.vue')
    },
    {
      path: '/radicals/:radicalId',
      name: 'radical-detail',
      component: () => import('@renderer/views/RadicalExplorer.vue'),
      props: true
    },
    {
      path: '/learn',
      name: 'learn',
      component: () => import('@renderer/views/LearningView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@renderer/views/SettingsView.vue')
    }
  ]
})

export default router
