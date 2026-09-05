import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useThemeSettings } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { isGamePath } from '../games'

// Reusable Rupee icon
const RupeeIcon = ({ size = 20, fontSize = 12 }) => (
    <div
        style={{
            width: size,
            height: size,
            minWidth: size,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'var(--accent-blue, #2f8cff)',
            color: '#fff',
            fontWeight: 800,
            fontSize,
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
            lineHeight: 1,
        }}
    >
        ₹
    </div>
)

function Header({ menuOpen, menuButtonRef, onMenuClick }) {
    const location = useLocation()
    const navigate = useNavigate()

    const { balance, transactions, toasts } = useWallet()
    const { paletteId, palettes, setPaletteId } = useThemeSettings()

    const [user, setUser] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [showWalletDropdown, setShowWalletDropdown] = useState(false)
    const [showProfileMenu, setShowProfileMenu] = useState(false)

    const dropdownRef = useRef(null)
    const profileRef = useRef(null)

    const isGamePage = isGamePath(location.pathname)
    const isHomePage = location.pathname === '/'

    // Get currently logged-in Supabase user and check admin status
    useEffect(() => {
        let mounted = true

        const checkAdmin = async (currentUser) => {
            if (!currentUser) {
                if (mounted) {
                    setIsAdmin(false)
                }
                return
            }

            const { data, error } = await supabase
                .from('admin_users')
                .select('user_id')
                .eq('user_id', currentUser.id)
                .maybeSingle()

            if (mounted) {
                setIsAdmin(!error && !!data)
            }
        }

        const loadUser = async () => {
            const { data, error } = await supabase.auth.getUser()

            if (!error && mounted) {
                const currentUser = data?.user ?? null
                setUser(currentUser)
                await checkAdmin(currentUser)
            }
        }

        loadUser()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return

            const currentUser = session?.user ?? null

            setUser(currentUser)
            await checkAdmin(currentUser)
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    // Close wallet/profile dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {
                setShowWalletDropdown(false)
            }

            if (
                profileRef.current &&
                !profileRef.current.contains(e.target)
            ) {
                setShowProfileMenu(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setIsAdmin(false)
        setShowProfileMenu(false)
        navigate('/')
    }

    const openAdminPanel = () => {
        setShowProfileMenu(false)
        navigate('/admin/wallet')
    }

    const formattedBalance = balance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })

    const displayName =
        user?.email?.split('@')[0] || 'Profile'

    return (
        <header className={`header ${isHomePage ? 'header-home' : ''}`}>

            <div className="header-left">
                <Link to="/" className="logo-link">
                    <span
                        className="logo"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        LePaisa
                    </span>
                </Link>
            </div>

            <div className="header-center">

                <div className="header-wallet">

                    <button
                        type="button"
                        className="mobile-wallet-balance"
                        aria-label={`Open wallet, balance ${formattedBalance}`}
                        aria-expanded={showWalletDropdown}
                        onClick={() =>
                            setShowWalletDropdown(!showWalletDropdown)
                        }
                    >
                        <RupeeIcon size={18} fontSize={11} />
                        <span>{formattedBalance}</span>
                    </button>

                    <>
                        <div className="wallet-balance-display">
                            <RupeeIcon size={18} fontSize={11} />

                            <span className="wallet-balance-amount">
                                {formattedBalance}
                            </span>

                            <button
                                type="button"
                                className="wallet-dropdown-toggle"
                                onClick={() =>
                                    setShowWalletDropdown(
                                        !showWalletDropdown
                                    )
                                }
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    width="14"
                                    height="14"
                                    fill="currentColor"
                                >
                                    <path d="M7 10l5 5 5-5z" />
                                </svg>
                            </button>
                        </div>

                        <button
                            type="button"
                            className="wallet-btn"
                            onClick={() =>
                                setShowWalletDropdown(
                                    !showWalletDropdown
                                )
                            }
                        >
                            Wallet
                        </button>
                    </>

                    {/* Wallet Dropdown */}
                    {showWalletDropdown && (
                        <div
                            className="wallet-dropdown"
                            ref={dropdownRef}
                        >
                            <div className="wallet-dropdown-header">
                                <h4>Wallet</h4>

                                <button
                                    type="button"
                                    className="wallet-close-btn"
                                    onClick={() =>
                                        setShowWalletDropdown(false)
                                    }
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="wallet-balance-section">
                                <div className="wallet-balance-label">
                                    Total Balance
                                </div>

                                <div className="wallet-balance-big">
                                    <RupeeIcon size={28} fontSize={16} />
                                    {formattedBalance}
                                </div>
                            </div>

                            <div className="wallet-actions">

                                <button
                                    type="button"
                                    className="wallet-action-card wallet-deposit-card"
                                    onClick={() => {
                                        setShowWalletDropdown(false)
                                        navigate('/wallet?tab=deposit')
                                    }}
                                >
                                    <span className="wallet-action-icon">
                                        ＋
                                    </span>

                                    <span className="wallet-action-copy">
                                        <strong>Deposit</strong>
                                        <small>
                                            Add payment reference details
                                        </small>
                                    </span>

                                    <span className="wallet-action-arrow">
                                        →
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className="wallet-action-card wallet-withdraw-card"
                                    onClick={() => {
                                        setShowWalletDropdown(false)
                                        navigate('/wallet?tab=withdraw')
                                    }}
                                >
                                    <span className="wallet-action-icon">
                                        ↗
                                    </span>

                                    <span className="wallet-action-copy">
                                        <strong>Withdrawal</strong>
                                        <small>
                                            Add a card and choose an amount
                                        </small>
                                    </span>

                                    <span className="wallet-action-arrow">
                                        →
                                    </span>
                                </button>

                            </div>

                            <div className="wallet-transactions">
                                <h5>Recent Activity</h5>

                                {transactions.length === 0 ? (
                                    <div className="wallet-no-tx">
                                        No transactions yet
                                    </div>
                                ) : (
                                    <div className="wallet-tx-list">
                                        {transactions
                                            .slice(0, 8)
                                            .map((tx) => (
                                                <div
                                                    key={tx.id}
                                                    className={`wallet-tx-item ${tx.type}`}
                                                >
                                                    <div className="wallet-tx-info">
                                                        <span className="wallet-tx-type">
                                                            {tx.type === 'bet' &&
                                                                '🎲 Bet'}

                                                            {tx.type === 'win' &&
                                                                '🏆 Win'}

                                                            {tx.type === 'deposit' &&
                                                                '💰 Deposit'}

                                                            {tx.type === 'reset' &&
                                                                '🔄 Reset'}
                                                        </span>

                                                        <span className="wallet-tx-time">
                                                            {tx.timestamp.toLocaleTimeString()}
                                                        </span>
                                                    </div>

                                                    <span
                                                        className={`wallet-tx-amount ${
                                                            tx.amount >= 0
                                                                ? 'positive'
                                                                : 'negative'
                                                        }`}
                                                    >
                                                        {tx.amount >= 0
                                                            ? '+'
                                                            : ''}
                                                        ₹
                                                        {Math.abs(
                                                            tx.amount
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Game Toasts */}
                    {isGamePage && toasts.length > 0 && (
                        <div className="wallet-toast-container">
                            {toasts.map((toast) => (
                                <div
                                    key={toast.id}
                                    className={`wallet-toast wallet-toast-${toast.type}`}
                                >
                                    <div className="wallet-toast-icon">

                                        {toast.type === 'bet' && (
                                            <RupeeIcon
                                                size={20}
                                                fontSize={11}
                                            />
                                        )}

                                        {toast.type === 'win' && (
                                            <svg
                                                viewBox="0 0 24 24"
                                                width="16"
                                                height="16"
                                                fill="none"
                                                stroke="var(--success)"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}

                                        {toast.type === 'loss' && (
                                            <svg
                                                viewBox="0 0 24 24"
                                                width="16"
                                                height="16"
                                                fill="none"
                                                stroke="#ed4245"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <line
                                                    x1="18"
                                                    y1="6"
                                                    x2="6"
                                                    y2="18"
                                                />
                                                <line
                                                    x1="6"
                                                    y1="6"
                                                    x2="18"
                                                    y2="18"
                                                />
                                            </svg>
                                        )}

                                        {toast.type === 'error' && (
                                            <svg
                                                viewBox="0 0 24 24"
                                                width="16"
                                                height="16"
                                                fill="none"
                                                stroke="#f7931a"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <circle
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                />
                                                <line
                                                    x1="12"
                                                    y1="8"
                                                    x2="12"
                                                    y2="12"
                                                />
                                                <line
                                                    x1="12"
                                                    y1="16"
                                                    x2="12.01"
                                                    y2="16"
                                                />
                                            </svg>
                                        )}

                                    </div>

                                    <div className="wallet-toast-content">
                                        <span className="wallet-toast-title">
                                            {toast.title}
                                        </span>

                                        <span className="wallet-toast-desc">
                                            {toast.description}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                {!isGamePage && (
                    <div className="search-input-wrapper">

                        <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="var(--text-secondary)"
                            className="search-icon"
                        >
                            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </svg>

                        <input
                            type="text"
                            placeholder="Search your game"
                            className="search-input"
                        />

                    </div>
                )}

            </div>

            <div className="header-right">

                <label className="palette-select-label">

                    <span className="palette-select-text">
                        Palette
                    </span>

                    <select
                        className="palette-select"
                        value={paletteId}
                        onChange={(event) =>
                            setPaletteId(event.target.value)
                        }
                        aria-label="Color palette"
                    >
                        {palettes.map((palette) => (
                            <option
                                key={palette.id}
                                value={palette.id}
                            >
                                {palette.name}
                            </option>
                        ))}
                    </select>

                </label>

                {isGamePage ? (
                    <>
                        <button
                            type="button"
                            className="header-icon-btn"
                            title="Search"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                fill="currentColor"
                            >
                                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            className="header-icon-btn"
                            title="Profile"
                            onClick={() =>
                                setShowProfileMenu(!showProfileMenu)
                            }
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                fill="currentColor"
                            >
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            className="header-icon-btn"
                            title="Notifications"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                fill="currentColor"
                            >
                                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 .83.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            className="header-icon-btn"
                            title="Chat"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                fill="currentColor"
                            >
                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                            </svg>
                        </button>
                    </>
                ) : (
                    <>
                        {user ? (
                            <div
                                ref={profileRef}
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <button
                                    type="button"
                                    className="btn btn-login"
                                    onClick={() =>
                                        setShowProfileMenu(
                                            !showProfileMenu
                                        )
                                    }
                                >
                                    👤 {displayName}
                                </button>

                                {showProfileMenu && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: 'calc(100% + 10px)',
                                            minWidth: '210px',
                                            padding: '12px',
                                            borderRadius: '10px',
                                            background: '#10283d',
                                            boxShadow:
                                                '0 10px 30px rgba(0,0,0,0.35)',
                                            zIndex: 1000,
                                        }}
                                    >
                                        <div
                                            style={{
                                                color: '#9fb3c8',
                                                fontSize: '13px',
                                                padding: '8px',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {user.email}
                                        </div>

                                        {/* ADMIN PANEL */}
                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={openAdminPanel}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    marginTop: '4px',
                                                    border: 'none',
                                                    borderRadius: '7px',
                                                    background: '#2477ff',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                ⚙ Admin Panel
                                            </button>
                                        )}

                                        {/* PROFILE */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowProfileMenu(false)
                                                navigate('/profile')
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                marginTop: isAdmin
                                                    ? '6px'
                                                    : '4px',
                                                border: 'none',
                                                borderRadius: '7px',
                                                background: '#1d3d59',
                                                color: '#fff',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            My Profile
                                        </button>

                                        {/* SIGN OUT */}
                                        <button
                                            type="button"
                                            onClick={handleSignOut}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                marginTop: '6px',
                                                border: 'none',
                                                borderRadius: '7px',
                                                background: '#c0392b',
                                                color: '#fff',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="btn btn-login"
                                    onClick={() =>
                                        navigate('/signin')
                                    }
                                >
                                    Sign In
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-register"
                                    onClick={() =>
                                        navigate('/register')
                                    }
                                >
                                    Register
                                </button>
                            </>
                        )}
                    </>
                )}

                <button
                    ref={menuButtonRef}
                    type="button"
                    className="mobile-menu-button"
                    aria-label="Open navigation menu"
                    aria-haspopup="dialog"
                    aria-expanded={menuOpen}
                    onClick={onMenuClick}
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="22"
                        height="22"
                        fill="currentColor"
                    >
                        <path d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2z" />
                    </svg>
                </button>

            </div>
        </header>
    )
}

export default Header