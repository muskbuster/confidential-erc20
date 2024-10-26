// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "fhevm/lib/TFHE.sol";
interface ITransferRules {
    function transferAllowed(address from, address to, euint64 amount) external returns (ebool);
}
