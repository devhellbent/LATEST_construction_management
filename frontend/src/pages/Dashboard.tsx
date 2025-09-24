import React from 'react';
import { useQuery } from 'react-query';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  FileText,
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { projectsAPI, tasksAPI, issuesAPI, materialsAPI, expensesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch dashboard data
  const { data: projectsData } = useQuery('projects', () => projectsAPI.getProjects({ limit: 100 }));
  const { data: tasksData } = useQuery('tasks', () => tasksAPI.getTasks({ limit: 100 }));
  const { data: issuesData } = useQuery('issues', () => issuesAPI.getIssues({ limit: 100 }));
  const { data: materialsData } = useQuery('materials', () => materialsAPI.getMaterials({ limit: 100 }));
  const { data: expensesData } = useQuery('expenses', () => expensesAPI.getExpenses({ limit: 100 }));

  const projects = projectsData?.data?.projects || [];
  const tasks = tasksData?.data?.tasks || [];
  const issues = issuesData?.data?.issues || [];
  const materials = materialsData?.data?.materials || [];
  const expenses = expensesData?.data?.expenses || [];

  // Calculate statistics
  const ongoingProjects = projects.filter((p: any) => p.status === 'ACTIVE').length;
  const completedProjects = projects.filter((p: any) => p.status === 'COMPLETED').length;
  const delayedProjects = projects.filter((p: any) => p.status === 'ON_HOLD').length;
  const openTasks = tasks.filter((t: any) => t.status === 'TODO').length;

  // Material utilization data
  const materialUtilizationData = [
    { name: 'Cement', value: 30, color: '#7B61FF' },
    { name: 'Sand', value: 25, color: '#FFC107' },
    { name: 'Steel', value: 20, color: '#4CAF50' },
    { name: 'Other Materials', value: 25, color: '#9C27B0' }
  ];

  // Task completion data
  const taskCompletionData = [
    { name: 'City Mall Development', completion: 85 },
    { name: 'Horizon Towers Construction', completion: 64 },
    { name: 'Metro Station Renovation', completion: 42 },
    { name: 'Business Park Expansion', completion: 35 },
    { name: 'Green Heights Residential Complex', completion: 15 }
  ];

  // Recent notifications
  const notifications = [
    {
      type: 'assignment',
      title: 'Site Inspection Required',
      time: '10 minutes ago',
      icon: FileText,
      color: 'text-primary-600'
    },
    {
      type: 'inventory',
      title: 'Cement Supply Low',
      time: '2 hours ago',
      icon: AlertTriangle,
      color: 'text-warning-600'
    },
    {
      type: 'completion',
      title: 'City Mall Development',
      time: '1 day ago',
      icon: CheckCircle,
      color: 'text-secondary-600'
    }
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          {getGreeting()}, {user?.name}. Please find your project overview below.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ongoing Projects</p>
              <p className="text-3xl font-bold text-gray-900">{ongoingProjects}</p>
              <div className="mt-2">
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ width: '60%' }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">60% in progress</span>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Projects</p>
              <p className="text-3xl font-bold text-gray-900">{completedProjects}</p>
              <div className="mt-2">
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-secondary-600 h-2 rounded-full" 
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">100% completed</span>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 bg-secondary-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-secondary-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Delayed Projects</p>
              <p className="text-3xl font-bold text-gray-900">{delayedProjects}</p>
              <div className="mt-2">
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-warning-600 h-2 rounded-full" 
                      style={{ width: '40%' }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">40% completed, delayed</span>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 bg-warning-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{openTasks}</p>
              <div className="mt-2">
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ width: '70%' }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">70% assigned</span>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Material Utilization */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Utilization</h3>
          <div className="flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={materialUtilizationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {materialUtilizationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">65%</div>
                  <div className="text-sm text-gray-600">Utilized</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {materialUtilizationData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Completion Status */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Completion Status</h3>
          <div className="space-y-4">
            {taskCompletionData.map((project, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">{project.name}</span>
                  <span className="text-sm text-gray-600">{project.completion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      project.completion >= 70 ? 'bg-primary-600' : 
                      project.completion >= 40 ? 'bg-warning-600' : 'bg-danger-600'
                    }`}
                    style={{ width: `${project.completion}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="card p-6 border-2 border-dashed border-danger-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h3>
          <div className="space-y-4">
            {notifications.map((notification, index) => {
              const Icon = notification.icon;
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${notification.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <p className="text-xs text-gray-500">{notification.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
