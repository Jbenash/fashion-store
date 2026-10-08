import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { RequireAdmin, RequireAuth } from './components/Guards';
import { AuthProvider } from './store/auth';
import { CartProvider } from './store/cart';
import { ToastProvider } from './store/toast';
import { ConfirmProvider } from './store/confirm';

import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import MyOrders from './pages/MyOrders';
import OrderDetail from './pages/OrderDetail';
import Bulk from './pages/Bulk';
import NotFound from './pages/NotFound';

import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/AdminProducts';
import ProductForm from './pages/admin/ProductForm';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminCategories from './pages/admin/AdminCategories';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route element={<Layout />}>
                  {/* Storefront */}
                  <Route path="/" element={<Home />} />
                  <Route path="/products" element={<Catalog />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/bulk" element={<Bulk />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Customer account */}
                  <Route
                    path="/checkout"
                    element={
                      <RequireAuth>
                        <Checkout />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/account/orders"
                    element={
                      <RequireAuth>
                        <MyOrders />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/orders/:id"
                    element={
                      <RequireAuth>
                        <OrderDetail />
                      </RequireAuth>
                    }
                  />

                  {/* Admin */}
                  <Route
                    path="/admin"
                    element={
                      <RequireAdmin>
                        <AdminLayout />
                      </RequireAdmin>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="orders/:id" element={<AdminOrderDetail />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="products/new" element={<ProductForm />} />
                    <Route path="products/:id" element={<ProductForm />} />
                    <Route path="categories" element={<AdminCategories />} />
                  </Route>

                  <Route
                    path="/account"
                    element={<Navigate to="/account/orders" replace />}
                  />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </CartProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
