import { expect } from "chai";

import { createInstances } from "../instance";
import { getSigners, initSigners } from "../signers";
import { deployConfidentialERC20Fixture } from "./confidentialerc20.fixture";

describe("Confidential ERC20 tests", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const contract = await deployConfidentialERC20Fixture();
    this.contractAddress = await contract.getAddress();
    this.erc20 = contract;
    this.instances = await createInstances(this.signers);
  });

  it("should mint to alice", async function () {
    const transaction = await this.erc20.mint(this.signers.alice, 1000);
    await transaction.wait();

    //Reencrypt Alice's balance
    const balanceHandleAlice = await this.erc20.balanceOf(this.signers.alice);
    const { publicKey: publicKeyAlice, privateKey: privateKeyAlice } = this.instances.alice.generateKeypair();
    const eip712 = this.instances.alice.createEIP712(publicKeyAlice, this.contractAddress);
    const signatureAlice = await this.signers.alice.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );
    const balanceAlice = await this.instances.alice.reencrypt(
      balanceHandleAlice,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.contractAddress,
      this.signers.alice.address,
    );
    expect(balanceAlice).to.equal(1000);

    const totalSupply = await this.erc20.totalSupply();
    expect(totalSupply).to.equal(1000);
  });
  it ("should mint to bob", async function () {
    const transaction = await this.erc20.mint(this.signers.bob, 1000);
    await transaction.wait();

    //Reencrypt Bob's balance
    const balanceHandleBob = await this.erc20.balanceOf(this.signers.bob);
    const { publicKey: publicKeyBob, privateKey: privateKeyBob } = this.instances.bob.generateKeypair();
    const eip712 = this.instances.bob.createEIP712(publicKeyBob, this.contractAddress);
    const signatureBob = await this.signers.bob.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );
    const balanceBob = await this.instances.bob.reencrypt(
      balanceHandleBob,
      privateKeyBob,
      publicKeyBob,
      signatureBob.replace("0x", ""),
      this.contractAddress,
      this.signers.bob.address,
    );
    expect(balanceBob).to.equal(1000);

    const totalSupply = await this.erc20.totalSupply();
    expect(totalSupply).to.equal(1000);
 
  });
  it("should transfer tokens between two users", async function () {
    const transaction = await this.erc20.mint(this.signers.alice, 10000);
    const t1 = await transaction.wait();
    expect(t1?.status).to.eq(1);

    const input = this.instances.alice.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add64(1337);
    const encryptedTransferAmount = input.encrypt();
    const tx = await this.erc20["transfer(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    const t2 = await tx.wait();
    expect(t2?.status).to.eq(1);

    // Reencrypt Alice's balance
    const balanceHandleAlice = await this.erc20.balanceOf(this.signers.alice);
    const { publicKey: publicKeyAlice, privateKey: privateKeyAlice } = this.instances.alice.generateKeypair();
    const eip712 = this.instances.alice.createEIP712(publicKeyAlice, this.contractAddress);
    const signatureAlice = await this.signers.alice.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );
    const balanceAlice = await this.instances.alice.reencrypt(
      balanceHandleAlice,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.contractAddress,
      this.signers.alice.address,
    );

    expect(balanceAlice).to.equal(10000 - 1337);

    // Reencrypt Bob's balance
    const balanceHandleBob = await this.erc20.balanceOf(this.signers.bob);

    const { publicKey: publicKeyBob, privateKey: privateKeyBob } = this.instances.bob.generateKeypair();
    const eip712Bob = this.instances.bob.createEIP712(publicKeyBob, this.contractAddress);
    const signatureBob = await this.signers.bob.signTypedData(
      eip712Bob.domain,
      { Reencrypt: eip712Bob.types.Reencrypt },
      eip712Bob.message,
    );
    const balanceBob = await this.instances.bob.reencrypt(
      balanceHandleBob,
      privateKeyBob,
      publicKeyBob,
      signatureBob.replace("0x", ""),
      this.contractAddress,
      this.signers.bob.address,
    );

    expect(balanceBob).to.equal(1337);
  });

  it("should not transfer tokens between two users", async function () {
    const transaction = await this.erc20.mint(this.signers.alice, 1000);
    await transaction.wait();

    const input = this.instances.alice.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add64(1337);
    const encryptedTransferAmount = input.encrypt();
    const tx = await this.erc20["transfer(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    await tx.wait();

    const balanceHandleAlice = await this.erc20.balanceOf(this.signers.alice);
    const { publicKey: publicKeyAlice, privateKey: privateKeyAlice } = this.instances.alice.generateKeypair();
    const eip712 = this.instances.alice.createEIP712(publicKeyAlice, this.contractAddress);
    const signatureAlice = await this.signers.alice.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );
    const balanceAlice = await this.instances.alice.reencrypt(
      balanceHandleAlice,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.contractAddress,
      this.signers.alice.address,
    );

    expect(balanceAlice).to.equal(1000);

    // Reencrypt Bob's balance
    const balanceHandleBob = await this.erc20.balanceOf(this.signers.bob);

    const { publicKey: publicKeyBob, privateKey: privateKeyBob } = this.instances.bob.generateKeypair();
    const eip712Bob = this.instances.bob.createEIP712(publicKeyBob, this.contractAddress);
    const signatureBob = await this.signers.bob.signTypedData(
      eip712Bob.domain,
      { Reencrypt: eip712Bob.types.Reencrypt },
      eip712Bob.message,
    );
    const balanceBob = await this.instances.bob.reencrypt(
      balanceHandleBob,
      privateKeyBob,
      publicKeyBob,
      signatureBob.replace("0x", ""),
      this.contractAddress,
      this.signers.bob.address,
    );

    expect(balanceBob).to.equal(0);
  });

  it("should be able to transferFrom only if allowance is sufficient", async function () {
    const transaction = await this.erc20.mint(this.signers.alice, 10000);
    await transaction.wait();

    const inputAlice = this.instances.alice.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    inputAlice.add64(1337);
    const encryptedAllowanceAmount = inputAlice.encrypt();
    const tx = await this.erc20["approve(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedAllowanceAmount.handles[0],
      encryptedAllowanceAmount.inputProof,
    );
    await tx.wait();

    const bobErc20 = this.erc20.connect(this.signers.bob);
    const inputBob1 = this.instances.bob.createEncryptedInput(this.contractAddress, this.signers.bob.address);
    inputBob1.add64(1338); // above allowance so next tx should actually not send any token
    const encryptedTransferAmount = inputBob1.encrypt();
    const tx2 = await bobErc20["transferFrom(address,address,bytes32,bytes)"](
      this.signers.alice.address,
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    await tx2.wait();

    // Decrypt Alice's balance

    const { publicKey: publicKeyAlice, privateKey: privateKeyAlice } = this.instances.alice.generateKeypair();
    const eip712 = this.instances.alice.createEIP712(publicKeyAlice, this.contractAddress);
    const signatureAlice = await this.signers.alice.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );

    const { publicKey: publicKeyBob, privateKey: privateKeyBob } = this.instances.bob.generateKeypair();
    const eip712Bob = this.instances.bob.createEIP712(publicKeyBob, this.contractAddress);
    const signatureBob = await this.signers.bob.signTypedData(
      eip712Bob.domain,
      { Reencrypt: eip712Bob.types.Reencrypt },
      eip712Bob.message,
    );

    const inputBob2 = this.instances.bob.createEncryptedInput(this.contractAddress, this.signers.bob.address);
    inputBob2.add64(1337); // below allowance so next tx should send token
    const encryptedTransferAmount2 = inputBob2.encrypt();
    const tx3 = await bobErc20["transferFrom(address,address,bytes32,bytes)"](
      this.signers.alice.address,
      this.signers.bob.address,
      encryptedTransferAmount2.handles[0],
      encryptedTransferAmount2.inputProof,
    );
    await tx3.wait();

    // Decrypt Alice's balance
    const balanceHandleAlice2 = await this.erc20.balanceOf(this.signers.alice);
    const balanceAlice2 = await this.instances.alice.reencrypt(
      balanceHandleAlice2,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.contractAddress,
      this.signers.alice.address,
    );
    expect(balanceAlice2).to.equal(10000 - 1337); // check that transfer did happen this time

    // Decrypt Bob's balance
    const balanceHandleBob2 = await this.erc20.balanceOf(this.signers.bob);
    const balanceBob2 = await this.instances.bob.reencrypt(
      balanceHandleBob2,
      privateKeyBob,
      publicKeyBob,
      signatureBob.replace("0x", ""),
      this.contractAddress,
      this.signers.bob.address,
    );
    expect(balanceBob2).to.equal(1337); // check that transfer did happen this time*/
  });

  it("should increase and decrease allowance", async function () {
    // Mint tokens to Alice
    const transaction = await this.erc20.mint(this.signers.alice, 10000);
    await transaction.wait();

    // Alice sets an initial allowance of 1337 for Bob
    const inputAlice = this.instances.alice.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    inputAlice.add64(1337);
    const encryptedAllowanceAmount = inputAlice.encrypt();
    const txApprove = await this.erc20["approve(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedAllowanceAmount.handles[0],
      encryptedAllowanceAmount.inputProof,
    );
    await txApprove.wait();

    // Bob increases the allowance by 1000
    const inputAliceIncrease = this.instances.alice.createEncryptedInput(
      this.contractAddress,
      this.signers.alice.address,
    );
    inputAliceIncrease.add64(1000);
    const encryptedIncreaseAmount = inputAliceIncrease.encrypt();
    const txIncrease = await this.erc20["increaseAllowance(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedIncreaseAmount.handles[0],
      encryptedIncreaseAmount.inputProof,
    );
    await txIncrease.wait();

    const allowanceHandle = await this.erc20.allowance(this.signers.alice.address, this.signers.bob.address);
    const { publicKey: publicKeyAlice, privateKey: privateKeyAlice } = this.instances.alice.generateKeypair();
    const eip712 = this.instances.alice.createEIP712(publicKeyAlice, this.contractAddress);
    const signatureAlice = await this.signers.alice.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );
    const allowanceAfterIncrease = await this.instances.alice.reencrypt(
      allowanceHandle,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.contractAddress,
      this.signers.alice.address,
    );
    expect(allowanceAfterIncrease).to.equal(2337);

    const inputAliceDecrease = this.instances.alice.createEncryptedInput(
      this.contractAddress,
      this.signers.alice.address,
    );
    inputAliceDecrease.add64(500);
    const encryptedDecreaseAmount = inputAliceDecrease.encrypt();
    const txDecrease = await this.erc20["decreaseAllowance(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedDecreaseAmount.handles[0],
      encryptedDecreaseAmount.inputProof,
    );
    await txDecrease.wait();

    const allowanceHandleAfterDecrease = await this.erc20.allowance(
      this.signers.alice.address,
      this.signers.bob.address,
    );
    const allowanceAfterDecrease = await this.instances.alice.reencrypt(
      allowanceHandleAfterDecrease,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.contractAddress,
      this.signers.alice.address,
    );
    expect(allowanceAfterDecrease).to.equal(1837);
  });
});
