import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function ProfilePage() {
    const navigate = useNavigate()

    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true)
            setError('')

            const { data: authData, error: authError } =
                await supabase.auth.getUser()

            if (authError || !authData?.user) {
                navigate('/signin')
                return
            }

            const currentUser = authData.user
            setUser(currentUser)

            const { data: profileData, error: profileError } =
                await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentUser.id)
                    .maybeSingle()

            if (profileError) {
                setError(profileError.message)
            } else {
                setProfile(profileData)
            }

            setLoading(false)
        }

        loadProfile()
    }, [navigate])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        navigate('/signin')
    }

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <p style={styles.text}>Loading profile...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div style={styles.page}>
            <div style={styles.card}>

                <Link to="/" style={styles.back}>
                    ← Back to LePaisa
                </Link>

                <div style={styles.avatar}>
                    👤
                </div>

                <h1 style={styles.title}>
                    My Profile
                </h1>

                <p style={styles.subtitle}>
                    Your LePaisa account information
                </p>

                {error && (
                    <div style={styles.error}>
                        {error}
                    </div>
                )}

                <div style={styles.infoBox}>
                    <div style={styles.label}>Email</div>
                    <div style={styles.value}>
                        {user.email}
                    </div>
                </div>

                <div style={styles.infoBox}>
                    <div style={styles.label}>User UID</div>
                    <div style={styles.uid}>
                        {user.id}
                    </div>
                </div>

                <div style={styles.infoBox}>
                    <div style={styles.label}>Referral Code</div>
                    <div style={styles.value}>
                        {profile?.referral_code || 'Not available'}
                    </div>
                </div>

                <div style={styles.infoBox}>
                    <div style={styles.label}>Referral Earnings</div>
                    <div style={styles.value}>
                        ₹{profile?.referral_earnings ?? '0.00'}
                    </div>
                </div>

                <div style={styles.infoBox}>
                    <div style={styles.label}>Account Created</div>
                    <div style={styles.value}>
                        {user.created_at
                            ? new Date(user.created_at).toLocaleString()
                            : 'Not available'}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSignOut}
                    style={styles.signOut}
                >
                    Sign Out
                </button>

            </div>
        </div>
    )
}

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        background: 'var(--bg-primary, #071a2b)',
    },

    card: {
        width: '100%',
        maxWidth: '520px',
        padding: '32px',
        borderRadius: '18px',
        background: 'var(--bg-secondary, #10283d)',
        boxSizing: 'border-box',
        boxShadow: '0 15px 45px rgba(0, 0, 0, 0.35)',
    },

    back: {
        color: '#4da3ff',
        textDecoration: 'none',
        fontSize: '14px',
    },

    avatar: {
        width: '72px',
        height: '72px',
        margin: '28px auto 16px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1d3d59',
        fontSize: '32px',
    },

    title: {
        margin: 0,
        textAlign: 'center',
        color: '#fff',
    },

    subtitle: {
        textAlign: 'center',
        color: '#9fb3c8',
        marginBottom: '28px',
    },

    infoBox: {
        padding: '14px',
        marginBottom: '12px',
        borderRadius: '10px',
        background: '#0b2033',
        border: '1px solid #254762',
    },

    label: {
        color: '#8da5ba',
        fontSize: '12px',
        marginBottom: '6px',
    },

    value: {
        color: '#fff',
        fontSize: '15px',
        wordBreak: 'break-word',
    },

    uid: {
        color: '#b9c9d8',
        fontSize: '13px',
        wordBreak: 'break-all',
    },

    error: {
        padding: '12px',
        marginBottom: '15px',
        borderRadius: '8px',
        background: '#4a1f25',
        color: '#ff8f8f',
    },

    text: {
        color: '#fff',
        textAlign: 'center',
    },

    signOut: {
        width: '100%',
        padding: '14px',
        marginTop: '16px',
        border: 'none',
        borderRadius: '8px',
        background: '#c0392b',
        color: '#fff',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
    },
}

export default ProfilePage