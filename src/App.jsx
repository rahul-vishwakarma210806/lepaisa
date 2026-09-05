import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { App as AntApp } from 'antd'
import Layout from './components/Layout'

const HomePage = lazy(() => import('./pages/HomePage'))
const CrashPage = lazy(() => import('./pages/CrashPage'))
const PlinkoPage = lazy(() => import('./pages/PlinkoPage'))
const DinoPage = lazy(() => import('./pages/DinoPage'))
const MinesPage = lazy(() => import('./pages/MinesPage'))
const ReferPage = lazy(() => import('./pages/ReferPage'))

const SignInPage = lazy(() => import('./pages/SignInPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const WalletPage = lazy(() => import('./pages/WalletPage'))
const AdminWalletPage = lazy(() => import('./pages/AdminWalletPage'))

function App() {
    return (
        <AntApp>
            <Suspense
                fallback={
                    <div
                        className="route-loading"
                        role="status"
                        aria-live="polite"
                    >
                        Loading…
                    </div>
                }
            >
                <Routes>

                    {/* Main application */}
                    <Route path="/" element={<Layout />}>
                        <Route index element={<HomePage />} />
                        <Route path="crash" element={<CrashPage />} />
                        <Route path="plinko" element={<PlinkoPage />} />
                        <Route path="dino" element={<DinoPage />} />
                        <Route path="mines" element={<MinesPage />} />
                        <Route path="refer" element={<ReferPage />} />
                        <Route path="wallet" element={<WalletPage />} />
                    </Route>

                    {/* Authentication */}
                    <Route
                        path="/signin"
                        element={<SignInPage />}
                    />

                    <Route
                        path="/register"
                        element={<RegisterPage />}
                    />

                    {/* Admin panel */}
                    <Route
                        path="/admin"
                        element={<AdminWalletPage />}
                    />

                    {/* Existing admin wallet route */}
                    <Route
                        path="/admin/wallet"
                        element={<AdminWalletPage />}
                    />

                    {/* User profile */}
                    <Route
                        path="/profile"
                        element={<ProfilePage />}
                    />

                </Routes>
            </Suspense>
        </AntApp>
    )
}

export default App