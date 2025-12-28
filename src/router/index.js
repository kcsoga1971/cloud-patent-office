import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase'
import { useUserStore } from '../stores/user'  // 🎯 加上這行
import MainLayout from '../layouts/MainLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'
import SubmissionPrep from '../components/submission/SubmissionPrep.vue'//引入送件準備文件

const routes = [
  // 認證相關路由
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('../views/auth/Login.vue')
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('../views/auth/Register.vue')      // ❌ 移除 Register（檔案不存在）
      }
    ]
  },
  
  // 主要應用路由
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/DashboardHome.vue')
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('../views/projects/ProjectList.vue')
      },
      
      // ✅ AI 服務中心路由（只保留存在的檔案）
      {
        path: 'services/search',
        name: 'PatentSearch',
        component: () => import('../views/services/PatentSearch.vue')
      },
      {
        path: 'services/design-around',
        name: 'DesignAround',
        component: () => import('../views/services/DesignAround.vue')
      },
      {
        path: 'services/oa-response',
        name: 'OAResponse',
        component: () => import('../views/services/OAResponse.vue')
      },
      {
        path: 'services/analysis',
        name: 'Analysis',
        component: () => import('../views/services/Analysis.vue')
      },
      {
        path: 'services/patent-analysis',
        name: 'PatentAnalysis',
        component: () => import('../views/services/PatentAnalysis.vue')
      },
      {
        path: 'services/infringement',
        name: 'Infringement',
        component: () => import('../views/services/Infringement.vue')
      },
      {
        path: 'services/valuation',
        name: 'Valuation',
        component: () => import('../views/services/Valuation.vue')
      },
      {
        path: 'services/invalidation',
        name: 'Invalidation',
        component: () => import('../views/services/Invalidation.vue')
      },
      {
        path: 'services/case-management',
        name: 'CaseManagement',
        component: () => import('../views/services/CaseManagement.vue')
      },
      {
        path: 'services/workflow',
        name: 'PatentDraftingWorkflow',
        component: () => import('../views/services/PatentDraftingWorkflow.vue')
      },
      {
        path: 'services/drafting',  // 🎯 新增：直接撰寫的路由
        name: 'PatentDrafting',
        component: () => import('../views/services/Drafting.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'services/drafting/edit/:jobId',  // 🎯 新增：編輯案件的路由
        name: 'DraftingEdit',
        component: () => import('../views/services/Drafting.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/services/revision/:jobId',
        name: 'Revision',
        component: () => import('../views/services/RevisionPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/services/qc/:jobId',
        name: 'QC',
        component: () => import('../views/services/QCPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'credits',
        name: 'Credits',
        component: () => import('../views/credits/CreditsManagement.vue')
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/settings/UserSettings.vue')
      },
      {
        path: '/components/submission/:id',
        name: 'SubmissionPrep',
        component: SubmissionPrep,
        meta: { requiresAuth: true }
      }            
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守衛
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  if (requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      next('/auth/login')
    } else {
      // 🎯 在這裡確保 userStore 已初始化
      const userStore = useUserStore()
      if (!userStore.user) {
        await userStore.fetchUser()
      }
      next()
    }
  } else {
    next()
  }
})

export default router

