// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase'
import { useUserStore } from '../stores/user'
import MainLayout from '../layouts/MainLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'

// 引入 Views (舊有的 Workflow 引用，若已刪除檔案請移除對應引用)
import DefensePage from '../views/services/DefensePage.vue'
import DefenseWorkflow from '../views/services/DefenseWorkflow.vue'
// import DesignAroundWorkflow from '../views/services/DesignAroundWorkflow.vue' // ❌ 移除舊版引用
import InfringementWorkflow from '../views/services/InfringementWorkflow.vue'
import PatentAnalysisWorkflow from '../views/services/PatentAnalysisWorkflow.vue'
import ValuationWorkflow from '../views/services/ValuationWorkflow.vue'
import InvalidationWorkflow from '../views/services/InvalidationWorkflow.vue'
import PatentSearch from '../views/services/PatentSearch.vue'
import KnowledgeBase from '../views/knowledge/KnowledgeBase.vue'
import KnowledgeDetail from '../views/knowledge/KnowledgeDetail.vue'
import ExpertReview from '../views/admin/ExpertReview.vue'
import SubmissionPrep from '../views/services/SubmissionPrep.vue'

// ========== 🆕 新增：專利申請書相關 Views ==========
import AmendmentWorkflow from '../views/services/AmendmentWorkflow.vue'
import CorrectionWorkflow from '../views/services/CorrectionWorkflow.vue'
import ReexaminationWorkflow from '../views/services/ReexaminationWorkflow.vue'
import RectificationWorkflow from '../views/services/RectificationWorkflow.vue'
import InvalidationSearchStrategyPage from '@/views/InvalidationSearchStrategyPage.vue'

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

  // 管理專家審查頁面路由
  {
    path: '/admin/expert-review',
    name: 'ExpertReview',
    component: ExpertReview,
    meta: { 
      requiresAuth: true,
      requiresExpert: true
    }
  },  

    // 🆕 隱藏的開發者工具頁面
  {
    path: '/dev/search-strategy',
    name: 'dev-search-strategy',
    component: InvalidationSearchStrategyPage,
    meta: {
      hidden: true, // 不顯示在導航列
      requiresAuth: false // 可以根據需求加上驗證
    }
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
        path: 'services/patent-search',
        name: 'PatentSearch',
        component: PatentSearch,
        meta: { requiresAuth: true, title: '專利檢索' }
      },

      // 2. 迴避設計 (Design Around) - ✅ 更新為新版 Manager
      {
        path: 'services/design-around',
        name: 'DesignAroundManager',
        // 指向新的資料夾結構
        component: () => import('../views/services/design-around/DesignAroundManager.vue'),
        meta: { requiresAuth: true, title: '專利迴避設計' }
      },
      // (舊的 /services/design-around-workflow 路由已移除，由 Manager 統一管理)

      // 3. 專利佈局 (Portfolio) - ✅ 更新為新版 Manager
      {
        path: 'services/portfolio',
        name: 'PortfolioManager',
        component: () => import('../views/services/portfolio/PortfolioManager.vue'),
        meta: { requiresAuth: true, title: '專利佈局策略' }
      },

      // 4. 專利答辯
      {
        path: 'services/defense-workflow', 
        name: 'DefenseWorkflow',
        component: DefenseWorkflow,
        meta: { requiresAuth: true, title: '專利答辯' }
      },
      {
        path: 'services/defense',
        name: 'PatentDefense',
        component: DefensePage,
        meta: { requiresAuth: true }
      },

      // 5. 其他分析服務
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
        path: 'services/valuation-workflow',
        name: 'ValuationWorkflow',
        component: ValuationWorkflow,
        meta: { requiresAuth: true }
      },
      {
        path: 'services/valuation',
        name: 'Valuation',
        component: () => import('../views/services/Valuation.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'services/invalidation-workflow',
        name: 'InvalidationWorkflow',
        component: () => import('../views/services/InvalidationWorkflow.vue'),
        meta: { requiresAuth: true, title: '專利舉發' }
      },
      {
        path: 'services/invalidation',
        name: 'PatentInvalidation',
        component: () => import('../views/services/InvalidationPage.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'services/case-management',
        name: 'CaseManagement',
        component: () => import('../views/services/CaseManagement.vue')
      },

      // 5. 專利撰寫流程 (Drafting)
      {
        path: 'services/drafting-workflow',
        name: 'PatentDraftingWorkflow',
        component: () => import('../views/services/PatentDraftingWorkflow.vue')
      },
      {
        path: 'services/drafting',
        name: 'PatentDrafting',
        component: () => import('../views/services/Drafting.vue'),
        meta: { requiresAuth: true, title: '專利撰寫' }
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
        path: 'services/submission/:jobId',
        name: 'SubmissionPrep',
        component: () => import('../views/services/SubmissionPrep.vue'),
        meta: { requiresAuth: true }
      },

      // ========== 🆕 6. 專利申請書服務 ==========
      
      // 6.1 專利修正 (Amendment)
      {
        path: 'services/amendment',
        name: 'AmendmentWorkflow',
        component: AmendmentWorkflow,
        meta: { 
          requiresAuth: true,
          title: '專利修正案件管理'
        }
      },
      {
        path: 'services/amendment/prep/:jobId?',
        name: 'AmendmentPrep',
        component: () => import('../views/services/AmendmentPrep.vue'),
        meta: { 
          requiresAuth: true,
          title: '專利修正申請書'
        }
      },

      // 6.2 專利補正 (Correction)
      {
        path: 'services/correction',
        name: 'CorrectionWorkflow',
        component: CorrectionWorkflow,
        meta: { 
          requiresAuth: true,
          title: '專利補正案件管理'
        }
      },
      {
        path: 'services/correction/prep/:jobId?',
        name: 'CorrectionPrep',
        component: () => import('../views/services/CorrectionPrep.vue'),
        meta: { 
          requiresAuth: true,
          title: '專利補正文件申請書'
        }
      },

      // 6.3 專利再審查 (Reexamination)
      {
        path: 'services/reexamination',
        name: 'ReexaminationWorkflow',
        component: ReexaminationWorkflow,
        meta: { 
          requiresAuth: true,
          title: '專利再審查案件管理'
        }
      },
      {
        path: 'services/reexamination/prep/:jobId?',
        name: 'ReexaminationPrep',
        component: () => import('../views/services/ReexaminationPrep.vue'),
        meta: { 
          requiresAuth: true,
          title: '專利再審查申請書'
        }
      },

      // 6.4 專利更正 (Rectification)
      {
        path: 'services/rectification',
        name: 'RectificationWorkflow',
        component: RectificationWorkflow,
        meta: { 
          requiresAuth: true,
          title: '專利更正案件管理'
        }
      },
      {
        path: 'services/rectification/prep/:jobId?',
        name: 'RectificationPrep',
        component: () => import('../views/services/RectificationPrep.vue'),
        meta: { 
          requiresAuth: true,
          title: '專利更正申請書'
        }
      },
      // ========== 🆕 7. 專利舉發申請書 ==========
      {
        path: 'services/invalidation-application',
        name: 'InvalidationApplicationWorkflow',
        component: () => import('../views/services/InvalidationApplicationWorkflow.vue'),
        meta: { 
          requiresAuth: true,
          title: '專利舉發申請書管理'
        }
      },
      {
        path: 'services/invalidation-application/prep/:jobId?',
        name: 'InvalidationPrep',
        component: () => import('../views/services/InvalidationPrep.vue'),
        meta: { 
          requiresAuth: true,
          title: '專利舉發申請書'
        }
      },

      // ========== 🆕 8. 專利翻譯服務 ==========
      // 專利翻譯 - 工作流程列表
      {
        path: 'services/translation/workflow',
        name: 'translation-workflow',
        component: () => import('../views/services/PatentTranslationWorkflow.vue'),
        meta: {
          requiresAuth: true,
          title: '專利翻譯記錄'
        }
      },
      // 專利翻譯 - 執行介面
      {
        path: 'services/translation/:id?', // 加入 :id? 允許帶入過去的紀錄ID
        name: 'translation',
        component: () => import('../views/services/PatentTranslation.vue'),
        meta: {
          requiresAuth: true,
          title: '專利翻譯服務'
        }
      },

      // ========== 知識庫 ==========
      {
        path: 'knowledge',
        name: 'KnowledgeBase',
        component: KnowledgeBase,
        meta: { requiresAuth: false }
      },
      {
        path: 'knowledge/:id',
        name: 'KnowledgeDetail',
        component: KnowledgeDetail,
        meta: { requiresAuth: false }
      },

      // ========== 系統設定 ==========
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
  },

  // ========== 404 頁面 ==========
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守衛
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  // 設置頁面標題
  if (to.meta.title) {
    document.title = `${to.meta.title} - 專利申請系統`
  } else {
    document.title = '專利申請系統'
  }

  // 如果頁面需要 Expert 權限
  if (to.meta.requiresExpert) {
    if (!userStore.profile) await userStore.fetchUser()
    
    if (userStore.profile?.role !== 'expert') {
      alert('無權訪問此頁面')
      return next('/')
    }
  }
  
  if (requiresAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      next('/auth/login')
    } else {
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

