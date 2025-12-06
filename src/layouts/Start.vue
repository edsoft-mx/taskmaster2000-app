<script setup>
defineOptions({
  name: 'StartPage'
})

import {onBeforeMount} from "vue";

import { useRouter } from "vue-router";
const router = useRouter();

onBeforeMount(()=>{
  console.log('Before Mount')
  let sp=new URLSearchParams(location.search)
  let pageParam = sp.get('page')
  sp.delete('page')
  const params = sp.toString()
  if (pageParam) {
    router.push({path: `/${pageParam}`, query: params})
  }
})

</script>

<template>
  <router-view></router-view>
</template>

<style scoped>

</style>
