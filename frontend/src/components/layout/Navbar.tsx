import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCartIcon, UserIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '../../store/cartStore';
import { authService } from '../../services/auth.service';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const cartCount = useCartStore(state => state.getItemCount());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const user = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();
  const role = authService.getUserRole();
  const isAdmin = authService.isAdmin?.() || (role && ['OWNER', 'MANAGER', 'CASHIER', 'STAFF'].includes(role));
  const isCustomer = authService.isCustomer?.() || (!isAdmin && isAuthenticated);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
    setIsDropdownOpen(false);
  };

  // Menutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Menutup dropdown saat navigasi
  const handleLinkClick = () => {
    setIsDropdownOpen(false);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600">BumbuKu</span>
            <span className="text-sm text-gray-500 hidden sm:inline">Toko Bumbu</span>
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary-600 transition-colors">
              Home
            </Link>
            <Link to="/products" className="text-gray-700 hover:text-primary-600 transition-colors">
              Produk
            </Link>
            {isAdmin && (
              <Link to="/admin" className="text-gray-700 hover:text-primary-600 transition-colors">
                Dashboard
              </Link>
            )}
          </div>

          {/* Right Icons */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ShoppingCartIcon className="h-6 w-6 text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <UserIcon className="h-6 w-6 text-gray-700" />
                  <span className="hidden md:inline text-sm font-medium text-gray-700">
                    {user?.name?.split(' ')[0] || user?.username}
                  </span>
                </button>
                
                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 border border-gray-200 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{user?.email || user?.username}</p>
                      {role && (
                        <span className="inline-block mt-2 px-2 py-1 bg-primary-50 text-primary-600 text-xs rounded-full">
                          {role}
                        </span>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {isAdmin ? (
                        // Admin Menu
                        <>
                          <Link 
                            to="/admin" 
                            onClick={handleLinkClick}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          >
                            Dashboard
                          </Link>
                          <Link 
                            to="/admin/pos" 
                            onClick={handleLinkClick}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          >
                            POS / Kasir
                          </Link>
                          <Link 
                            to="/admin/products" 
                            onClick={handleLinkClick}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          >
                            Kelola Produk
                          </Link>
                          <Link 
                            to="/admin/inventory" 
                            onClick={handleLinkClick}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          >
                            Manajemen Stok
                          </Link>
                          {role === 'OWNER' && (
                            <Link 
                              to="/admin/staff" 
                              onClick={handleLinkClick}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                            >
                              Kelola Staff
                            </Link>
                          )}
                        </>
                      ) : isCustomer ? (
                        // Customer Menu
                        <>
                          <Link 
                            to="/customer/profile" 
                            onClick={handleLinkClick}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          >
                            Profile Saya
                          </Link>
                          <Link 
                            to="/customer/transactions" 
                            onClick={handleLinkClick}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          >
                            Riwayat Transaksi
                          </Link>
                          <Link 
                            to="/customer/addresses" 
                            onClick={handleLinkClick}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          >
                            Alamat Saya
                          </Link>
                        </>
                      ) : null}
                    </div>

                    {/* Logout Button */}
                    <div className="border-t border-gray-100 py-2">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Not Logged In - Auth Links
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Login Admin
                </Link>
                <Link
                  to="/customer/login"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300"
                >
                  Login Customer
                </Link>
                <Link
                  to="/register"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Daftar
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;