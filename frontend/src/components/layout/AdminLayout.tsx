// frontend/src/components/layout/AdminLayout.tsx
import React, { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { authService } from "../../services/auth.service";
import {
  HomeIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  TagIcon,
  CubeIcon,
  ChartBarIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const role = authService.getUserRole();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: HomeIcon },
    { name: "POS / Kasir", href: "/admin/pos", icon: ShoppingCartIcon },
    { name: "Transaksi", href: "/admin/transactions", icon: DocumentTextIcon },
    { name: "Produk", href: "/admin/products", icon: ShoppingBagIcon },
    { name: "Kategori", href: "/admin/categories", icon: TagIcon },
    { name: "Stok", href: "/admin/inventory", icon: CubeIcon },
    { name: "Laporan", href: "/admin/reports", icon: ChartBarIcon },
    { name: "Customers", href: "/admin/customers", icon: UsersIcon },

    ...(role === "OWNER"
      ? [{ name: "Staff", href: "/admin/staff", icon: UsersIcon }]
      : []),
  ];

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-white shadow-md transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Logo */}
        <div
          className={`p-4 border-b flex items-center ${sidebarOpen ? "justify-between" : "justify-center"}`}
        >
          {sidebarOpen ? (
            <>
              <div>
                <h2 className="text-xl font-bold text-primary-600">BumbuKu</h2>
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {user?.name} ({role})
                </p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors ${
                    sidebarOpen ? "justify-start gap-3" : "justify-center"
                  }`}
                  title={!sidebarOpen ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className={`flex items-center w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
              sidebarOpen ? "justify-start gap-3" : "justify-center"
            }`}
            title={!sidebarOpen ? "Logout" : undefined}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-md transform transition-transform duration-300 lg:hidden ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-primary-600">BumbuKu</h2>
            <p className="text-xs text-gray-600 mt-1">
              {user?.name} ({role})
            </p>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-3">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="text-sm">Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm h-14 flex items-center px-4 lg:px-6">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:inline">
              {user?.name} ({role})
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-red-600 lg:hidden"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
