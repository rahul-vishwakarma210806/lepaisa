import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function SignInPage() {
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSignIn = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        setLoading(false)

        if (error) {
            setError(error.message)
            return
        }

        navigate('/')
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary, #071a2b)',
            padding: '20px'
        }}>
            <form
                onSubmit={handleSignIn}
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '32px',
                    borderRadius: '16px',
                    background: 'var(--bg-secondary, #10283d)',
                }}
            >
                <h1 style={{ color: 'white', marginBottom: '8px' }}>
                    Sign In
                </h1>

                <p style={{ color: '#9fb3c8', marginBottom: '24px' }}>
                    Sign in to your LePaisa account
                </p>

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                        width: '100%',
                        padding: '14px',
                        marginBottom: '14px',
                        borderRadius: '8px',
                        border: '1px solid #31506b',
                        boxSizing: 'border-box'
                    }}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                        width: '100%',
                        padding: '14px',
                        marginBottom: '14px',
                        borderRadius: '8px',
                        border: '1px solid #31506b',
                        boxSizing: 'border-box'
                    }}
                />

                {error && (
                    <p style={{ color: '#ff6b6b', marginBottom: '14px' }}>
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '14px',
                        border: 'none',
                        borderRadius: '8px',
                        background: '#2f8cff',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                    }}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <p style={{
                    color: '#9fb3c8',
                    textAlign: 'center',
                    marginTop: '20px'
                }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: '#4da3ff' }}>
                        Register
                    </Link>
                </p>
            </form>
        </div>
    )
}

export default SignInPage