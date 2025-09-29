'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './providers'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Settings,
  Wrench,
  MessageSquare,
  UserPlus,
  FileText,
  UserCog,
  Brain,
  LogOut,
  Church,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Attendance', href: '/attendance', icon: Calendar },
  { name: 'Finance', href: '/finance', icon: DollarSign },
  { name: 'Equipment', icon: Wrench, href: '/equipment' },
  { name: 'SMS Broadcast', href: '/sms', icon: MessageSquare },
  { name: 'Visitors', href: '/visitors', icon: UserPlus },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Users', href: '/admin/users', icon: UserCog, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'AI Features', href: '/ai', icon: Brain },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true
    return user?.role && item.roles.includes(user.role)
  })

  if (!user) return null

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white shadow-lg"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-emerald-400 to-yellow-400 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-center px-6 py-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Church className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="text-white">
                <h1 className="text-lg font-bold">Church Management</h1>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 pb-4">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200",
                        isActive
                          ? "bg-white bg-opacity-20 text-white shadow-lg"
                          : "text-white hover:bg-white hover:bg-opacity-10"
                      )}
                    >
                      {isActive && (
                        <div className="w-1 h-6 bg-white rounded-full mr-3" />
                      )}
                      <item.icon className={cn("h-5 w-5 mr-3", !isActive && "mr-6")} />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t border-white border-opacity-20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-emerald-600 text-sm font-bold">
                  {user.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-white">
                <p className="text-sm font-medium">{user.full_name}</p>
                <p className="text-xs opacity-80 capitalize">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
            </div>
            
            <Button
              onClick={signOut}
              variant="ghost"
              className="w-full justify-start text-white hover:bg-white hover:bg-opacity-10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
