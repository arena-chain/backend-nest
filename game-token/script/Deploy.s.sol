pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GameToken.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        new GameToken();

        vm.stopBroadcast();
    }
}