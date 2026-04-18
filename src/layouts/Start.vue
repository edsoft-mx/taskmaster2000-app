<script setup>
defineOptions({
  name: 'StartPage',
})

import { onBeforeMount } from 'vue'

import { useRouter } from 'vue-router'
const router = useRouter()

onBeforeMount(() => {
  console.log('Before Mount')
  console.log(location.search)
  let sp = new URLSearchParams(location.search)

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
})
</script>

<template>
  <router-view></router-view>
</template>

<style scoped></style>
