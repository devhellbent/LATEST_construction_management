import React from 'react';
import { useQuery } from 'react-query';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  FileText,
  TrendingUp,
  AlertTriangle,
  Package
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
    <div className="space-responsive">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-responsive-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-responsive-base text-slate-600">
          {getGreeting()}, <span className="font-semibold text-primary-600">{user?.name}</span>. Here's your project overview.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="card-mobile group hover:shadow-glow transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide">Ongoing Projects</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{ongoingProjects}</p>
              <div className="mt-3">
                <div className="flex items-center space-x-2">
                  <div className="progress-bar flex-1">
                    <div 
                      className="progress-fill" 
                      style={{ width: '60%' }}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-600">60%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">in progress</p>
              </div>
            </div>
            <div className="h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
              <Users className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="card-mobile group hover:shadow-glow-success transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide">Completed Projects</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{completedProjects}</p>
              <div className="mt-3">
                <div className="flex items-center space-x-2">
                  <div className="progress-bar flex-1">
                    <div 
                      className="h-full bg-gradient-to-r from-success-500 to-success-600 rounded-full transition-all duration-500 ease-out" 
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-600">100%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">completed</p>
              </div>
            </div>
            <div className="h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
              <CheckCircle className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="card-mobile group hover:shadow-glow-warning transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide">Delayed Projects</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{delayedProjects}</p>
              <div className="mt-3">
                <div className="flex items-center space-x-2">
                  <div className="progress-bar flex-1">
                    <div 
                      className="h-full bg-gradient-to-r from-warning-500 to-warning-600 rounded-full transition-all duration-500 ease-out" 
                      style={{ width: '40%' }}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-600">40%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">delayed</p>
              </div>
            </div>
            <div className="h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
              <Clock className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="card-mobile group hover:shadow-glow transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide">Open Tasks</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{openTasks}</p>
              <div className="mt-3">
                <div className="flex items-center space-x-2">
                  <div className="progress-bar flex-1">
                    <div 
                      className="progress-fill" 
                      style={{ width: '70%' }}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-600">70%</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">assigned</p>
              </div>
            </div>
            <div className="h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
              <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Material Utilization */}
        <div className="card-mobile">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Material Utilization</h3>
            <div className="h-6 w-6 sm:h-8 sm:w-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <Package className="h-3 w-3 sm:h-4 sm:w-4 text-primary-600" />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={150} height={150} className="sm:w-[200px] sm:h-[200px]">
                <PieChart>
                  <Pie
                    data={materialUtilizationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={60}
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
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">65%</div>
                  <div className="text-xs sm:text-sm text-gray-600">Utilized</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
            {materialUtilizationData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mr-2" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-xs sm:text-sm text-gray-600">{item.name}</span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Completion Status */}
        <div className="card-mobile">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Task Completion Status</h3>
            <div className="h-6 w-6 sm:h-8 sm:w-8 bg-success-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-success-600" />
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {taskCompletionData.map((project, index) => (
              <div key={index} className="space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-medium text-gray-900 truncate pr-2">{project.name}</span>
                  <span className="text-xs sm:text-sm text-gray-600">{project.completion}%</span>
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
        <div className="card-mobile border-2 border-dashed border-warning-300 bg-warning-50/30">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Recent Notifications</h3>
            <div className="h-6 w-6 sm:h-8 sm:w-8 bg-warning-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-warning-600" />
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {notifications.map((notification, index) => {
              const Icon = notification.icon;
              return (
                <div key={index} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg hover:bg-white/50 transition-colors">
                  <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white shadow-sm flex items-center justify-center border-2 border-slate-200`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${notification.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">{notification.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{notification.time}</p>
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
