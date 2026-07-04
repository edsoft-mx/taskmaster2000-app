<script setup>
defineOptions({
  name: 'StartPage',
})

import { onBeforeMount } from 'vue'

import { useRouter } from 'vue-router'
const router = useRouter()

onBeforeMount(() => {
  console.log('start.BeforeMount')
  console.log(location.search)
  let sp = new URLSearchParams(location.search)
  const obj = Object.fromEntries(sp)
  console.log(obj)
  if (obj.page != null) {
    console.log('obj.page')
    let pageParam = sp.get('page')
    sp.delete('page')
    const params = sp.toString()
    console.log('pageParam', pageParam)
    console.log('params', params)

    if (pageParam) {
      router.push({ path: `/${pageParam}`, query: params })
    } else {
      router.push({ path: '/MainLayout' })
    }
  } else {
    console.log('obj.component')
    let component = sp.get('component')
    if (component === 'taskEditor') {
      router.push({
        name: 'taskEditor',
        params: {
          idBoard: sp.get('idBoard'),
          hierarchy: sp.get('hierarchy'),
        },
        query: {
          state: sp.get('state'),
        },
      })
    }
  }
})
</script>

<template>
  <router-view></router-view>
</template>

<style scoped></style>
