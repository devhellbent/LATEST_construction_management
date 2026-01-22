import React, { useMemo } from 'react';
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

  // ===== Summary statistics (driven by database) =====
  const totalProjects = projects.length || 0;
  const ongoingProjects = projects.filter((p: any) => p.status === 'ACTIVE').length;
  const completedProjects = projects.filter((p: any) => p.status === 'COMPLETED').length;
  const delayedProjects = projects.filter((p: any) => p.status === 'ON_HOLD').length;

  const totalTasks = tasks.length || 0;
  const openTasks = tasks.filter((t: any) => t.status === 'TODO').length;

  const ongoingProjectsPercent = totalProjects ? Math.round((ongoingProjects / totalProjects) * 100) : 0;
  const completedProjectsPercent = totalProjects ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const delayedProjectsPercent = totalProjects ? Math.round((delayedProjects / totalProjects) * 100) : 0;
  const openTasksPercent = totalTasks ? Math.round((openTasks / totalTasks) * 100) : 0;

  // Clamp percentages between 0 and 100
  const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

  const displayOngoingPercent = clampPercent(ongoingProjectsPercent);
  const displayCompletedPercent = clampPercent(completedProjectsPercent);
  const displayDelayedPercent = clampPercent(delayedProjectsPercent);
  const displayOpenTasksPercent = clampPercent(openTasksPercent);

  // ===== Material utilization (grouped by category using stock quantity) =====
  const MATERIAL_COLORS = ['#7B61FF', '#FFC107', '#4CAF50', '#9C27B0', '#FF7043', '#26C6DA'];

  const materialUtilizationData = useMemo(() => {
    if (!materials || materials.length === 0) return [];

    const totalsByCategory = new Map<string, number>();

    materials.forEach((m: any) => {
      const category = m.category || 'Uncategorized';
      const quantity = typeof m.stock_qty === 'number' ? m.stock_qty : 0;
      totalsByCategory.set(category, (totalsByCategory.get(category) || 0) + quantity);
    });

    const totalQuantity = Array.from(totalsByCategory.values()).reduce((sum, qty) => sum + qty, 0) || 1;

    const sortedCategories = Array.from(totalsByCategory.entries()).sort((a, b) => b[1] - a[1]);

    const topCategories = sortedCategories.slice(0, 4).map(([name, qty], index) => ({
      name,
      value: Math.round((qty / totalQuantity) * 100),
      color: MATERIAL_COLORS[index % MATERIAL_COLORS.length],
    }));

    return topCategories;
  }, [materials]);

  const activeMaterialsPercent = useMemo(() => {
    if (!materials || materials.length === 0) return 0;
    const activeCount = materials.filter((m: any) => (typeof m.stock_qty === 'number' ? m.stock_qty : 0) > 0).length;
    return clampPercent(Math.round((activeCount / materials.length) * 100));
  }, [materials]);

  // ===== Task completion per project (top 5 projects) =====
  const taskCompletionData = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const perProject = new Map<number, { total: number; completed: number }>();

    tasks.forEach((t: any) => {
      if (!t.project_id) return;
      const existing = perProject.get(t.project_id) || { total: 0, completed: 0 };
      existing.total += 1;

      const status = (t.status || '').toUpperCase();
      if (['COMPLETED', 'DONE', 'FINISHED', 'CLOSED'].includes(status)) {
        existing.completed += 1;
      }

      perProject.set(t.project_id, existing);
    });

    const data = Array.from(perProject.entries()).map(([projectId, { total, completed }]) => {
      const project = projects.find((p: any) => p.project_id === projectId);
      const completion = total ? Math.round((completed / total) * 100) : 0;
      return {
        name: project?.name || `Project ${projectId}`,
        completion: clampPercent(completion),
      };
    });

    // Sort by completion percentage (descending) and take top 5
    return data.sort((a, b) => b.completion - a.completion).slice(0, 5);
  }, [tasks, projects]);

  // ===== Recent notifications from issues & tasks (latest few records) =====
  const notifications = useMemo(
    () => {
      const items: Array<{
        type: string;
        title: string;
        time: string;
        icon: any;
        color: string;
      }> = [];

      // Use latest issues as risk / alert notifications
      if (Array.isArray(issues) && issues.length > 0) {
        issues.slice(0, 3).forEach((issue: any) => {
          items.push({
            type: 'issue',
            title: issue.description || `Issue #${issue.issue_id}`,
            time: issue.date_raised ? `Raised on ${new Date(issue.date_raised).toLocaleDateString()}` : 'Issue',
            icon: AlertTriangle,
            color: 'text-warning-600',
          });
        });
      }

      // Use latest tasks as assignment / completion notifications
      if (Array.isArray(tasks) && tasks.length > 0) {
        tasks.slice(0, 3).forEach((task: any) => {
          const status = (task.status || '').toUpperCase();
          const isCompleted = ['COMPLETED', 'DONE', 'FINISHED', 'CLOSED'].includes(status);
          items.push({
            type: 'task',
            title: task.title || `Task #${task.task_id}`,
            time: task.end_date
              ? `Due on ${new Date(task.end_date).toLocaleDateString()}`
              : status ? status : 'Task',
            icon: isCompleted ? CheckCircle : FileText,
            color: isCompleted ? 'text-secondary-600' : 'text-primary-600',
          });
        });
      }

      // Fallback to at least one message so card never looks empty
      if (items.length === 0) {
        items.push({
          type: 'info',
          title: 'No recent tasks or issues',
          time: 'You are all caught up!',
          icon: TrendingUp,
          color: 'text-primary-600',
        });
      }

      // Limit to 5 most recent-style items
      return items.slice(0, 5);
    },
    [issues, tasks]
  );

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
                      style={{ width: `${displayOngoingPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-600">
                    {displayOngoingPercent}%
                  </span>
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
                      style={{ width: `${displayCompletedPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-600">
                    {displayCompletedPercent}%
                  </span>
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
                      style={{ width: `${displayDelayedPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-600">
                    {displayDelayedPercent}%
                  </span>
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
                      style={{ width: `${displayOpenTasksPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-600">
                    {displayOpenTasksPercent}%
                  </span>
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
                    <div className="text-lg sm:text-2xl font-bold text-gray-900">
                      {activeMaterialsPercent}%
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Active Items</div>
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
