import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase'
import { useUserStore } from '../stores/user'
import MainLayout from '../layouts/MainLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'
import SubmissionPrep from '../components/submission/SubmissionPrep.vue'

// 引入 Views
import DefensePage from '../views/services/DefensePage.vue'
// ✅ 新增引入 DefenseWorkflow
import DefenseWorkflow from '../views/services/DefenseWorkflow.vue'
import DesignAroundWorkflow from '../views/services/DesignAroundWorkflow.vue'
// DesignAround.vue 我們通常在下面用懶加載引入
import InfringementWorkflow from '../views/services/InfringementWorkflow.vue'
import PatentAnalysisWorkflow from '../views/services/PatentAnalysisWorkflow.vue'

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
        component: () => import('../views/auth/Register.vue')
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
      
      // ========== AI 服務中心路由 ==========
      
      // 1. 專利檢索
      {
        path: 'services/search',
        name: 'PatentSearch',
        component: () => import('../views/services/PatentSearch.vue')
      },

      // 2. 迴避設計 (Design Around) - ✅ 新增與修改
      {
        // 列表頁：管理所有迴避設計案件
        path: 'services/design-around-workflow',
        name: 'DesignAroundWorkflow',
        component: DesignAroundWorkflow, // 或 () => import('../views/services/DesignAroundWorkflow.vue')
        meta: { requiresAuth: true }
      },
      {
        // 詳細頁/操作頁：單一案件分析 (透過 ?job_id=... 控制)
        path: 'services/design-around',
        name: 'DesignAround',
        component: () => import('../views/services/DesignAround.vue'),
        meta: { requiresAuth: true }
      },

      // 3. 專利答辯 (新增的部分)
      {
        // ✅ 列表頁：顯示所有答辯案件
        path: 'services/defense-workflow', 
        name: 'DefenseWorkflow',
        component: DefenseWorkflow,
        meta: { requiresAuth: true }
      },
      {
        // ✅ 詳細頁/操作頁：單一案件分析 (透過 ?job_id=... 控制)
        path: 'services/defense',
        name: 'PatentDefense',
        component: DefensePage,
        meta: { requiresAuth: true }
      },

      // 4. 其他分析服務
      {
        path: 'services/patent-analysis-workflow',
        name: 'PatentAnalysisWorkflow',
        component: PatentAnalysisWorkflow,
        meta: { requiresAuth: true }
      },
      {
        path: 'services/patent-analysis',
        name: 'PatentAnalysis',
        component: () => import('../views/services/PatentAnalysis.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'services/patent-analysis',
        name: 'PatentAnalysis',
        component: () => import('../views/services/PatentAnalysis.vue')
      },
      {
        path: 'services/infringement-workflow',
        name: 'InfringementWorkflow',
        component: InfringementWorkflow,
        meta: { requiresAuth: true }
      },
      {
        path: 'services/infringement',
        name: 'Infringement',
        component: () => import('../views/services/Infringement.vue'),
        meta: { requiresAuth: true }
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

      // 5. 專利撰寫流程 (Drafting)
      {
        path: 'services/workflow',
        name: 'PatentDraftingWorkflow',
        component: () => import('../views/services/PatentDraftingWorkflow.vue')
      },
      {
        path: 'services/drafting',
        name: 'PatentDrafting',
        component: () => import('../views/services/Drafting.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'services/drafting/edit/:jobId',
        name: 'DraftingEdit',
        component: () => import('../views/services/Drafting.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'services/revision/:jobId',
        name: 'Revision',
        component: () => import('../views/services/RevisionPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'services/qc/:jobId',
        name: 'QC',
        component: () => import('../views/services/QCPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        // 注意：這裡使用 components 路徑可能不符合慣例，建議之後移到 views
        path: 'services/submission/:id',
        name: 'SubmissionPrep',
        component: SubmissionPrep,
        meta: { requiresAuth: true }
      },

      // 系統設定
      {
        path: 'credits',
        name: 'Credits',
        component: () => import('../views/credits/CreditsManagement.vue')
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/settings/UserSettings.vue')
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

