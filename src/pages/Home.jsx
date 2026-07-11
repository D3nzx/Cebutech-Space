import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Shield, BookOpen, ArrowRight } from 'lucide-react';

function Home() {
  const navigate = useNavigate();

  const portals = [
    {
      id: 'student',
      title: 'Student Portal',
      description: 'Access your class schedules, grades, and academic information',
      icon: GraduationCap,
      gradient: 'from-green-500 to-teal-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverShadow: 'hover:shadow-green-200',
      path: '/student'
    },
    {
      id: 'faculty',
      title: 'Faculty Portal',
      description: 'Manage your classes, view schedules, and track student progress',
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverShadow: 'hover:shadow-blue-200',
      path: '/faculty'
    },
    {
      id: 'program-head',
      title: 'Program Head Portal',
      description: 'Manage schedules, faculty, courses, and program administration',
      icon: Shield,
      gradient: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverShadow: 'hover:shadow-purple-200',
      path: '/login'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
              <BookOpen className="text-white" size={32} />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">Academic Portal</h1>
              <p className="text-gray-600 text-sm">Cebu Technological University</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to CTU Portal
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select your portal to access your personalized dashboard and resources
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {portals.map((portal) => {
            const IconComponent = portal.icon;
            return (
              <div
                key={portal.id}
                onClick={() => navigate(portal.path)}
                className={`${portal.bgColor} border-2 ${portal.borderColor} rounded-2xl p-8 cursor-pointer transition-all duration-300 hover:scale-105 ${portal.hoverShadow} hover:shadow-2xl group`}
              >
                {/* Icon */}
                <div className={`bg-gradient-to-br ${portal.gradient} w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="text-white" size={32} />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {portal.title}
                </h3>
                <p className="text-gray-600 mb-6 min-h-[60px]">
                  {portal.description}
                </p>

                {/* Button */}
                <button
                  className={`w-full bg-gradient-to-r ${portal.gradient} text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 group-hover:shadow-lg transition-all`}
                >
                  Access Portal
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Portal Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="text-blue-600" size={24} />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Secure Access</h4>
              <p className="text-sm text-gray-600">
                Your data is protected with industry-standard encryption
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="text-green-600" size={24} />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">24/7 Availability</h4>
              <p className="text-sm text-gray-600">
                Access your portal anytime, anywhere from any device
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="text-purple-600" size={24} />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Real-time Updates</h4>
              <p className="text-sm text-gray-600">
                Stay informed with instant notifications and updates
              </p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-3">Need Help?</h3>
          <p className="mb-6 text-blue-100">
            Contact our support team for assistance with your account or portal access
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors">
              Contact Support
            </button>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors border-2 border-white">
              View FAQ
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600 text-sm">
            <p className="mb-2">© 2025 Cebu Technological University. All rights reserved.</p>
            <div className="flex justify-center gap-6">
              <button className="hover:text-blue-600 transition-colors">Privacy Policy</button>
              <button className="hover:text-blue-600 transition-colors">Terms of Service</button>
              <button className="hover:text-blue-600 transition-colors">Help Center</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
