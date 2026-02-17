import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCartIcon, UserIcon } from "@heroicons/react/24/outline";
import { useCartStore } from "../../store/cartStore";
import { authService } from "../../services/auth.service";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const itemCount = useCartStore((state) => state.getItemCount());
  const user = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();
  const role = authService.getUserRole();
  const cartItemCount = itemCount();

  const handleLogout = () => {
    authService.logout();
    navigate("/");
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600">BumbuKu</span>
            <span className="text-sm text-gray-500">Toko Bumbu</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary-600">
              Home
            </Link>
            <Link
              to="/products"
              className="text-gray-700 hover:text-primary-600"
            >
              Produk
            </Link>
            {role &&
              ["OWNER", "MANAGER", "CASHIER", "STAFF"].includes(role) && (
                <Link
                  to="/admin"
                  className="text-gray-700 hover:text-primary-600"
                >
                  Dashboard
                </Link>
              )}
          </div>

          {/* Right Icons */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link to="/cart" className="relative">
              <ShoppingCartIcon className="h-6 w-6 text-gray-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
              );
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-1">
                  <UserIcon className="h-6 w-6 text-gray-700" />
                  <span className="hidden md:inline text-sm">{user?.name}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden group-hover:block">
                  {role &&
                  ["OWNER", "MANAGER", "CASHIER", "STAFF"].includes(role) ? (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/customer/profile"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        Profile
                      </Link>
                      <Link
                        to="/customer/transactions"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        Transaksi
                      </Link>
                      <Link
                        to="/customer/addresses"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        Alamat
                      </Link>
                    </>
                  )}
                  <hr className="my-2" />
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
