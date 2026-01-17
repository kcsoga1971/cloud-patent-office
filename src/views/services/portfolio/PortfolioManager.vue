<!-- src/views/services/portfolio/PortfolioManager.vue -->
<script setup>
import { ref } from 'vue'
import PortfolioList from './components/PortfolioList.vue'
import PortfolioWorkspace from './components/PortfolioWorkspace.vue'
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
  <div class="portfolio-manager">
    <Transition name="slide-fade" mode="out-in">
      <PortfolioList 
        v-if="currentView === 'list'" 
        @create="createNew" 
        @select="openJob" 
      />
      <PortfolioWorkspace 
        v-else 
        :job-id="selectedJobId" 
        @back="backToList" 
      />
    </Transition>
    <ServiceTips type="portfolio" class="tips-wrapper" />
  </div>
</template>

<style scoped>
.portfolio-manager {
  min-height: 100vh;
  background: #f8fafc;
}

/* 過渡動畫 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
