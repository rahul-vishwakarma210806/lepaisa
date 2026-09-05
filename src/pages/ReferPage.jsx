import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getReferralLink } from '../utils/referral'
import { useWallet } from '../context/WalletContext'

function ReferPage() {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [referrals, setReferrals] = useState([])
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState('')
    const { refreshBalance } = useWallet()

    useEffect(() => {
        void loadReferralData()
    }, [])

    const loadReferralData = async () => {
        setLoading(true)
        setError('')

        try {
            // Get logged-in user
            const {
                data: authData,
                error: authError,
            } = await supabase.auth.getUser()

            if (authError) {
                throw new Error(authError.message)
            }

            if (!authData?.user) {
                setUser(null)
                setLoading(false)
                return
            }

            const currentUser = authData.user
            setUser(currentUser)

            // Get current user's profile
            const {
                data: profileData,
                error: profileError,
            } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .maybeSingle()

            if (profileError) {
                throw new Error(
                    `Profile error: ${profileError.message}`
                )
            }

            if (!profileData) {
                throw new Error(
                    'Your profile was not found in the profiles table.'
                )
            }

            setProfile(profileData)
            await refreshBalance(currentUser)

            // referred_by contains the referrer's UUID.
            const {
                data: referralData,
                error: referralError,
            } = await supabase
                .from('profiles')
                .select(
                    'id, email, referral_code, referred_by, created_at'
                )
                .eq('referred_by', currentUser.id)
                .order('created_at', {
                    ascending: false,
                })

            if (referralError) {
                throw new Error(
                    `Referral query error: ${referralError.message}`
                )
            }

            setReferrals(referralData || [])
        } catch (err) {
            console.error('Refer page error:', err)

            setError(
                err?.message ||
                    'Unable to load referral information.'
            )

            setReferrals([])
        } finally {
            setLoading(false)
        }
    }

    const referralCode = profile?.referral_code || ''

    const referralLink = getReferralLink(referralCode)

    const referralEarnings = Number(
        profile?.referral_earnings || 0
    )

    const copyReferralLink = async () => {
        if (!referralLink) return

        try {
            await navigator.clipboard.writeText(
                referralLink
            )

            setCopied(true)

            setTimeout(() => {
                setCopied(false)
            }, 2000)
        } catch (err) {
            console.error(err)

            setError(
                'Unable to copy referral link.'
            )
        }
    }

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <p style={styles.text}>
                        Loading referrals...
                    </p>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <h1 style={styles.title}>
                        Refer & Earn
                    </h1>

                    <p style={styles.subtitle}>
                        Please sign in to access your
                        referral program.
                    </p>

                    <Link
                        to="/signin"
                        style={styles.button}
                    >
                        Sign In
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div style={styles.page}>
            <div style={styles.card}>

                <Link
                    to="/"
                    style={styles.back}
                >
                    ← Back to LePaisa
                </Link>

                <h1 style={styles.title}>
                    Refer & Earn
                </h1>

                <p style={styles.subtitle}>
                    Invite your friends to LePaisa.
                    Earn ₹100 for every successful referral.
                </p>

                {error && (
                    <div style={styles.error}>
                        <strong>Error:</strong>
                        <br />
                        {error}
                    </div>
                )}

                {/* Referral Code */}
                <div style={styles.codeBox}>
                    <div style={styles.label}>
                        Your Referral Code
                    </div>

                    <div style={styles.code}>
                        {referralCode || 'Not available'}
                    </div>
                </div>

                {/* Earnings + Count */}
                <div style={styles.earningsBox}>

                    <div>
                        <div style={styles.label}>
                            Referral Earnings
                        </div>

                        <div style={styles.earnings}>
                            ₹
                            {referralEarnings.toFixed(2)}
                        </div>

                        <div style={styles.rewardText}>
                            ₹100 per successful referral
                        </div>
                    </div>

                    <div style={styles.referralCount}>

                        <strong
                            style={styles.referralNumber}
                        >
                            {referrals.length}
                        </strong>

                        <span>
                            {referrals.length === 1
                                ? 'Referral'
                                : 'Referrals'}
                        </span>

                    </div>
                </div>

                {/* Referral Link */}
                <div style={styles.shareBox}>

                    <div style={styles.label}>
                        Your Referral Link
                    </div>

                    <input
                        type="text"
                        value={referralLink}
                        readOnly
                        style={styles.input}
                        onFocus={(e) =>
                            e.target.select()
                        }
                    />

                    <button
                        type="button"
                        onClick={
                            copyReferralLink
                        }
                        disabled={!referralLink}
                        style={{
                            ...styles.button,
                            opacity: referralLink
                                ? 1
                                : 0.5,
                            cursor: referralLink
                                ? 'pointer'
                                : 'not-allowed',
                        }}
                    >
                        {copied
                            ? '✓ Copied!'
                            : 'Copy Referral Link'}
                    </button>
                </div>

                {/* Referral Rules */}
                <div style={styles.rulesBox}>
                    <h2 style={styles.rulesTitle}>
                        How Refer & Earn Works
                    </h2>

                    <div style={styles.rule}>
                        <span style={styles.ruleNumber}>
                            1
                        </span>

                        <span>
                            Share your referral link
                            with your friend.
                        </span>
                    </div>

                    <div style={styles.rule}>
                        <span style={styles.ruleNumber}>
                            2
                        </span>

                        <span>
                            Your friend registers
                            using your referral link.
                        </span>
                    </div>

                    <div style={styles.rule}>
                        <span style={styles.ruleNumber}>
                            3
                        </span>

                        <span>
                            Your friend gets
                            <strong> ₹0</strong>.
                        </span>
                    </div>

                    <div style={styles.rule}>
                        <span style={styles.ruleNumber}>
                            4
                        </span>

                        <span>
                            You receive
                            <strong> ₹100</strong>.
                        </span>
                    </div>
                </div>

                {/* Referrals */}
                <div style={styles.listBox}>

                    <h2 style={styles.listTitle}>
                        Your Referrals
                    </h2>

                    {referrals.length === 0 ? (
                        <p style={styles.muted}>
                            No referrals yet.
                        </p>
                    ) : (
                        referrals.map(
                            (referral) => (
                                <div
                                    key={
                                        referral.id
                                    }
                                    style={
                                        styles.referralRow
                                    }
                                >
                                    <div>
                                        <div
                                            style={
                                                styles.email
                                            }
                                        >
                                            {referral.email ||
                                                'Unknown user'}
                                        </div>

                                        <div
                                            style={
                                                styles.date
                                            }
                                        >
                                            {referral.created_at
                                                ? new Date(
                                                      referral.created_at
                                                  ).toLocaleDateString(
                                                      'en-IN'
                                                  )
                                                : ''}
                                        </div>
                                    </div>

                                    <div
                                        style={
                                            styles.joinedContainer
                                        }
                                    >
                                        <span
                                            style={
                                                styles.joined
                                            }
                                        >
                                            Joined
                                        </span>

                                        <span
                                            style={
                                                styles.reward
                                            }
                                        >
                                            +₹100
                                        </span>
                                    </div>
                                </div>
                            )
                        )
                    )}
                </div>

            </div>
        </div>
    )
}

const styles = {
    page: {
        minHeight: '100vh',
        padding: '30px 20px',
        boxSizing: 'border-box',
        background:
            'var(--bg-primary, #071a2b)',
        color: '#fff',
    },

    card: {
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
        padding: '32px',
        boxSizing: 'border-box',
        borderRadius: '18px',
        background:
            'var(--bg-secondary, #10283d)',
        boxShadow:
            '0 15px 45px rgba(0,0,0,.3)',
    },

    back: {
        color: '#4da3ff',
        textDecoration: 'none',
        fontSize: '14px',
    },

    title: {
        marginTop: '28px',
        marginBottom: '8px',
        color: '#fff',
    },

    subtitle: {
        color: '#9fb3c8',
        marginBottom: '25px',
        lineHeight: 1.5,
    },

    label: {
        color: '#8da5ba',
        fontSize: '13px',
        marginBottom: '8px',
    },

    codeBox: {
        padding: '20px',
        borderRadius: '12px',
        background: '#0b2033',
        marginBottom: '14px',
    },

    code: {
        fontSize: '28px',
        fontWeight: '700',
        letterSpacing: '2px',
        color: '#fff',
    },

    earningsBox: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderRadius: '12px',
        background: '#0b2033',
        marginBottom: '14px',
        gap: '20px',
    },

    earnings: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#62d68b',
    },

    rewardText: {
        color: '#718ba0',
        fontSize: '12px',
        marginTop: '5px',
    },

    referralCount: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: '#9fb3c8',
    },

    referralNumber: {
        color: '#fff',
        fontSize: '24px',
        marginBottom: '4px',
    },

    shareBox: {
        padding: '20px',
        borderRadius: '12px',
        background: '#0b2033',
        marginBottom: '14px',
    },

    input: {
        width: '100%',
        padding: '13px',
        boxSizing: 'border-box',
        borderRadius: '8px',
        border: '1px solid #31506b',
        background: '#071a2b',
        color: '#fff',
        marginBottom: '12px',
    },

    button: {
        display: 'block',
        width: '100%',
        padding: '14px',
        boxSizing: 'border-box',
        border: 'none',
        borderRadius: '8px',
        background: '#2f8cff',
        color: '#fff',
        textAlign: 'center',
        textDecoration: 'none',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
    },

    rulesBox: {
        padding: '20px',
        borderRadius: '12px',
        background: '#0b2033',
        marginBottom: '14px',
    },

    rulesTitle: {
        marginTop: 0,
        color: '#fff',
        fontSize: '18px',
        marginBottom: '15px',
    },

    rule: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#c4d1dd',
        fontSize: '14px',
        lineHeight: 1.5,
        marginBottom: '12px',
    },

    ruleNumber: {
        minWidth: '26px',
        height: '26px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#2f8cff',
        color: '#fff',
        fontWeight: '700',
        fontSize: '12px',
    },

    listBox: {
        padding: '20px',
        borderRadius: '12px',
        background: '#0b2033',
    },

    listTitle: {
        marginTop: 0,
        color: '#fff',
        fontSize: '18px',
    },

    referralRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 0',
        borderBottom:
            '1px solid #254762',
        gap: '15px',
    },

    email: {
        color: '#fff',
        wordBreak: 'break-word',
    },

    date: {
        color: '#718ba0',
        fontSize: '12px',
        marginTop: '4px',
    },

    joinedContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '4px',
    },

    joined: {
        color: '#62d68b',
        fontSize: '12px',
        whiteSpace: 'nowrap',
    },

    reward: {
        color: '#62d68b',
        fontSize: '13px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
    },

    muted: {
        color: '#8da5ba',
    },

    error: {
        padding: '12px',
        marginBottom: '15px',
        borderRadius: '8px',
        background: '#4a1f25',
        color: '#ff8f8f',
        wordBreak: 'break-word',
    },

    text: {
        color: '#fff',
        textAlign: 'center',
    },
}

export default ReferPage