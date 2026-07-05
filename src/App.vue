<template>
  <router-view />
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { onMounted } from 'vue'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  console.log('[App] onMounted - ruta actual:', route.fullPath)
  console.log('[App] onMounted - params:', route.params)
  console.log('[App] router.currentRoute:', router.currentRoute.value.fullPath)
})

</script>
