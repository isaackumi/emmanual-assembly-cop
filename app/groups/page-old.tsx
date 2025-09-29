'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Group } from '@/lib/types'
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Calendar,
  MapPin,
  User,
  ArrowLeft,
  Settings,
  Eye,
  Edit,
  MoreHorizontal,
  Crown,
  Star
} from 'lucide-react'

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchGroups()
    }
  }, [user])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      console.log('Fetching groups...')
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          leader:app_users!leader_id(full_name, membership_id),
          co_leader:app_users!co_leader_id(full_name, membership_id)
        `)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching groups:', error)
        throw error
      }
      
      console.log('Groups fetched:', data)
      setGroups(data || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredGroups = groups.filter(group => {
    const matchesSearch = searchTerm === '' || 
      group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || group.group_type === filterType
    
    return matchesSearch && matchesType
  })

  const getGroupTypeColor = (type: string) => {
    switch (type) {
      case 'ministry': return 'bg-purple-100 text-purple-800'
      case 'fellowship': return 'bg-blue-100 text-blue-800'
      case 'age_group': return 'bg-green-100 text-green-800'
      case 'special_interest': return 'bg-yellow-100 text-yellow-800'
      case 'leadership': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'ministry': return <Settings className="h-4 w-4" />
      case 'fellowship': return <Users className="h-4 w-4" />
      case 'age_group': return <User className="h-4 w-4" />
      case 'special_interest': return <Star className="h-4 w-4" />
      case 'leadership': return <Crown className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
                className="mr-3 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
              Groups & Ministries
            </h1>
            <p className="text-gray-600">Manage church groups, ministries, and fellowships</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => router.push('/groups/add')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Groups</p>
                  <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{groups.length}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Ministries</p>
                  <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {groups.filter(g => g.group_type === 'ministry').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Settings className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Fellowships</p>
                  <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {groups.filter(g => g.group_type === 'fellowship').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Age Groups</p>
                  <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    {groups.filter(g => g.group_type === 'age_group').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search groups by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="ministry">Ministry</option>
                  <option value="fellowship">Fellowship</option>
                  <option value="age_group">Age Group</option>
                  <option value="special_interest">Special Interest</option>
                  <option value="leadership">Leadership</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getGroupTypeIcon(group.group_type)}
                    </div>
                    <Badge className={getGroupTypeColor(group.group_type)}>
                      {group.group_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/groups/${group.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/groups/${group.id}`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{group.name}</CardTitle>
                {group.description && (
                  <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Leaders */}
                {(group.leader || group.co_leader) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Leadership</h4>
                    <div className="space-y-1">
                      {group.leader && (
                        <div className="flex items-center space-x-2">
                          <Crown className="h-3 w-3 text-yellow-600" />
                          <span className="text-sm">{group.leader.full_name}</span>
                        </div>
                      )}
                      {group.co_leader && (
                        <div className="flex items-center space-x-2">
                          <Star className="h-3 w-3 text-blue-600" />
                          <span className="text-sm">{group.co_leader.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Meeting Information */}
                {group.meeting_schedule && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{group.meeting_schedule}</span>
                  </div>
                )}

                {group.meeting_location && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{group.meeting_location}</span>
                  </div>
                )}

                {/* Member Limit */}
                {group.max_members && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Capacity</span>
                    <span className="font-medium">{group.max_members} members</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredGroups.length === 0 && (
          <Card className="mt-6">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first group.'
                }
              </p>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push('/groups/add')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
