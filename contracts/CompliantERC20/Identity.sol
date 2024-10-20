pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Identity is Ownable {
    mapping(address => bool) private isRegistered;
    mapping(address => euint8) private Age;
    event IdentityRegistered(address indexed user);
    event AgeUpdated(address indexed user);

    constructor() Ownable(msg.sender) {}

    function registerIdentity(address user, einput encryptedAge, bytes calldata inputProof) external onlyOwner {
        require(!isRegistered[user], "Identity already registered");
        euint8 age = TFHE.asEuint8(encryptedAge, inputProof);
        Age[user] = age;
        isRegistered[user] = true;
        TFHE.allow(Age[user], msg.sender);
        TFHE.allow(Age[user], user);
        TFHE.allow(Age[user], address(this));
        emit IdentityRegistered(user);
    }

    function updateAge(address user, einput encryptedAge, bytes calldata inputProof) external onlyOwner {
        require(isRegistered[user], "Identity not registered");

        euint8 age = TFHE.asEuint8(encryptedAge, inputProof);
        Age[user] = age;

        // Allow access to the updated encrypted age
        TFHE.allow(Age[user], msg.sender);
        TFHE.allow(Age[user], address(this));

        emit AgeUpdated(msg.sender);
    }

    function checkAgeRequirement(address from, address to, uint8 minAge) public returns (ebool) {
        require(isRegistered[from], "From address is not registered");
        require(isRegistered[to], "To address is not registered");

        euint8 fromAge = Age[from];
        euint8 toAge = Age[to];

        ebool result = TFHE.and(TFHE.ge(fromAge, minAge), TFHE.ge(toAge, minAge));

        // Allow querying contract to access the result
        TFHE.allow(result, msg.sender);
        TFHE.allow(result, address(this));
        return result;
    }

    function isUserRegistered(address user) external view returns (bool) {
        return isRegistered[user];
    }

    function getIdentity(address user) external returns (euint8) {
        require(isRegistered[user], "User is not registered");

        euint8 age = Age[user];
        TFHE.allow(age, msg.sender);
        TFHE.allow(age, address(this));
        return age;
    }
}
