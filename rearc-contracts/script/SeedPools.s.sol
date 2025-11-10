// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/Router.sol";
import "../src/REARC.sol";
import "../src/Pair.sol";

// IERC20 interface is available from Pair.sol import

contract SeedPoolsScript is Script {
    // Arc Testnet token addresses
    address constant USDC = 0x3600000000000000000000000000000000000000;
    address constant EURC = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
    
    // Deployed contract addresses (update these after deployment)
    address constant ROUTER = 0xFF836D398B32209cE77416A3138780B095b7CF9C;
    address constant REARC_TOKEN = 0xCd77F717d92F2F4221ac05b12A5fd61eb723E6dF;
    
    // Exchange rate: 1 USD = 0.86 EUR
    // So 1 USDC = 0.86 EURC
    uint256 constant USDC_TO_EURC_RATE = 86; // 0.86 * 100 for precision
    uint256 constant EURC_TO_USDC_RATE = 100; // 1.0 * 100
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        vm.startBroadcast(deployerKey);

        console.log("Deployer address:", deployer);
        console.log("Router address:", ROUTER);
        
        // Check balances
        uint256 usdcBalance = IERC20(USDC).balanceOf(deployer);
        uint256 eurcBalance = IERC20(EURC).balanceOf(deployer);
        uint256 rearcBalance = IERC20(REARC_TOKEN).balanceOf(deployer);
        
        console.log("USDC Balance:", usdcBalance);
        console.log("EURC Balance:", eurcBalance);
        console.log("REARC Balance:", rearcBalance);
        
        Router router = Router(ROUTER);
        uint256 deadline = block.timestamp + 60 * 20; // 20 minutes
        
        // Seed USDC/EURC pool
        seedUSDC_EURC(router, deployer, deadline);
        
        // Seed USDC/REARC pool
        seedUSDC_REARC(router, deployer, deadline);
        
        // Seed EURC/REARC pool
        seedEURC_REARC(router, deployer, deadline);

        vm.stopBroadcast();
    }
    
    function seedUSDC_EURC(Router router, address deployer, uint256 deadline) internal {
        // Exchange rate: 1 USD = 0.86 EUR, so 1 USDC = 0.86 EURC
        // 3 USDC = 3 * 10^6 (6 decimals)
        // 2.58 EURC = 2.58 * 10^6 (6 decimals) = 2,580,000
        uint256 usdcAmount = 3 * 10**6; // 3 USDC
        uint256 eurcAmount = 2580000; // 2.58 EURC
        
        console.log("\n=== Seeding USDC/EURC Pool ===");
        console.log("USDC Amount:", usdcAmount);
        console.log("EURC Amount:", eurcAmount);
        
        IERC20(USDC).approve(ROUTER, type(uint256).max);
        IERC20(EURC).approve(ROUTER, type(uint256).max);
        console.log("Approved USDC and EURC");
        
        (uint256 amountA, uint256 amountB, uint256 liquidity) = router.addLiquidity(
            USDC,
            EURC,
            usdcAmount,
            eurcAmount,
            (usdcAmount * 99) / 100,
            (eurcAmount * 99) / 100,
            deployer,
            deadline
        );
        
        console.log("Added liquidity to USDC/EURC pool:");
        console.log("  Amount A (USDC):", amountA);
        console.log("  Amount B (EURC):", amountB);
        console.log("  LP Tokens received:", liquidity);
    }
    
    function seedUSDC_REARC(Router router, address deployer, uint256 deadline) internal {
        // Exchange rate: 1 USDC = 1800 REARC
        uint256 usdcAmount = 1 * 10**6; // 1 USDC
        uint256 rearcAmount = 1800 * 10**18; // 1800 REARC
        
        console.log("\n=== Seeding USDC/REARC Pool ===");
        console.log("USDC Amount:", usdcAmount);
        console.log("REARC Amount:", rearcAmount);
        
        IERC20(REARC_TOKEN).approve(ROUTER, type(uint256).max);
        console.log("Approved REARC");
        
        (uint256 amountA, uint256 amountB, uint256 liquidity) = router.addLiquidity(
            USDC,
            REARC_TOKEN,
            usdcAmount,
            rearcAmount,
            (usdcAmount * 99) / 100,
            (rearcAmount * 99) / 100,
            deployer,
            deadline
        );
        
        console.log("Added liquidity to USDC/REARC pool:");
        console.log("  Amount A (USDC):", amountA);
        console.log("  Amount B (REARC):", amountB);
        console.log("  LP Tokens received:", liquidity);
    }
    
    function seedEURC_REARC(Router router, address deployer, uint256 deadline) internal {
        // Exchange rate: 1 EURC = 2093 REARC
        uint256 eurcAmount = 1 * 10**6; // 1 EURC
        uint256 rearcAmount = 2093 * 10**18; // 2093 REARC
        
        console.log("\n=== Seeding EURC/REARC Pool ===");
        console.log("EURC Amount:", eurcAmount);
        console.log("REARC Amount:", rearcAmount);
        
        (uint256 amountA, uint256 amountB, uint256 liquidity) = router.addLiquidity(
            EURC,
            REARC_TOKEN,
            eurcAmount,
            rearcAmount,
            (eurcAmount * 99) / 100,
            (rearcAmount * 99) / 100,
            deployer,
            deadline
        );
        
        console.log("Added liquidity to EURC/REARC pool:");
        console.log("  Amount A (EURC):", amountA);
        console.log("  Amount B (REARC):", amountB);
        console.log("  LP Tokens received:", liquidity);
    }
}

