import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { authService } from "../../services/auth.service";

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const role = authService.getUserRole();

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-primary-600">BumbuKu Admin</h2>
          <p className="text-sm text-gray-600 mt-1">
            {user?.name} ({role})
          </p>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {/* Dashboard */}
            <li>
              <Link
                to="/admin"
                className="block px-4 py-2 rounded hover:bg-primary-50 hover:text-primary-600"
              >
                Dashboard
              </Link>
            </li>

            {/* POS / Kasir */}
            <li>
              <Link
                to="/admin/pos"
                className="block px-4 py-2 rounded hover:bg-primary-50 hover:text-primary-600"
              >
                POS / Kasir
              </Link>
            </li>

            {/* Transaksi */}
            <li>
              <Link
                to="/admin/transactions"
                className="block px-4 py-2 rounded hover:bg-primary-50 hover:text-primary-600"
              >
                Transaksi
              </Link>
            </li>

            {/* Produk */}
            <li>
              <Link
                to="/admin/products"
                className="block px-4 py-2 rounded hover:bg-primary-50 hover:text-primary-600"
              >
                Produk
              </Link>
            </li>

            {/* Kategori */}
            <li>
              <Link
                to="/admin/categories"
                className="block px-4 py-2 rounded hover:bg-primary-50 hover:text-primary-600"
              >
                Kategori
              </Link>
            </li>

            {/* Stok */}
            <li>
              <Link
                to="/admin/inventory"
                className="block px-4 py-2 rounded hover:bg-primary-50 hover:text-primary-600"
              >
                Stok
              </Link>
            </li>

            {/* Laporan */}
            <li>
              <Link
                to="/admin/reports"
                className="block px-4 py-2 rounded hover:bg-primary-50 hover:text-primary-600"
              >
                Laporan
              </Link>
            </li>

            {/* Staff (hanya untuk OWNER) */}
            {role === "OWNER" && (
              <li>
                <Link
                  to="/admin/staff"
                  className="block px-4 py-2 rounded hover:bg-primary-50 hover:text-primary-600"
                >
                  Staff
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-end px-8">
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-red-600"
          >
            Logout
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
