const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    // Get the contract factory
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");

    console.log("Deploying NFTMarketplace...");
    
    // Deploy the contract
    const nftMarketplace = await NFTMarketplace.deploy();
    
    // Wait for the transaction to be mined
    await nftMarketplace.waitForDeployment();

    const address = await nftMarketplace.getAddress();
    console.log("NFTMarketplace deployed to:", address);

    // Save the contract address
    const config = {
        marketplaceAddress: address
    };
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 