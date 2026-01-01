/// YieldPilot Vault Module
/// A production-grade yield aggregation vault for Movement Network
/// Integrates with Echelon, MovePosition, and other Movement DeFi protocols
module yieldpilot::vault {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};
    use aptos_std::simple_map::{Self, SimpleMap};

    // ============================================
    // ERROR CODES
    // ============================================

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_INSUFFICIENT_BALANCE: u64 = 3;
    const E_INSUFFICIENT_SHARES: u64 = 4;
    const E_ZERO_AMOUNT: u64 = 5;
    const E_NOT_AUTHORIZED: u64 = 6;
    const E_INVALID_STRATEGY: u64 = 7;
    const E_STRATEGY_NOT_ACTIVE: u64 = 8;
    const E_COOLDOWN_NOT_ELAPSED: u64 = 9;
    const E_SLIPPAGE_EXCEEDED: u64 = 10;
    const E_EMERGENCY_SHUTDOWN: u64 = 11;

    // ============================================
    // CONSTANTS
    // ============================================

    /// Basis points denominator (100% = 10000)
    const BPS_DENOMINATOR: u64 = 10000;

    /// Maximum performance fee: 20%
    const MAX_PERFORMANCE_FEE_BPS: u64 = 2000;

    /// Maximum management fee: 2%
    const MAX_MANAGEMENT_FEE_BPS: u64 = 200;

    /// Minimum rebalance cooldown: 1 hour
    const MIN_REBALANCE_COOLDOWN: u64 = 3600;

    /// Share precision for calculations
    const SHARE_PRECISION: u64 = 1_000_000_000_000; // 1e12

    // ============================================
    // STRATEGY IDENTIFIERS
    // ============================================

    /// Strategy 0: Hold (no yield, just custody)
    const STRATEGY_HOLD: u8 = 0;
    /// Strategy 1: Echelon Lending
    const STRATEGY_ECHELON: u8 = 1;
    /// Strategy 2: MovePosition Lending
    const STRATEGY_MOVEPOSITION: u8 = 2;
    /// Strategy 3: Meridian LP
    const STRATEGY_MERIDIAN: u8 = 3;
    /// Strategy 4: Diversified (split across protocols)
    const STRATEGY_DIVERSIFIED: u8 = 4;

    // ============================================
    // STRUCTS
    // ============================================

    /// Main vault configuration and state
    struct VaultConfig has key {
        /// Total shares outstanding
        total_shares: u64,
        /// Total assets under management (in base units)
        total_assets: u64,
        /// Performance fee in basis points
        performance_fee_bps: u64,
        /// Management fee in basis points
        management_fee_bps: u64,
        /// Current active strategy
        current_strategy: u8,
        /// Timestamp of last rebalance
        last_rebalance: u64,
        /// Timestamp of last fee harvest
        last_harvest: u64,
        /// High water mark for performance fee calculation
        high_water_mark: u64,
        /// Rebalance cooldown in seconds
        rebalance_cooldown: u64,
        /// Emergency shutdown flag
        emergency_shutdown: bool,
        /// Vault admin address
        admin: address,
        /// Strategy operators (can trigger rebalances)
        operators: vector<address>,
        /// Fee recipient address
        fee_recipient: address,
        /// Total fees accrued (claimable)
        accrued_fees: u64,
    }

    /// User position in the vault
    struct UserPosition has key, store {
        /// Number of shares owned
        shares: u64,
        /// Deposit timestamp (for potential time-weighted features)
        deposit_timestamp: u64,
        /// Total deposited (for tracking)
        total_deposited: u64,
        /// Total withdrawn (for tracking)
        total_withdrawn: u64,
    }

    /// Vault treasury holding actual assets
    struct VaultTreasury has key {
        coins: Coin<AptosCoin>,
    }

    /// Strategy allocation tracking
    struct StrategyAllocation has key {
        /// Amount allocated to each strategy
        allocations: SimpleMap<u8, u64>,
        /// Target allocation percentages (in BPS)
        targets: SimpleMap<u8, u64>,
    }

    /// Historical performance data
    struct PerformanceHistory has key {
        /// Daily snapshots of share price (timestamp -> price)
        snapshots: Table<u64, u64>,
        /// Last snapshot timestamp
        last_snapshot: u64,
    }

    // ============================================
    // EVENTS
    // ============================================

    #[event]
    struct DepositEvent has drop, store {
        user: address,
        amount: u64,
        shares_minted: u64,
        share_price: u64,
        timestamp: u64,
    }

    #[event]
    struct WithdrawEvent has drop, store {
        user: address,
        shares_burned: u64,
        amount_received: u64,
        share_price: u64,
        timestamp: u64,
    }

    #[event]
    struct RebalanceEvent has drop, store {
        old_strategy: u8,
        new_strategy: u8,
        total_assets: u64,
        operator: address,
        timestamp: u64,
    }

    #[event]
    struct HarvestEvent has drop, store {
        performance_fee: u64,
        management_fee: u64,
        total_harvested: u64,
        timestamp: u64,
    }

    #[event]
    struct EmergencyShutdownEvent has drop, store {
        triggered_by: address,
        timestamp: u64,
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /// Initialize the vault with configuration
    public entry fun initialize(
        admin: &signer,
        performance_fee_bps: u64,
        management_fee_bps: u64,
        fee_recipient: address,
    ) {
        let admin_addr = signer::address_of(admin);

        // Validate fees
        assert!(performance_fee_bps <= MAX_PERFORMANCE_FEE_BPS, E_INVALID_STRATEGY);
        assert!(management_fee_bps <= MAX_MANAGEMENT_FEE_BPS, E_INVALID_STRATEGY);

        // Ensure not already initialized
        assert!(!exists<VaultConfig>(admin_addr), E_ALREADY_INITIALIZED);

        let now = timestamp::now_seconds();

        // Create vault config
        move_to(admin, VaultConfig {
            total_shares: 0,
            total_assets: 0,
            performance_fee_bps,
            management_fee_bps,
            current_strategy: STRATEGY_HOLD,
            last_rebalance: now,
            last_harvest: now,
            high_water_mark: SHARE_PRECISION, // Start at 1:1
            rebalance_cooldown: MIN_REBALANCE_COOLDOWN,
            emergency_shutdown: false,
            admin: admin_addr,
            operators: vector::empty<address>(),
            fee_recipient,
            accrued_fees: 0,
        });

        // Create treasury
        move_to(admin, VaultTreasury {
            coins: coin::zero<AptosCoin>(),
        });

        // Initialize strategy allocation tracking
        let allocations = simple_map::new<u8, u64>();
        let targets = simple_map::new<u8, u64>();
        simple_map::add(&mut allocations, STRATEGY_HOLD, 0);
        simple_map::add(&mut targets, STRATEGY_HOLD, BPS_DENOMINATOR); // 100% to hold initially

        move_to(admin, StrategyAllocation {
            allocations,
            targets,
        });

        // Initialize performance history
        let snapshots = table::new<u64, u64>();
        table::add(&mut snapshots, now, SHARE_PRECISION);

        move_to(admin, PerformanceHistory {
            snapshots,
            last_snapshot: now,
        });
    }

    // ============================================
    // USER FUNCTIONS
    // ============================================

    /// Deposit assets into the vault
    public entry fun deposit(
        user: &signer,
        vault_addr: address,
        amount: u64,
    ) acquires VaultConfig, VaultTreasury, UserPosition {
        assert!(amount > 0, E_ZERO_AMOUNT);

        let vault = borrow_global_mut<VaultConfig>(vault_addr);
        assert!(!vault.emergency_shutdown, E_EMERGENCY_SHUTDOWN);

        let user_addr = signer::address_of(user);
        let now = timestamp::now_seconds();

        // Calculate shares to mint
        let shares_to_mint = if (vault.total_shares == 0) {
            // First deposit: 1:1 ratio with precision
            amount * SHARE_PRECISION / 1_00000000 // Normalize to share precision
        } else {
            // Subsequent deposits: proportional to current share price
            (((amount as u128) * (vault.total_shares as u128) / (vault.total_assets as u128)) as u64)
        };

        // Transfer tokens from user to treasury
        let coins = coin::withdraw<AptosCoin>(user, amount);
        let treasury = borrow_global_mut<VaultTreasury>(vault_addr);
        coin::merge(&mut treasury.coins, coins);

        // Update vault state
        vault.total_assets = vault.total_assets + amount;
        vault.total_shares = vault.total_shares + shares_to_mint;

        // Update or create user position
        if (exists<UserPosition>(user_addr)) {
            let position = borrow_global_mut<UserPosition>(user_addr);
            position.shares = position.shares + shares_to_mint;
            position.total_deposited = position.total_deposited + amount;
        } else {
            move_to(user, UserPosition {
                shares: shares_to_mint,
                deposit_timestamp: now,
                total_deposited: amount,
                total_withdrawn: 0,
            });
        };

        // Emit event
        event::emit(DepositEvent {
            user: user_addr,
            amount,
            shares_minted: shares_to_mint,
            share_price: get_share_price_internal(vault),
            timestamp: now,
        });
    }

    /// Withdraw assets from the vault
    public entry fun withdraw(
        user: &signer,
        vault_addr: address,
        shares: u64,
    ) acquires VaultConfig, VaultTreasury, UserPosition {
        assert!(shares > 0, E_ZERO_AMOUNT);

        let vault = borrow_global_mut<VaultConfig>(vault_addr);
        let user_addr = signer::address_of(user);
        let now = timestamp::now_seconds();

        // Check user has enough shares
        assert!(exists<UserPosition>(user_addr), E_INSUFFICIENT_SHARES);
        let position = borrow_global_mut<UserPosition>(user_addr);
        assert!(position.shares >= shares, E_INSUFFICIENT_SHARES);

        // Calculate assets to return
        let assets_to_return = (((shares as u128) * (vault.total_assets as u128) / (vault.total_shares as u128)) as u64);

        // Update user position
        position.shares = position.shares - shares;
        position.total_withdrawn = position.total_withdrawn + assets_to_return;

        // Update vault state
        vault.total_assets = vault.total_assets - assets_to_return;
        vault.total_shares = vault.total_shares - shares;

        // Transfer tokens from treasury to user
        let treasury = borrow_global_mut<VaultTreasury>(vault_addr);
        let coins = coin::extract(&mut treasury.coins, assets_to_return);
        coin::deposit(user_addr, coins);

        // Emit event
        event::emit(WithdrawEvent {
            user: user_addr,
            shares_burned: shares,
            amount_received: assets_to_return,
            share_price: if (vault.total_shares > 0) { get_share_price_internal(vault) } else { SHARE_PRECISION },
            timestamp: now,
        });
    }

    // ============================================
    // OPERATOR FUNCTIONS
    // ============================================

    /// Rebalance vault to a new strategy
    /// Called by operators after receiving x402 signal
    public entry fun rebalance(
        operator: &signer,
        vault_addr: address,
        new_strategy: u8,
    ) acquires VaultConfig, StrategyAllocation {
        let vault = borrow_global_mut<VaultConfig>(vault_addr);
        let operator_addr = signer::address_of(operator);
        let now = timestamp::now_seconds();

        // Verify authorization
        assert!(
            operator_addr == vault.admin || vector::contains(&vault.operators, &operator_addr),
            E_NOT_AUTHORIZED
        );

        // Check emergency shutdown
        assert!(!vault.emergency_shutdown, E_EMERGENCY_SHUTDOWN);

        // Check cooldown
        assert!(now >= vault.last_rebalance + vault.rebalance_cooldown, E_COOLDOWN_NOT_ELAPSED);

        // Validate strategy
        assert!(new_strategy <= STRATEGY_DIVERSIFIED, E_INVALID_STRATEGY);

        let old_strategy = vault.current_strategy;

        // Update strategy allocation
        let allocation = borrow_global_mut<StrategyAllocation>(vault_addr);

        // Move assets from old strategy to new
        if (simple_map::contains_key(&allocation.allocations, &old_strategy)) {
            let old_amount = *simple_map::borrow(&allocation.allocations, &old_strategy);
            simple_map::upsert(&mut allocation.allocations, old_strategy, 0);

            if (!simple_map::contains_key(&allocation.allocations, &new_strategy)) {
                simple_map::add(&mut allocation.allocations, new_strategy, old_amount);
            } else {
                let current = *simple_map::borrow(&allocation.allocations, &new_strategy);
                simple_map::upsert(&mut allocation.allocations, new_strategy, current + old_amount);
            };
        };

        // Update vault state
        vault.current_strategy = new_strategy;
        vault.last_rebalance = now;

        // Emit event
        event::emit(RebalanceEvent {
            old_strategy,
            new_strategy,
            total_assets: vault.total_assets,
            operator: operator_addr,
            timestamp: now,
        });
    }

    /// Harvest fees and update high water mark
    public entry fun harvest_fees(
        caller: &signer,
        vault_addr: address,
    ) acquires VaultConfig {
        let vault = borrow_global_mut<VaultConfig>(vault_addr);
        let caller_addr = signer::address_of(caller);
        let now = timestamp::now_seconds();

        // Only admin or fee recipient can harvest
        assert!(
            caller_addr == vault.admin || caller_addr == vault.fee_recipient,
            E_NOT_AUTHORIZED
        );

        let current_share_price = get_share_price_internal(vault);
        let time_elapsed = now - vault.last_harvest;

        let performance_fee: u64 = 0;
        let management_fee: u64 = 0;

        // Calculate performance fee (only on gains above high water mark)
        if (current_share_price > vault.high_water_mark) {
            let gain = current_share_price - vault.high_water_mark;
            let gain_value = (((gain as u128) * (vault.total_assets as u128) / (SHARE_PRECISION as u128)) as u64);
            performance_fee = gain_value * vault.performance_fee_bps / BPS_DENOMINATOR;

            // Update high water mark
            vault.high_water_mark = current_share_price;
        };

        // Calculate management fee (time-weighted)
        // Annualized fee prorated for time elapsed
        let annual_seconds: u64 = 365 * 24 * 60 * 60;
        management_fee = vault.total_assets * vault.management_fee_bps * time_elapsed / (BPS_DENOMINATOR * annual_seconds);

        let total_fee = performance_fee + management_fee;

        if (total_fee > 0 && total_fee < vault.total_assets) {
            // Deduct fees from total assets
            vault.total_assets = vault.total_assets - total_fee;
            vault.accrued_fees = vault.accrued_fees + total_fee;
        };

        vault.last_harvest = now;

        // Emit event
        event::emit(HarvestEvent {
            performance_fee,
            management_fee,
            total_harvested: total_fee,
            timestamp: now,
        });
    }

    /// Claim accrued fees
    public entry fun claim_fees(
        caller: &signer,
        vault_addr: address,
    ) acquires VaultConfig, VaultTreasury {
        let vault = borrow_global_mut<VaultConfig>(vault_addr);
        let caller_addr = signer::address_of(caller);

        assert!(caller_addr == vault.fee_recipient, E_NOT_AUTHORIZED);
        assert!(vault.accrued_fees > 0, E_INSUFFICIENT_BALANCE);

        let fees = vault.accrued_fees;
        vault.accrued_fees = 0;

        let treasury = borrow_global_mut<VaultTreasury>(vault_addr);
        let coins = coin::extract(&mut treasury.coins, fees);
        coin::deposit(caller_addr, coins);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /// Add an operator
    public entry fun add_operator(
        admin: &signer,
        vault_addr: address,
        operator: address,
    ) acquires VaultConfig {
        let vault = borrow_global_mut<VaultConfig>(vault_addr);
        assert!(signer::address_of(admin) == vault.admin, E_NOT_AUTHORIZED);

        if (!vector::contains(&vault.operators, &operator)) {
            vector::push_back(&mut vault.operators, operator);
        };
    }

    /// Remove an operator
    public entry fun remove_operator(
        admin: &signer,
        vault_addr: address,
        operator: address,
    ) acquires VaultConfig {
        let vault = borrow_global_mut<VaultConfig>(vault_addr);
        assert!(signer::address_of(admin) == vault.admin, E_NOT_AUTHORIZED);

        let (found, idx) = vector::index_of(&vault.operators, &operator);
        if (found) {
            vector::remove(&mut vault.operators, idx);
        };
    }

    /// Update fee configuration
    public entry fun update_fees(
        admin: &signer,
        vault_addr: address,
        new_performance_fee_bps: u64,
        new_management_fee_bps: u64,
    ) acquires VaultConfig {
        let vault = borrow_global_mut<VaultConfig>(vault_addr);
        assert!(signer::address_of(admin) == vault.admin, E_NOT_AUTHORIZED);
        assert!(new_performance_fee_bps <= MAX_PERFORMANCE_FEE_BPS, E_INVALID_STRATEGY);
        assert!(new_management_fee_bps <= MAX_MANAGEMENT_FEE_BPS, E_INVALID_STRATEGY);

        vault.performance_fee_bps = new_performance_fee_bps;
        vault.management_fee_bps = new_management_fee_bps;
    }

    /// Trigger emergency shutdown
    public entry fun emergency_shutdown(
        admin: &signer,
        vault_addr: address,
    ) acquires VaultConfig {
        let vault = borrow_global_mut<VaultConfig>(vault_addr);
        assert!(signer::address_of(admin) == vault.admin, E_NOT_AUTHORIZED);

        vault.emergency_shutdown = true;

        event::emit(EmergencyShutdownEvent {
            triggered_by: signer::address_of(admin),
            timestamp: timestamp::now_seconds(),
        });
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    #[view]
    /// Get current share price (normalized to SHARE_PRECISION)
    public fun get_share_price(vault_addr: address): u64 acquires VaultConfig {
        let vault = borrow_global<VaultConfig>(vault_addr);
        get_share_price_internal(vault)
    }

    #[view]
    /// Get vault total assets
    public fun get_total_assets(vault_addr: address): u64 acquires VaultConfig {
        borrow_global<VaultConfig>(vault_addr).total_assets
    }

    #[view]
    /// Get vault total shares
    public fun get_total_shares(vault_addr: address): u64 acquires VaultConfig {
        borrow_global<VaultConfig>(vault_addr).total_shares
    }

    #[view]
    /// Get current strategy
    public fun get_current_strategy(vault_addr: address): u8 acquires VaultConfig {
        borrow_global<VaultConfig>(vault_addr).current_strategy
    }

    #[view]
    /// Get user shares
    public fun get_user_shares(user_addr: address): u64 acquires UserPosition {
        if (exists<UserPosition>(user_addr)) {
            borrow_global<UserPosition>(user_addr).shares
        } else {
            0
        }
    }

    #[view]
    /// Get user position value in base asset
    public fun get_user_position_value(user_addr: address, vault_addr: address): u64 acquires UserPosition, VaultConfig {
        let shares = get_user_shares(user_addr);
        if (shares == 0) {
            return 0
        };

        let vault = borrow_global<VaultConfig>(vault_addr);
        if (vault.total_shares == 0) {
            return 0
        };

        (((shares as u128) * (vault.total_assets as u128) / (vault.total_shares as u128)) as u64)
    }

    #[view]
    /// Check if vault is in emergency shutdown
    public fun is_emergency_shutdown(vault_addr: address): bool acquires VaultConfig {
        borrow_global<VaultConfig>(vault_addr).emergency_shutdown
    }

    #[view]
    /// Get vault info summary
    public fun get_vault_info(vault_addr: address): (u64, u64, u8, u64, bool) acquires VaultConfig {
        let vault = borrow_global<VaultConfig>(vault_addr);
        (
            vault.total_assets,
            vault.total_shares,
            vault.current_strategy,
            get_share_price_internal(vault),
            vault.emergency_shutdown
        )
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /// Internal share price calculation
    fun get_share_price_internal(vault: &VaultConfig): u64 {
        if (vault.total_shares == 0) {
            SHARE_PRECISION
        } else {
            (((vault.total_assets as u128) * (SHARE_PRECISION as u128) / (vault.total_shares as u128)) as u64)
        }
    }
}
