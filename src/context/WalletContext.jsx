import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const WalletContext = createContext(null)

const INITIAL_BALANCE = 0.00
const STORAGE_KEY = 'lepaisa_wallet_balance_v2'

function getLocalBalance() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        const parsed = parseFloat(stored)
        return Number.isFinite(parsed) ? parsed : INITIAL_BALANCE
    } catch (e) {
        return INITIAL_BALANCE
    }
}

function roundMoney(value) {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0
}

export function WalletProvider({ children }) {
    const [balance, setBalance] = useState(getLocalBalance)
    const balanceRef = useRef(balance)
    const userRef = useRef(null)
    const [currentUser, setCurrentUser] = useState(null)
    const [currency, setCurrency] = useState('INR')
    const [transactions, setTransactions] = useState([])
    const [toasts, setToasts] = useState([])
    const toastIdRef = useRef(0)

    const cacheBalance = useCallback((nextBalance) => {
        const rounded = roundMoney(nextBalance)
        balanceRef.current = rounded
        setBalance(rounded)
        try {
            localStorage.setItem(STORAGE_KEY, String(rounded))
        } catch (e) {
            // Ignore localStorage errors.
        }
        return rounded
    }, [])

    const showToast = useCallback((type, title, description, duration = 3000) => {
        const id = ++toastIdRef.current
        setToasts(prev => [...prev, { id, type, title, description }])
        window.setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, duration)
    }, [])

    const refreshBalance = useCallback(async (user = userRef.current) => {
        if (!user?.id) {
            userRef.current = null
            setCurrentUser(null)
            cacheBalance(INITIAL_BALANCE)
            setTransactions([])
            return INITIAL_BALANCE
        }

        userRef.current = user
        setCurrentUser(user)
        const { data, error } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', user.id)
            .maybeSingle()

        if (error) {
            console.error('Unable to load wallet balance:', error)
            cacheBalance(INITIAL_BALANCE)
            return INITIAL_BALANCE
        }

        return cacheBalance(data?.wallet_balance ?? INITIAL_BALANCE)
    }, [cacheBalance])

    useEffect(() => {
        let mounted = true

        const loadUser = async () => {
            const { data } = await supabase.auth.getUser()
            if (mounted) await refreshBalance(data?.user ?? null)
        }

        void loadUser()

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return
            void refreshBalance(session?.user ?? null)
        })

        return () => {
            mounted = false
            authListener.subscription.unsubscribe()
        }
    }, [refreshBalance])

    // Live updates make a referral reward appear without requiring a page refresh.
    useEffect(() => {
        const userId = userRef.current?.id
        if (!userId) return undefined

        const channel = supabase
            .channel(`lepaisa-wallet-${userId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
                payload => cacheBalance(payload.new?.wallet_balance ?? balanceRef.current)
            )
            .subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [cacheBalance, currentUser?.id])

    const setStoredBalance = useCallback((nextBalance) => {
        const rounded = cacheBalance(nextBalance)
        if (userRef.current?.id) {
            void supabase
                .from('profiles')
                .update({ wallet_balance: rounded })
                .eq('id', userRef.current.id)
                .then(({ error }) => {
                    if (error) {
                        console.error('Unable to save wallet balance:', error)
                        showToast('error', 'Wallet sync failed', 'Please refresh and try again.')
                    }
                })
        }
        return rounded
    }, [cacheBalance, showToast])

    const updateBalance = useCallback((newBalance) => {
        setStoredBalance(newBalance)
    }, [setStoredBalance])

    const changeBalance = useCallback(async (amount) => {
        const delta = roundMoney(amount)
        if (!userRef.current?.id || delta === 0) return null

        const { data, error } = await supabase.rpc('change_lepaisa_wallet_balance', {
            amount_delta: delta,
        })

        if (error) {
            console.error('Unable to change wallet balance:', error)
            showToast('error', 'Wallet error', error.message || 'Unable to update your wallet.')
            return null
        }

        const next = cacheBalance(data)
        return next
    }, [cacheBalance, showToast])

    const placeBet = useCallback((amount) => {
        const amt = roundMoney(amount)
        if (amt <= 0 || amt > balanceRef.current) return false

        // Optimistic local update keeps game controls responsive. The RPC is atomic
        // on the server and rejects the change if the authoritative balance is too low.
        const previous = balanceRef.current
        cacheBalance(previous - amt)

        void changeBalance(-amt).then(next => {
            if (next === null) cacheBalance(previous)
        })

        const newBal = balanceRef.current
        setTransactions(txs => [{
            id: Date.now(),
            type: 'bet',
            amount: -amt,
            balance: newBal,
            timestamp: new Date(),
        }, ...txs].slice(0, 100))
        return true
    }, [cacheBalance, changeBalance])

    const addWinnings = useCallback((amount) => {
        const amt = roundMoney(amount)
        if (amt <= 0) return

        const previous = balanceRef.current
        cacheBalance(previous + amt)

        void changeBalance(amt).then(next => {
            if (next === null) cacheBalance(previous)
        })

        const newBal = balanceRef.current
        setTransactions(txs => [{
            id: Date.now(),
            type: 'win',
            amount: amt,
            balance: newBal,
            timestamp: new Date(),
        }, ...txs].slice(0, 100))
    }, [cacheBalance, changeBalance])

    // Manual deposits are disabled. Funds can come from referral rewards or game winnings.
    const deposit = useCallback(() => false, [])

    // Kept only for compatibility with older code. It never creates money.
    const resetBalance = useCallback(() => {
        cacheBalance(INITIAL_BALANCE)
        if (userRef.current?.id) {
            void supabase
                .from('profiles')
                .update({ wallet_balance: INITIAL_BALANCE })
                .eq('id', userRef.current.id)
        }
        setTransactions(txs => [{
            id: Date.now(),
            type: 'reset',
            amount: 0,
            balance: INITIAL_BALANCE,
            timestamp: new Date(),
        }, ...txs].slice(0, 100))
    }, [cacheBalance])

    const value = {
        balance,
        currency,
        setCurrency,
        transactions,
        placeBet,
        addWinnings,
        deposit,
        resetBalance,
        updateBalance,
        refreshBalance,
        toasts,
        showToast,
    }

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    )
}

export function useWallet() {
    const context = useContext(WalletContext)
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider')
    }
    return context
}

export default WalletContext
