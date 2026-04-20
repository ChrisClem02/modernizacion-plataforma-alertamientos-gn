import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import AlertamientoDetailPage from '../pages/AlertamientoDetailPage';
import AlertamientosPage from '../pages/AlertamientosPage';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';

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
