<!-- src/views/services/design-around/DesignAroundManager.vue -->
<script setup>
import { ref } from 'vue'
import DesignAroundList from './components/DesignAroundList.vue'
import DesignAroundWorkspace from './components/DesignAroundWorkspace.vue'
import ServiceTips from '@/components/ServiceTips.vue'  // ✅ 加入這行

const currentView = ref('list') 
const selectedJobId = ref(null)

const createNew = () => { 
  selectedJobId.value = null
  currentView.value = 'workspace' 
}

const openJob = (id) => { 
  selectedJobId.value = id
  currentView.value = 'workspace' 
}

const backToList = () => { 
  selectedJobId.value = null
  currentView.value = 'list' 
}
</script>

<template>
  <div class="da-manager">
    <Transition name="fade" mode="out-in">
      <DesignAroundList 
        v-if="currentView === 'list'" 
        @create="createNew" 
        @select="openJob" 
      />
      <DesignAroundWorkspace 
        v-else 
        :job-id="selectedJobId" 
        @back="backToList" 
      />
    </Transition>
    <ServiceTips type="design_around" class="tips-wrapper" />   
  </div>
</template>

<style scoped>
.da-manager {
  min-height: 100vh;
  background: #f5f7fa;
}

.fade-enter-active, 
.fade-leave-active { 
  transition: opacity 0.2s ease; 
}

.fade-enter-from, 
.fade-leave-to { 
  opacity: 0; 
}
</style>
