const hre = require("hardhat");

async function main() {
  // Deploy NFT contract
  console.log("Deploying NFT contract...");
  const NFT = await hre.ethers.getContractFactory("NFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  console.log("NFT contract deployed to:", await nft.getAddress());

  // Deploy Marketplace contract
  console.log("\nDeploying Marketplace contract...");
  const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
  const marketplace = await NFTMarketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace contract deployed to:", marketplaceAddress);

  // Get the listing fee
  const listingFee = await marketplace.getListingFee();
  console.log("Listing fee:", hre.ethers.formatEther(listingFee), "ETH");

  // Create and list 3 NFTs
  for (let i = 0; i < 3; i++) {
    console.log(`\nCreating and listing NFT ${i + 1}...`);
    
    // Create NFT
    const createTx = await nft.createToken(`ipfs://test-uri-${i + 1}`);
    await createTx.wait();
    
    // Approve marketplace
    const approveTx = await nft.setApprovalForAll(marketplaceAddress, true);
    await approveTx.wait();
    
    // List NFT
    const price = hre.ethers.parseEther((1 + i).toString());
    const listTx = await marketplace.listItem(
      await nft.getAddress(),
      i + 1,
      price,
      { value: listingFee }
    );
    await listTx.wait();
    
    console.log(`Listed NFT ${i + 1} for ${i + 1} ETH`);
  }

  console.log("\nAll NFTs have been created and listed!");
  console.log("NFT contract:", await nft.getAddress());
  console.log("Marketplace contract:", marketplaceAddress);

  // Save the contract addresses to a file
  const fs = require("fs");
  const config = {
    nftAddress: await nft.getAddress(),
    marketplaceAddress: marketplaceAddress
  };
  fs.writeFileSync("frontend/src/config.json", JSON.stringify(config, null, 2));
  console.log("\nContract addresses saved to frontend/src/config.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 