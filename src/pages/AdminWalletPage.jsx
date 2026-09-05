import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AdminWalletPage.css'

function AdminWalletPage() {
    const navigate = useNavigate()

    const [user, setUser] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)

    const [email, setEmail] = useState('')
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')

    const [rows, setRows] = useState([])

    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    /*
     * Load admin status and deposit submissions.
     */
    const loadData = async (showRefreshState = false) => {
        if (showRefreshState) {
            setRefreshing(true)
        } else {
            setLoading(true)
        }

        const { data: userData } =
            await supabase.auth.getUser()

        const current = userData?.user

        setUser(current || null)

        if (!current) {
            navigate('/signin')
            return
        }

        const { data, error } = await supabase.rpc(
            'admin_list_deposit_submissions'
        )

        if (error) {
            console.error(error)

            setIsAdmin(false)
            setMessage(
                'Admin access is not configured for this account yet.'
            )

            setLoading(false)
            setRefreshing(false)

            return
        }

        setIsAdmin(true)
        setRows(data || [])

        setLoading(false)
        setRefreshing(false)
    }

    useEffect(() => {
        void loadData()
    }, [])

    /*
     * Manually add demo tokens to a user's wallet.
     */
    const addTokens = async (event) => {
        event.preventDefault()
        setMessage('')

        const targetEmail = email.trim()
        const numeric = Number(amount)

        if (
            !targetEmail ||
            !Number.isFinite(numeric) ||
            numeric <= 0
        ) {
            setMessage(
                'Enter the user Gmail ID and a positive token amount.'
            )
            return
        }

        const { data, error } = await supabase.rpc(
            'admin_add_wallet_tokens',
            {
                target_email: targetEmail,
                amount_to_add: numeric,
                adjustment_note:
                    note.trim() || null,
            }
        )

        if (error) {
            console.error(error)

            setMessage(
                error.message ||
                    'Unable to add demo tokens.'
            )

            return
        }

        setAmount('')
        setNote('')

        setMessage(
            `Added ${numeric} demo tokens. New wallet balance: ${data}.`
        )
    }

    if (loading) {
        return (
            <div className="admin-wallet-page">
                <div className="admin-wallet-card">
                    Loading admin panel…
                </div>
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="admin-wallet-page">
                <div className="admin-wallet-card">
                    <h1>Admin Wallet</h1>

                    <p>
                        {message ||
                            'Admin access required.'}
                    </p>

                    <Link
                        to="/"
                        className="admin-link"
                    >
                        Back to site
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="admin-wallet-page">
            <div className="admin-wallet-inner">

                <div className="admin-wallet-top">
                    <Link
                        to="/"
                        className="admin-link"
                    >
                        ← Back to site
                    </Link>

                    <span>
                        Admin: {user?.email}
                    </span>
                </div>

                {/* Manual token control */}
                <section className="admin-wallet-card">

                    <h1>Admin Wallet</h1>

                    <p>
                        Add demo tokens to a user's wallet
                        manually.
                    </p>

                    <form
                        className="admin-form"
                        onSubmit={addTokens}
                    >

                        <label>
                            User Gmail ID

                            <input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                placeholder="user@gmail.com"
                            />
                        </label>

                        <label>
                            Demo tokens to add

                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={amount}
                                onChange={(e) =>
                                    setAmount(
                                        e.target.value
                                    )
                                }
                                placeholder="500"
                            />
                        </label>

                        <label>
                            Note (optional)

                            <input
                                value={note}
                                onChange={(e) =>
                                    setNote(
                                        e.target.value
                                    )
                                }
                                placeholder="Manual demo credit"
                            />
                        </label>

                        <button type="submit">
                            Add Tokens
                        </button>

                    </form>

                    {message && (
                        <div className="admin-message">
                            {message}
                        </div>
                    )}
                </section>

                {/* Deposit submissions */}
                <section className="admin-wallet-card">

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent:
                                'space-between',
                            gap: '12px',
                            marginBottom: '16px',
                        }}
                    >
                        <div>
                            <h2>
                                Deposit References
                            </h2>

                            <p>
                                Review demo deposit
                                reference numbers and
                                the Gmail attached to
                                each submission.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                loadData(true)
                            }
                            disabled={refreshing}
                            style={{
                                padding:
                                    '9px 14px',
                                border: 'none',
                                borderRadius:
                                    '8px',
                                cursor:
                                    refreshing
                                        ? 'default'
                                        : 'pointer',
                            }}
                        >
                            {refreshing
                                ? 'Refreshing…'
                                : 'Refresh'}
                        </button>
                    </div>

                    {rows.length === 0 ? (
                        <p>
                            No deposit submissions
                            yet.
                        </p>
                    ) : (
                        <div className="admin-table-wrap">

                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>
                                            Gmail
                                        </th>
                                        <th>
                                            Reference /
                                            UTR
                                        </th>
                                        <th>
                                            Tokens
                                        </th>
                                        <th>
                                            Status
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.map(
                                        (row) => (
                                            <tr
                                                key={
                                                    row.id
                                                }
                                            >
                                                <td>
                                                    {new Date(
                                                        row.created_at
                                                    ).toLocaleString()}
                                                </td>

                                                <td
                                                    style={{
                                                        wordBreak:
                                                            'break-word',
                                                    }}
                                                >
                                                    {
                                                        row.email
                                                    }
                                                </td>

                                                <td
                                                    style={{
                                                        wordBreak:
                                                            'break-word',
                                                    }}
                                                >
                                                    {
                                                        row.reference
                                                    }
                                                </td>

                                                <td>
                                                    {Number(
                                                        row.amount
                                                    ).toLocaleString(
                                                        'en-IN'
                                                    )}
                                                </td>

                                                <td>
                                                    {
                                                        row.status
                                                    }
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>

                        </div>
                    )}

                </section>

            </div>
        </div>
    )
}

export default AdminWalletPage