import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { network } from 'hardhat';

describe('AcordesOrderAttestation', async function () {
  const { ethers } = await network.create();

  async function deployFixture() {
    const [relayer, other] = await ethers.getSigners();
    const contract = await ethers.deployContract('AcordesOrderAttestation', [relayer.address]);
    await contract.waitForDeployment();
    return { contract, relayer, other };
  }

  it('stores an evidence hash and exposes its timestamp', async function () {
    const { contract } = await deployFixture();
    const evidenceHash = ethers.id('order-evidence-1');

    const transaction = await contract.attest(evidenceHash);
    await transaction.wait();

    assert.equal(await contract.isAttested(evidenceHash), true);
    const [exists, timestamp] = await contract.getAttestation(evidenceHash);
    assert.equal(exists, true);
    assert.ok(timestamp > 0n);
  });

  it('rejects duplicate evidence', async function () {
    const { contract } = await deployFixture();
    const evidenceHash = ethers.id('order-evidence-duplicate');
    await (await contract.attest(evidenceHash)).wait();

    await assert.rejects(contract.attest(evidenceHash), /EvidenceAlreadyAttested/);
  });

  it('rejects calls from an unauthorized wallet', async function () {
    const { contract, other } = await deployFixture();

    await assert.rejects(
      contract.connect(other).attest(ethers.id('unauthorized-evidence')),
      /UnauthorizedRelayer/
    );
  });

  it('rejects an empty evidence hash', async function () {
    const { contract } = await deployFixture();

    await assert.rejects(contract.attest(ethers.ZeroHash), /EmptyEvidenceHash/);
  });
});
