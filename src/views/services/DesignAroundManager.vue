<!-- src/views/services/DesignAroundManager.vue -->
<script setup>
import { ref } from 'vue'
import DesignAroundList from './components/DesignAroundList.vue'
import DesignAroundWorkspace from './components/DesignAroundWorkspace.vue'

const currentView = ref('list') 
const selectedJobId = ref(null)

const createNew = () => { selectedJobId.value = null; currentView.value = 'workspace' }
const openJob = (id) => { selectedJobId.value = id; currentView.value = 'workspace' }
const backToList = () => { selectedJobId.value = null; currentView.value = 'list' }
</script>

<template>
  <div class="da-manager h-full">
    <Transition name="fade" mode="out-in">
      <DesignAroundList v-if="currentView === 'list'" @create="createNew" @select="openJob" />
      <DesignAroundWorkspace v-else :job-id="selectedJobId" @back="backToList" />
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>