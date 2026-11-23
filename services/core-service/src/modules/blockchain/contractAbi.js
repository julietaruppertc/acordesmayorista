module.exports = [
  'event OrderAttested(bytes32 indexed evidenceHash, address indexed relayer, uint256 timestamp)',
  'function attest(bytes32 evidenceHash)',
  'function isAttested(bytes32 evidenceHash) view returns (bool)',
  'function getAttestation(bytes32 evidenceHash) view returns (bool exists, uint256 timestamp)'
];
