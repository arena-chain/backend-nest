import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  const Factory = await ethers.getContractFactory('ArenaTicketNFT');
  const contract = await Factory.deploy(deployer.address);

  await contract.deployed();
  console.log('ArenaTicketNFT:', contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
