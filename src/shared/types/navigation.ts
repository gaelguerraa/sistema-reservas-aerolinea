import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'
import type { Rol } from './api'

export interface NavigationItem {
  label: string
  path: string
  allowedRoles: readonly Rol[]
  shortcut?: string
}

export interface FeatureModule {
  routes: RouteObject[]
  navigation: NavigationItem[]
}

export interface PageProps {
  children?: ReactNode
}
