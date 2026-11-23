// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title AcordesOrderAttestation
/// @notice Stores only irreversible evidence hashes for high-value orders.
/// @dev PostgreSQL remains the operational source of truth. No personal data is stored here.
contract AcordesOrderAttestation {
    address public immutable authorizedRelayer;

    mapping(bytes32 evidenceHash => uint64 timestamp) private attestations;

    event OrderAttested(
        bytes32 indexed evidenceHash,
        address indexed relayer,
        uint256 timestamp
    );

    error UnauthorizedRelayer(address sender);
    error EmptyEvidenceHash();
    error EvidenceAlreadyAttested(bytes32 evidenceHash);
    error InvalidRelayer();

    constructor(address relayer) {
        if (relayer == address(0)) revert InvalidRelayer();
        authorizedRelayer = relayer;
    }

    function attest(bytes32 evidenceHash) external {
        if (msg.sender != authorizedRelayer) revert UnauthorizedRelayer(msg.sender);
        if (evidenceHash == bytes32(0)) revert EmptyEvidenceHash();
        if (attestations[evidenceHash] != 0) revert EvidenceAlreadyAttested(evidenceHash);

        uint64 timestamp = uint64(block.timestamp);
        attestations[evidenceHash] = timestamp;
        emit OrderAttested(evidenceHash, msg.sender, timestamp);
    }

    function isAttested(bytes32 evidenceHash) external view returns (bool) {
        return attestations[evidenceHash] != 0;
    }

    function getAttestation(bytes32 evidenceHash)
        external
        view
        returns (bool exists, uint256 timestamp)
    {
        uint64 storedTimestamp = attestations[evidenceHash];
        return (storedTimestamp != 0, storedTimestamp);
    }
}
