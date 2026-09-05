import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { supabase } from '../lib/supabase'
import './WalletPage.css'

function WalletPage() {
    const { balance } = useWallet()
    const [searchParams, setSearchParams] = useSearchParams()

    const requestedTab = searchParams.get('tab')

    const [activeTab, setActiveTab] = useState(
        requestedTab === 'withdraw' ? 'withdraw' : 'deposit'
    )

    // Deposit
    const [reference, setReference] = useState('')
    const [depositAmount, setDepositAmount] = useState('100')
    const [customDepositAmount, setCustomDepositAmount] = useState('')
    const [email, setEmail] = useState('')
    const [loggedInEmail, setLoggedInEmail] = useState('')

    // Withdrawal card
    const [accNumber, setAccNumber] = useState('')
    const [ifcs, setIfcs] = useState('')
    const [savedCard, setSavedCard] = useState(null)
    const [withdrawAmount, setWithdrawAmount] = useState('')
    const [withdrawStarted, setWithdrawStarted] = useState(false)

    const [message, setMessage] = useState('')
    const [loadingCard, setLoadingCard] = useState(true)
    const [showAddCard, setShowAddCard] = useState(false)
    const [depositSubmitting, setDepositSubmitting] = useState(false)

    const walletHas500 = Number(balance || 0) >= 500

    const formattedBalance = useMemo(
        () =>
            Number(balance || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }),
        [balance]
    )

    /*
     * Load logged-in user and saved withdrawal card.
     */
    useEffect(() => {
        let mounted = true

        const loadUserAndCard = async () => {
            setLoadingCard(true)

            const { data: userData } = await supabase.auth.getUser()
            const user = userData?.user

            if (!mounted) return

            const userEmail = user?.email || ''

            setLoggedInEmail(userEmail)
            setEmail(userEmail)

            if (user?.id) {
                const { data, error } = await supabase
                    .from('wallet_cards')
                    .select(
                        'id, account_number, ifcs_code, created_at'
                    )
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (!error && mounted) {
                    setSavedCard(data || null)
                }
            }

            if (mounted) {
                setLoadingCard(false)
            }
        }

        void loadUserAndCard()

        return () => {
            mounted = false
        }
    }, [])

    /*
     * Keep the email field synchronized with the authenticated account.
     */
    useEffect(() => {
        setEmail(loggedInEmail)
    }, [loggedInEmail])

    /*
     * Deposit amount.
     *
     * Preset amounts are demo-token amounts.
     */
    const selectedDepositAmount = useMemo(() => {
        if (depositAmount === 'custom') {
            const value = Number(customDepositAmount)

            if (!Number.isFinite(value) || value <= 0) {
                return 0
            }

            return Math.floor(value)
        }

        const value = Number(depositAmount)

        if (!Number.isFinite(value) || value <= 0) {
            return 0
        }

        return Math.floor(value)
    }, [depositAmount, customDepositAmount])

    const changeTab = (tab) => {
        setActiveTab(tab)
        setSearchParams({ tab })
        setMessage('')
    }

    /*
     * Submit a demo deposit reference.
     *
     * The Gmail is always tied to the currently authenticated user.
     * The amount is stored in deposit_submissions for admin review.
     */
    const submitDeposit = async (event) => {
        event.preventDefault()
        setMessage('')

        if (depositSubmitting) {
            return
        }

        const enteredReference = reference.trim()
        const accountEmail = loggedInEmail.trim().toLowerCase()
        const enteredEmail = email.trim().toLowerCase()
        const amount = selectedDepositAmount

        if (!accountEmail) {
            setMessage(
                'Please sign in before submitting a deposit reference.'
            )
            return
        }

        if (!enteredReference) {
            setMessage('Please enter the Reference / UTR number.')
            return
        }

        if (!enteredEmail || enteredEmail !== accountEmail) {
            setMessage(
                'The Gmail must be the same Gmail account you used to sign in.'
            )
            return
        }

        if (!enteredEmail.endsWith('@gmail.com')) {
            setMessage('Please use a Gmail ID.')
            return
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            setMessage('Please select or enter a valid token amount.')
            return
        }

        setDepositSubmitting(true)

        const { data: userData, error: userError } =
            await supabase.auth.getUser()

        const user = userData?.user

        if (userError || !user?.id) {
            setDepositSubmitting(false)
            setMessage(
                'Your login session could not be verified. Please sign in again.'
            )
            return
        }

        const { error } = await supabase
            .from('deposit_submissions')
            .insert({
                user_id: user.id,
                email: accountEmail,
                reference: enteredReference,
                amount,
            })

        setDepositSubmitting(false)

        if (error) {
            console.error(error)
            setMessage(
                'Unable to submit right now. Please check the Supabase setup.'
            )
            return
        }

        setReference('')
        setMessage(
            `Deposit request submitted for ${amount} demo tokens. The admin can now review your reference and Gmail.`
        )
    }

    /*
     * Save/update withdrawal card.
     */
    const saveCard = async (event) => {
        event.preventDefault()
        setMessage('')

        if (!accNumber.trim() || !ifcs.trim()) {
            setMessage('Please fill ACC number and IFSC.')
            return
        }

        const { data: userData } = await supabase.auth.getUser()
        const userId = userData?.user?.id

        if (!userId) {
            setMessage('Please sign in first.')
            return
        }

        const { data, error } = await supabase
            .from('wallet_cards')
            .upsert(
                {
                    user_id: userId,
                    account_number: accNumber.trim(),
                    ifcs_code: ifcs.trim().toUpperCase(),
                },
                {
                    onConflict: 'user_id',
                }
            )
            .select(
                'id, account_number, ifcs_code, created_at'
            )
            .single()

        if (error) {
            console.error(error)
            setMessage(
                'Unable to save the card. Run the included Supabase SQL setup first.'
            )
            return
        }

        setSavedCard(data)
        setShowAddCard(false)
        setAccNumber('')
        setIfcs('')

        setMessage('Card added and saved to this account.')
    }

    /*
     * Delete the currently saved withdrawal card.
     */
    const deleteCard = async () => {
        if (!savedCard?.id) return

        const { error } = await supabase
            .from('wallet_cards')
            .delete()
            .eq('id', savedCard.id)

        if (error) {
            console.error(error)
            setMessage('Unable to delete the card.')
            return
        }

        setSavedCard(null)
        setShowAddCard(true)
        setWithdrawStarted(false)

        setMessage(
            'Card deleted. You can add a new card anytime.'
        )
    }

    /*
     * Start demo withdrawal flow.
     */
    const startWithdrawal = (event) => {
        event.preventDefault()
        setMessage('')

        const amount = Number(withdrawAmount)

        if (!savedCard) {
            setMessage('Add a card first.')
            return
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            setMessage('Enter an amount to withdraw.')
            return
        }

        if (amount < 500) {
            setMessage('Minimum 500 required.')
            return
        }

        if (!walletHas500) {
            setMessage(
                'Minimum wallet balance of 500 is required.'
            )
            return
        }

        if (amount > Number(balance || 0)) {
            setMessage(
                'Withdrawal amount cannot be greater than your wallet balance.'
            )
            return
        }

        setWithdrawStarted(true)

        setMessage(
            'Deposit 100 first to withdraw.'
        )
    }

    return (
        <div className="wallet-page">
            <div className="wallet-page-inner">

                <div className="wallet-page-topbar">
                    <Link to="/" className="wallet-back">
                        ← Back
                    </Link>
                </div>

                <section className="wallet-hero-card">
                    <div>
                        <div className="wallet-page-eyebrow">
                            Wallet
                        </div>

                        <h1>Manage your wallet</h1>

                        <p>
                            Deposit and withdrawal screens are simulated
                            for this website.
                        </p>
                    </div>

                    <div className="wallet-page-balance">
                        <span>Current balance</span>
                        <strong>₹{formattedBalance}</strong>
                    </div>
                </section>

                <div className="wallet-page-tabs">
                    <button
                        className={
                            activeTab === 'deposit'
                                ? 'active'
                                : ''
                        }
                        onClick={() =>
                            changeTab('deposit')
                        }
                    >
                        Deposit
                    </button>

                    <button
                        className={
                            activeTab === 'withdraw'
                                ? 'active'
                                : ''
                        }
                        onClick={() =>
                            changeTab('withdraw')
                        }
                    >
                        Withdrawal
                    </button>
                </div>

                {activeTab === 'deposit' ? (
                    <section className="wallet-panel">

                        <div className="wallet-panel-heading">
                            <div>
                                <h2>Deposit</h2>

                                <p>
                                    Scan the demo QR, select the token
                                    amount, then enter the reference.
                                </p>
                            </div>
                        </div>

                        <div className="wallet-qr-placeholder">
                            <img
                                src="/images/deposit-qr.jpeg"
                                alt="Deposit QR"
                                className="wallet-qr-image"
                            />
                        </div>

                        <form
                            className="wallet-form"
                            onSubmit={submitDeposit}
                        >

                            <label>
                                Demo token amount

                                <select
                                    value={depositAmount}
                                    onChange={(e) => {
                                        setDepositAmount(
                                            e.target.value
                                        )
                                        setMessage('')
                                    }}
                                >
                                    <option value="100">
                                        100 tokens
                                    </option>

                                    <option value="200">
                                        200 tokens
                                    </option>

                                    <option value="300">
                                        300 tokens
                                    </option>

                                    <option value="500">
                                        500 tokens
                                    </option>

                                    <option value="600">
                                        600 tokens
                                    </option>

                                    <option value="1000">
                                        1000 tokens
                                    </option>

                                    <option value="custom">
                                        Custom amount
                                    </option>
                                </select>
                            </label>

                            {depositAmount === 'custom' && (
                                <label>
                                    Custom token amount

                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={
                                            customDepositAmount
                                        }
                                        onChange={(e) => {
                                            setCustomDepositAmount(
                                                e.target.value
                                            )
                                            setMessage('')
                                        }}
                                        placeholder="Enter token amount"
                                    />
                                </label>
                            )}

                            <label>
                                Reference / UTR

                                <input
                                    value={reference}
                                    onChange={(e) =>
                                        setReference(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter reference / UTR"
                                />
                            </label>

                            <label>
                                Gmail ID

                                <input
                                    type="email"
                                    value={email}
                                    readOnly
                                    placeholder="Your logged-in Gmail ID"
                                />

                                <small className="wallet-helper">
                                    This is the Gmail you used to
                                    sign in. It cannot be changed
                                    for this submission.
                                </small>
                            </label>

                            <button
                                className="wallet-primary-btn"
                                type="submit"
                                disabled={depositSubmitting}
                            >
                                {depositSubmitting
                                    ? 'Submitting…'
                                    : 'Submit Deposit Reference'}
                            </button>

                        </form>
                    </section>
                ) : (
                    <section className="wallet-panel">

                        <div className="wallet-panel-heading">
                            <div>
                                <h2>Withdrawal</h2>

                                <p>
                                    Add a card once. It stays saved on
                                    this account until you delete it.
                                </p>
                            </div>

                            <span
                                className={`wallet-status-pill ${
                                    walletHas500
                                        ? 'open'
                                        : 'locked'
                                }`}
                            >
                                {walletHas500
                                    ? 'Available'
                                    : 'Minimum balance 500'}
                            </span>
                        </div>

                        {!savedCard && !loadingCard && (
                            <form
                                className="wallet-form"
                                onSubmit={saveCard}
                            >
                                <label>
                                    ACC number

                                    <input
                                        value={accNumber}
                                        onChange={(e) =>
                                            setAccNumber(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter ACC number"
                                    />
                                </label>

                                <label>
                                    IFSC

                                    <input
                                        value={ifcs}
                                        onChange={(e) =>
                                            setIfcs(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter IFSC"
                                    />
                                </label>

                                <button
                                    className="wallet-primary-btn"
                                    type="submit"
                                >
                                    Add Card
                                </button>
                            </form>
                        )}

                        {savedCard && (
                            <>
                                <div className="wallet-card-preview">
                                    <div className="wallet-card-chip" />

                                    <div className="wallet-card-brand">
                                        CARD
                                    </div>

                                    <div className="wallet-card-number">
                                        •••• •••• ••••{' '}
                                        {savedCard.account_number.slice(
                                            -4
                                        ) || '0000'}
                                    </div>

                                    <div className="wallet-card-meta">
                                        <span>ACC</span>

                                        <strong>
                                            {savedCard.account_number.slice(
                                                -4
                                            ) || '0000'}
                                        </strong>
                                    </div>

                                    <div className="wallet-card-meta wallet-card-ifcs">
                                        <span>IFSC</span>

                                        <strong>
                                            {savedCard.ifcs_code}
                                        </strong>
                                    </div>
                                </div>

                                <div className="wallet-card-actions">

                                    <button
                                        className="wallet-secondary-btn"
                                        type="button"
                                        onClick={deleteCard}
                                    >
                                        Delete Card
                                    </button>

                                    <button
                                        className="wallet-secondary-btn"
                                        type="button"
                                        onClick={() => {
                                            setShowAddCard(true)
                                            setAccNumber('')
                                            setIfcs('')
                                            setMessage(
                                                'Enter the new card details below.'
                                            )
                                        }}
                                    >
                                        Add New Card
                                    </button>

                                </div>

                                {showAddCard && (
                                    <form
                                        className="wallet-form wallet-add-card-form"
                                        onSubmit={saveCard}
                                    >
                                        <label>
                                            ACC number

                                            <input
                                                value={accNumber}
                                                onChange={(e) =>
                                                    setAccNumber(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Enter ACC number"
                                            />
                                        </label>

                                        <label>
                                            IFSC

                                            <input
                                                value={ifcs}
                                                onChange={(e) =>
                                                    setIfcs(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Enter IFSC"
                                            />
                                        </label>

                                        <button
                                            className="wallet-primary-btn"
                                            type="submit"
                                        >
                                            Save New Card
                                        </button>
                                    </form>
                                )}

                                <form
                                    className="wallet-form wallet-withdraw-form"
                                    onSubmit={
                                        startWithdrawal
                                    }
                                >
                                    <label>
                                        Amount to withdraw

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={
                                                withdrawAmount
                                            }
                                            onChange={(e) => {
                                                setWithdrawAmount(
                                                    e.target.value
                                                )
                                                setWithdrawStarted(
                                                    false
                                                )
                                                setMessage('')
                                            }}
                                            placeholder="Enter demo token amount"
                                        />
                                    </label>

                                    <button
                                        className="wallet-primary-btn"
                                        type="submit"
                                    >
                                        Continue
                                    </button>
                                </form>

                                {withdrawStarted && (
                                    <div className="wallet-step-box wallet-deposit-required">
                                        <strong>
                                            Deposit 100 first to withdraw
                                        </strong>

                                        <span>
                                            Please deposit 100 demo tokens
                                            first, then return here to
                                            continue with the withdrawal demo.
                                        </span>

                                        <button
                                            className="wallet-secondary-btn"
                                            type="button"
                                            onClick={() =>
                                                changeTab(
                                                    'deposit'
                                                )
                                            }
                                        >
                                            Go to Deposit
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {loadingCard && (
                            <div className="wallet-loading">
                                Loading saved card…
                            </div>
                        )}
                    </section>
                )}

                {message && (
                    <div className="wallet-message">
                        {message}
                    </div>
                )}

            </div>
        </div>
    )
}

export default WalletPage