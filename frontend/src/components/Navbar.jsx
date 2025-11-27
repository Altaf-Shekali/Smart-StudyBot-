import React, { Fragment, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  BookOpenIcon,
  AcademicCapIcon,
  UserCircleIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../Context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isLoggedIn, userRole, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Home', href: '/', icon: AcademicCapIcon },
    { name: 'Subjects', href: '/subjects', icon: BookOpenIcon },
    { name: 'History', href: '/history', icon: BookOpenIcon },
    { name: 'Chat', href: '/student', icon: ChatBubbleLeftRightIcon },
    { name: 'Profile', href: '/profile', icon: UserCircleIcon },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) return null;

  return (
    <nav className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center space-x-2">
              <AcademicCapIcon className="h-8 w-8 text-purple-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                NoteNinja
              </span>
            </div>

            <div className="hidden md:block ml-10">
              <div className="flex space-x-4">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-gray-300 hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                  >
                    <item.icon className="h-5 w-5 mr-2" />
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center text-sm text-gray-300 hover:text-blue-400 transition-colors">
                    <UserCircleIcon className="h-8 w-8 mr-2" />
                    <span className="mr-1">{userRole?.toUpperCase()}</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </Menu.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-gray-800 border border-gray-700 focus:outline-none">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => navigate('/profile')}
                            className={`${
                              active ? 'bg-gray-700 text-white' : 'text-gray-300'
                            } block w-full text-left px-4 py-2 text-sm`}
                          >
                            Profile
                          </button>
                        )}
                      </Menu.Item>
                      {userRole === 'teacher' && (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => navigate('/teacher-management')}
                              className={`${
                                active ? 'bg-gray-700 text-white' : 'text-gray-300'
                              } block w-full text-left px-4 py-2 text-sm`}
                            >
                              📊 Management Dashboard
                            </button>
                          )}
                        </Menu.Item>
                      )}
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleLogout}
                            className={`${
                              active ? 'bg-gray-700 text-white' : 'text-gray-300'
                            } block w-full text-left px-4 py-2 text-sm`}
                          >
                            Logout
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-gray-900/80 z-50" onClick={() => setIsOpen(false)}>
          <div className="bg-gray-800 border-r border-gray-700 w-3/4 h-full p-4">
            <div className="pt-4 space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center"
                >
                  <item.icon className="h-5 w-5 mr-2" />
                  {item.name}
                </a>
              ))}
            </div>

            {!isLoggedIn && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <button
                  onClick={() => navigate('/login')}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="block px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700 mt-2"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
