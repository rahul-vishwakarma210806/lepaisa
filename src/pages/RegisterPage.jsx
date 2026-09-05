import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function RegisterPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)

    // Referral code from URL:
    // /register?ref=4fde3adc
    const referralCode = searchParams.get('ref')?.trim() || ''

    const handleRegister = async (e) => {
        e.preventDefault()

        setError('')
        setMessage('')
        setLoading(true)

        try {
            /*
             * Send the referral code through Supabase user metadata.
             * A database trigger reads referral_code_used after the new
             * user's profile is created and credits ₹100 to the referrer.
             * The referred user receives ₹0.
             */
            const { data, error: signUpError } =
                await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        data: {
                            referral_code_used:
                                referralCode || null,
                        },
                    },
                })

            if (signUpError) {
                setError(signUpError.message)
                return
            }

            if (!data?.user) {
                setError('Unable to create account.')
                return
            }

            /*
             * DO NOT manually update referred_by here.
             *
             * referred_by is UUID.
             * referralCode is text.
             *
             * The database trigger handles the conversion.
             */

            if (data.session) {
                navigate('/')
            } else {
                setMessage(
                    'Account created successfully. Please check your email to confirm your account.'
                )
            }
        } catch (err) {
            console.error('Registration error:', err)

            setError(
                err?.message ||
                'Something went wrong while creating your account.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                background: '#071a2b',
            }}
        >
            <form
                onSubmit={handleRegister}
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '32px',
                    borderRadius: '16px',
                    background: '#10283d',
                    boxSizing: 'border-box',
                }}
            >
                <h1
                    style={{
                        color: '#fff',
                        marginTop: 0,
                        marginBottom: '8px',
                    }}
                >
                    Create Account
                </h1>

                <p
                    style={{
                        color: '#9fb3c8',
                        marginBottom: '20px',
                    }}
                >
                    Create your LePaisa account
                </p>

                {referralCode && (
                    <div
                        style={{
                            marginBottom: '16px',
                            padding: '12px',
                            borderRadius: '8px',
                            background: '#0b2033',
                            color: '#62d68b',
                            fontSize: '14px',
                        }}
                    >
                        Referral code applied:{' '}
                        <strong>{referralCode}</strong>
                    </div>
                )}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    style={{
                        width: '100%',
                        padding: '14px',
                        marginTop: '4px',
                        boxSizing: 'border-box',
                        borderRadius: '8px',
                        border: '1px solid #31506b',
                        outline: 'none',
                    }}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    autoComplete="new-password"
                    style={{
                        width: '100%',
                        padding: '14px',
                        marginTop: '12px',
                        boxSizing: 'border-box',
                        borderRadius: '8px',
                        border: '1px solid #31506b',
                        outline: 'none',
                    }}
                />

                {error && (
                    <div
                        style={{
                            marginTop: '14px',
                            padding: '12px',
                            borderRadius: '8px',
                            background: '#3a1720',
                            color: '#ff6b6b',
                            fontSize: '14px',
                        }}
                    >
                        {error}
                    </div>
                )}

                {message && (
                    <div
                        style={{
                            marginTop: '14px',
                            padding: '12px',
                            borderRadius: '8px',
                            background: '#123524',
                            color: '#62d68b',
                            fontSize: '14px',
                        }}
                    >
                        {message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '14px',
                        marginTop: '16px',
                        border: 'none',
                        borderRadius: '8px',
                        background: loading
                            ? '#536d86'
                            : '#2f8cff',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: loading
                            ? 'not-allowed'
                            : 'pointer',
                    }}
                >
                    {loading
                        ? 'Creating account...'
                        : 'Register'}
                </button>

                <p
                    style={{
                        color: '#9fb3c8',
                        textAlign: 'center',
                        marginTop: '20px',
                        marginBottom: 0,
                    }}
                >
                    Already have an account?{' '}
                    <Link
                        to="/signin"
                        style={{
                            color: '#4da3ff',
                            textDecoration: 'none',
                        }}
                    >
                        Sign In
                    </Link>
                </p>
            </form>
        </div>
    )
}

export default RegisterPage