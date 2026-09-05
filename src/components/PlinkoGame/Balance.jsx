import './Balance.css';

function Balance({ balance }) {
    const balanceFormatted = balance.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return (
        <div className="balance-container">
            <div className="balance-display">
                <span className="balance-symbol">₹</span>
                <span className="balance-value">{balanceFormatted}</span>
            </div>
        </div>
    );
}

export default Balance;
