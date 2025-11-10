// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/Factory.sol";
import "../src/Pair.sol";
import "../src/Router.sol";
import "./MockERC20.sol";

contract AMMTest is Test {
    MockERC20 public usdc;
    MockERC20 public eurc;
    Factory public factory;
    Router public router;
    address public pair;
    address public user = address(1);

    function setUp() public {
        // Deploy tokens
        usdc = new MockERC20("USDC", "USDC", 6);
        eurc = new MockERC20("EURC", "EURC", 6);

        // Deploy factory and router
        factory = new Factory();
        router = new Router(address(factory));

        // Create pair
        pair = factory.createPair(address(usdc), address(eurc));

        // Mint tokens to user
        usdc.mint(user, 10000e6);
        eurc.mint(user, 9000e6);

        // Approve router
        vm.prank(user);
        usdc.approve(address(router), type(uint256).max);
        vm.prank(user);
        eurc.approve(address(router), type(uint256).max);
    }

    function testCreatePair() public {
        assertTrue(pair != address(0));
        assertEq(factory.getPair(address(usdc), address(eurc)), pair);
        assertEq(factory.allPairsLength(), 1);
    }

    function testAddLiquidity() public {
        vm.prank(user);
        router.addLiquidity(
            address(usdc),
            address(eurc),
            100e6,
            90e6,
            0,
            0,
            user,
            block.timestamp + 60
        );

        (uint256 reserve0, uint256 reserve1,) = Pair(pair).getReserves();
        assertGt(reserve0, 0);
        assertGt(reserve1, 0);
        assertGt(Pair(pair).balanceOf(user), 0);
    }

    function testSwapAndInvariant() public {
        // Add liquidity first
        vm.prank(user);
        router.addLiquidity(
            address(usdc),
            address(eurc),
            100e6,
            90e6,
            0,
            0,
            user,
            block.timestamp + 60
        );

        uint256 initialReserve0;
        uint256 initialReserve1;
        (initialReserve0, initialReserve1,) = Pair(pair).getReserves();
        uint256 kBefore = initialReserve0 * initialReserve1;

        // Perform swap
        address[] memory path = new address[](2);
        path[0] = address(usdc);
        path[1] = address(eurc);

        uint256 amountIn = 50e6;
        vm.prank(user);
        router.swapExactTokensForTokens(
            amountIn,
            1,
            path,
            user,
            block.timestamp + 60
        );

        // Check invariant (product should increase due to fee)
        (uint256 reserve0, uint256 reserve1,) = Pair(pair).getReserves();
        uint256 kAfter = reserve0 * reserve1;
        assertGe(kAfter, kBefore);

        // Check user received tokens
        assertGt(eurc.balanceOf(user), 9000e6);
    }

    function testSwapOutputFormula() public {
        // Add liquidity
        vm.prank(user);
        router.addLiquidity(
            address(usdc),
            address(eurc),
            10000e6,
            9000e6,
            0,
            0,
            user,
            block.timestamp + 60
        );

        address[] memory path = new address[](2);
        path[0] = address(usdc);
        path[1] = address(eurc);

        uint256 amountIn = 100e6;
        uint256[] memory amountsOut = router.getAmountsOut(amountIn, path);
        
        // Verify formula: amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
        (uint256 reserve0, uint256 reserve1,) = Pair(pair).getReserves();
        uint256 reserveIn = reserve0;
        uint256 reserveOut = reserve1;
        
        uint256 expectedOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997);
        assertApproxEqRel(amountsOut[1], expectedOut, 1e15);
    }
}

