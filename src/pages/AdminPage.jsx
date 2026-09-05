import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'rahulvishwakarma210806@gmail.com'

function AdminPage() {
    const navigate = useNavigate()

    const [user, setUser] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(true)

    const [targetEmail, setTargetEmail] = useState('')
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')

    const [submissions, setSubmissions] = useState([])
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        checkAdmin()
    }, [])

    const checkAdmin = async () => {
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

        if (
            currentUser.email?.toLowerCase() !==
            ADMIN_EMAIL.toLowerCase()
        ) {
            setError('Admin access denied.')
            setLoading(false)
            return
        }

        const { data: adminData, error: adminError } =
            await supabase
                .from('admin_users')
                .select('user_id,email')
                .eq('user_id', currentUser.id)
                .maybeSingle()

        if (adminError || !adminData) {
            setError(
                'Your account is not registered as an admin. Run the admin INSERT SQL first.'
            )
            setLoading(false)
            return
        }

        setIsAdmin(true)
        setLoading(false)

        loadSubmissions()
    }

    const loadSubmissions = async () => {
        const { data, error } =
            await supabase.rpc('admin_list_deposit_submissions')

        if (error) {
            setError(error.message)
            return
        }

        setSubmissions(data || [])
    }

    const addTokens = async () => {
        setMessage('')
        setError('')

        const cleanEmail = targetEmail.trim()
        const cleanAmount = Number(amount)

        if (!cleanEmail) {
            setError('Enter the user's Gmail ID.')
            return
        }

        if (!cleanAmount || cleanAmount <= 0) {
            setError('Enter an amount greater than zero.')
            return
        }

        setSaving(true)

        const { data, error } = await supabase.rpc(
            'admin_add_wallet_tokens',
            {
                target_email: cleanEmail,
                amount_to_add: cleanAmount,
                adjustment_note: note.trim() || null,
            }
        )

        setSaving(false)

        if (error) {
            setError(error.message)
            return
        }

        setMessage(
            `Successfully added ₹${cleanAmount.toFixed(
                2
            )} tokens. New balance: ₹${Number(data).toFixed(2)}`
        )

        setTargetEmail('')
        setAmount('')
        setNote('')
    }

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <h2>Admin Panel</h2>
                    <p>Checking admin access...</p>
                </div>
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <h2>Access Denied</h2>
                    <p>{error || 'Admin access denied.'}</p>

                    <button
                        style={styles.button}
                        onClick={() => navigate('/')}
                    >
                        Go Home
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div style={styles.page}>
            <div style={styles.container}>

                <div style={styles.topBar}>
                    <div>
                        <h1 style={styles.title}>LePaisa Admin Panel</h1>
                        <p style={styles.subtitle}>
                            Logged in as {user?.email}
                        </p>
                    </div>

                    <button
                        style={styles.secondaryButton}
                        onClick={() => navigate('/')}
                    >
                        Back to Website
                    </button>
                </div>

                {message && (
                    <div style={styles.success}>
                        {message}
                    </div>
                )}

                {error && (
                    <div style={styles.error}>
                        {error}
                    </div>
                )}

                <div style={styles.grid}>

                    <div style={styles.card}>
                        <h2>Manually Add Tokens</h2>

                        <p style={styles.help}>
                            Enter the Gmail ID of an existing user and
                            the amount you want to add to their wallet.
                        </p>

                        <label style={styles.label}>
                            User Gmail ID
                        </label>

                        <input
                            style={styles.input}
                            type="email"
                            value={targetEmail}
                            onChange={(e) =>
                                setTargetEmail(e.target.value)
                            }
                            placeholder="user@gmail.com"
                        />

                        <label style={styles.label}>
                            Token Amount
                        </label>

                        <input
                            style={styles.input}
                            type="number"
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(e) =>
                                setAmount(e.target.value)
                            }
                            placeholder="100"
                        />

                        <label style={styles.label}>
                            Note
                        </label>

                        <input
                            style={styles.input}
                            type="text"
                            value={note}
                            onChange={(e) =>
                                setNote(e.target.value)
                            }
                            placeholder="Manual admin credit"
                        />

                        <button
                            style={{
                                ...styles.button,
                                opacity: saving ? 0.6 : 1,
                            }}
                            onClick={addTokens}
                            disabled={saving}
                        >
                            {saving
                                ? 'Adding...'
                                : 'Add Tokens'}
                        </button>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.sectionHeader}>
                            <div>
                                <h2>Deposit / UTR Submissions</h2>
                                <p style={styles.help}>
                                    Review submitted Gmail IDs and
                                    payment references.
                                </p>
                            </div>

                            <button
                                style={styles.secondaryButton}
                                onClick={loadSubmissions}
                            >
                                Refresh
                            </button>
                        </div>

                        {submissions.length === 0 ? (
                            <p style={styles.help}>
                                No submissions yet.
                            </p>
                        ) : (
                            <div style={styles.tableWrapper}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>
                                                Gmail
                                            </th>
                                            <th style={styles.th}>
                                                UTR / Reference
                                            </th>
                                            <th style={styles.th}>
                                                Amount
                                            </th>
                                            <th style={styles.th}>
                                                Status
                                            </th>
                                            <th style={styles.th}>
                                                Date
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {submissions.map(
                                            (submission) => (
                                                <tr
                                                    key={
                                                        submission.id
                                                    }
                                                >
                                                    <td style={styles.td}>
                                                        {
                                                            submission.email
                                                        }
                                                    </td>

                                                    <td style={styles.td}>
                                                        {
                                                            submission.reference
                                                        }
                                                    </td>

                                                    <td style={styles.td}>
                                                        ₹
                                                        {Number(
                                                            submission.amount
                                                        ).toFixed(2)}
                                                    </td>

                                                    <td style={styles.td}>
                                                        {
                                                            submission.status
                                                        }
                                                    </td>

                                                    <td style={styles.td}>
                                                        {new Date(
                                                            submission.created_at
                                                        ).toLocaleString()}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}

const styles = {
    page: {
        minHeight: '100vh',
        background: '#071522',
        color: '#fff',
        padding: '40px 20px',
    },

    container: {
        maxWidth: '1200px',
        margin: '0 auto',
    },

    topBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '25px',
        flexWrap: 'wrap',
    },

    title: {
        margin: 0,
        fontSize: '30px',
    },

    subtitle: {
        marginTop: '6px',
        color: '#8da4b8',
    },

    grid: {
        display: 'grid',
        gridTemplateColumns:
            'minmax(300px, 380px) minmax(0, 1fr)',
        gap: '20px',
    },

    card: {
        background: '#10283d',
        borderRadius: '14px',
        padding: '24px',
        boxShadow:
            '0 12px 30px rgba(0,0,0,0.25)',
    },

    help: {
        color: '#9fb3c8',
        lineHeight: 1.5,
    },

    label: {
        display: 'block',
        marginTop: '18px',
        marginBottom: '7px',
        fontSize: '14px',
        color: '#c8d6e5',
    },

    input: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #31506a',
        background: '#081b2b',
        color: '#fff',
        outline: 'none',
    },

    button: {
        width: '100%',
        marginTop: '20px',
        padding: '13px',
        border: 'none',
        borderRadius: '8px',
        background: '#2f8cff',
        color: '#fff',
        fontWeight: 700,
        cursor: 'pointer',
    },

    secondaryButton: {
        padding: '10px 15px',
        border: '1px solid #31506a',
        borderRadius: '8px',
        background: '#17344d',
        color: '#fff',
        cursor: 'pointer',
    },

    success: {
        background: '#123d2b',
        border: '1px solid #1f7650',
        color: '#8ff0bd',
        padding: '13px',
        borderRadius: '8px',
        marginBottom: '20px',
    },

    error: {
        background: '#401d23',
        border: '1px solid #8b3945',
        color: '#ffadb7',
        padding: '13px',
        borderRadius: '8px',
        marginBottom: '20px',
    },

    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '15px',
        alignItems: 'flex-start',
    },

    tableWrapper: {
        overflowX: 'auto',
        marginTop: '20px',
    },

    table: {
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: '650px',
    },

    th: {
        textAlign: 'left',
        padding: '12px',
        borderBottom: '1px solid #31506a',
        color: '#9fb3c8',
        fontSize: '13px',
    },

    td: {
        padding: '12px',
        borderBottom: '1px solid #1e3a50',
        fontSize: '14px',
    },
}

export default AdminPage