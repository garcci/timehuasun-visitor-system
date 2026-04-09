import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/components/Layout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '仪表盘' }
      },
      {
        path: 'config',
        name: 'Config',
        component: () => import('@/views/ConfigManager.vue'),
        meta: { title: '配置管理' }
      },
      {
        path: 'visitors',
        name: 'Visitors',
        component: () => import('@/views/VisitorList.vue'),
        meta: { title: '访客管理' }
      },
      {
        path: 'visitors/:id',
        name: 'VisitorDetail',
        component: () => import('@/views/VisitorDetail.vue'),
        meta: { title: '访客详情' }
      },
      {
        path: 'system',
        name: 'System',
        component: () => import('@/views/SystemMaintain.vue'),
        meta: { title: '系统维护' }
      },
      {
        path: 'update',
        name: 'SystemUpdate',
        component: () => import('@/views/SystemUpdate.vue'),
        meta: { title: '系统更新' }
      },
      {
        path: 'change-password',
        name: 'ChangePassword',
        component: () => import('@/views/system/ChangePassword.vue'),
        meta: { title: '修改密码' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  
  if (to.path === '/login') {
    next()
  } else {
    if (token) {
      next()
    } else {
      next('/login')
    }
  }
})

export default router
