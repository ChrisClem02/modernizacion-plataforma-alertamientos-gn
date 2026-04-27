import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminRoute from '../components/AdminRoute';
import AppLayout from '../components/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import AlertamientoDetailPage from '../pages/AlertamientoDetailPage';
import AlertamientosPage from '../pages/AlertamientosPage';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import UsuariosPage from '../pages/UsuariosPage';

// Router protegido extendido: ahora el frontend puede navegar entre dashboard,
// listado de alertamientos y detalle individual sin perder el control de sesion.
export const appRouter = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />
    },
    {
        path: '/login',
        element: <LoginPage />
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                element: <AppLayout />,
                children: [
                    {
                        path: '/dashboard',
                        element: <DashboardPage />
                    },
                    {
                        path: '/alertamientos',
                        element: <AlertamientosPage />
                    },
                    {
                        path: '/alertamientos/:id',
                        element: <AlertamientoDetailPage />
                    },
                    {
                        path: '/usuarios',
                        element: (
                            <AdminRoute>
                                <UsuariosPage />
                            </AdminRoute>
                        )
                    }
                ]
            }
        ]
    },
    {
        path: '*',
        element: <NotFoundPage />
    }
]);
