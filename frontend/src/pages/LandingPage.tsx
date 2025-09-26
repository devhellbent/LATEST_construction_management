import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  HardHat, 
  Wrench, 
  Truck, 
  Users, 
  BarChart3, 
  Shield, 
  CheckCircle,
  ArrowRight,
  Play,
  Star,
  Award,
  Clock,
  Target,
  Package
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  const features = [
    {
      icon: Building2,
      title: 'Project Management',
      description: 'Streamline construction projects with comprehensive tracking and management tools.'
    },
    {
      icon: Package,
      title: 'Material Management',
      description: 'Efficient inventory control, procurement, and material tracking systems.'
    },
    {
      icon: Users,
      title: 'Labor Management',
      description: 'Track workforce, attendance, and payroll with advanced labor management features.'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Real-time insights and comprehensive reporting for informed decision making.'
    },
    {
      icon: Shield,
      title: 'Safety Compliance',
      description: 'Ensure safety standards and regulatory compliance across all projects.'
    },
    {
      icon: Truck,
      title: 'Supply Chain',
      description: 'Optimize supply chain operations with integrated procurement and logistics.'
    }
  ];

  const stats = [
    { number: '500+', label: 'Projects Completed' },
    { number: '50+', label: 'Active Clients' },
    { number: '1000+', label: 'Team Members' },
    { number: '99%', label: 'Client Satisfaction' }
  ];

  const benefits = [
    'Real-time project tracking and monitoring',
    'Automated workflow management',
    'Comprehensive financial reporting',
    'Mobile-first responsive design',
    'Advanced security and data protection',
    '24/7 customer support'
  ];

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white overflow-hidden flex flex-col items-center justify-center">
      {/* Main Content */}
      <div className="text-center space-y-8 max-w-2xl mx-auto px-6">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="h-16 w-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">LMInfra</h1>
            <p className="text-slate-400">Construction Management System</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xl text-slate-300 leading-relaxed">
          Professional construction management solution for modern infrastructure projects.
        </p>

        {/* Login Button */}
        <button
          onClick={handleLoginClick}
          className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 mx-auto group"
        >
          <span>Sign In</span>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-slate-400 text-sm">
        © 2025 LMInfra. All rights reserved.
      </div>
    </div>
  );
};

export default LandingPage;
