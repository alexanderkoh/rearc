// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/Factory.sol";
import "../src/Router.sol";
import "../src/REARC.sol";
import "../src/NYC1.sol";

contract DeployScript is Script {
    // Arc Testnet token addresses
    address constant USDC = 0x3600000000000000000000000000000000000000;
    address constant EURC = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // Deploy REARC Token (1 million tokens with 18 decimals)
        uint256 initialSupply = 1_000_000 * 10**18;
        REARC rearc = new REARC(initialSupply);
        console.log("REARC Token deployed at:", address(rearc));

        // Deploy NYC1 Token (1 million tokens with 18 decimals)
        NYC1 nyc1 = new NYC1(initialSupply);
        console.log("NYC1 Token deployed at:", address(nyc1));

        // Deploy Factory
        Factory factory = new Factory();
        console.log("Factory deployed at:", address(factory));

        // Deploy Router
        Router router = new Router(address(factory));
        console.log("Router deployed at:", address(router));

        // Create USDC/EURC pair
        address pairUSDC_EURC = factory.createPair(USDC, EURC);
        console.log("USDC/EURC Pair created at:", pairUSDC_EURC);

        // Create USDC/REARC pair
        address pairUSDC_REARC = factory.createPair(USDC, address(rearc));
        console.log("USDC/REARC Pair created at:", pairUSDC_REARC);

        // Create EURC/REARC pair
        address pairEURC_REARC = factory.createPair(EURC, address(rearc));
        console.log("EURC/REARC Pair created at:", pairEURC_REARC);

        console.log("\n=== Deployment Summary ===");
        console.log("REARC Token:", address(rearc));
        console.log("NYC1 Token:", address(nyc1));
        console.log("Factory:", address(factory));
        console.log("Router:", address(router));
        console.log("USDC/EURC Pair:", pairUSDC_EURC);
        console.log("USDC/REARC Pair:", pairUSDC_REARC);
        console.log("EURC/REARC Pair:", pairEURC_REARC);
        console.log("\n=== Note: NYC1 pairs can be created via Factory.createPair() ===");

        vm.stopBroadcast();
    }
}

