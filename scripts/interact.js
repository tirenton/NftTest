const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const [owner, buyer] = await ethers.getSigners();
    
    // Read the deployed contract address
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const marketplaceAddress = config.marketplaceAddress;
    
    // Get the deployed marketplace contract
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const marketplace = NFTMarketplace.attach(marketplaceAddress);

    console.log("NFT Marketplace opened at:", marketplaceAddress);
    console.log("Owner address:", owner.address);

    // Get listing fee
    const listingFee = await marketplace.getListingFee();
    console.log("Listing fee:", ethers.formatEther(listingFee), "ETH");

    // Deploy a sample NFT for testing
    const NFT = await ethers.getContractFactory("NFT");
    const nft = await NFT.deploy();
    await nft.waitForDeployment();
    
    const nftAddress = await nft.getAddress();
    console.log("Sample NFT deployed at:", nftAddress);

    // Mint an NFT
    console.log("Minting NFT...");
    const mintTx = await nft.createToken("https://example.com/nft/1");
    await mintTx.wait();
    console.log("NFT minted!");

    // Approve marketplace to handle NFT
    console.log("Approving marketplace...");
    const approveTx = await nft.setApprovalForAll(marketplaceAddress, true);
    await approveTx.wait();
    console.log("Marketplace approved!");

    // List NFT on marketplace
    console.log("Listing NFT...");
    const price = ethers.parseEther("1.0"); // 1 ETH
    const listTx = await marketplace.listItem(nftAddress, 1, price, { value: listingFee });
    await listTx.wait();
    console.log("NFT listed successfully!");

    // Get listing details
    const listing = await marketplace.getListing(nftAddress, 1);
    console.log("Listing details:");
    console.log("- Price:", ethers.formatEther(listing.price), "ETH");
    console.log("- Seller:", listing.seller);
    console.log("- Active:", listing.active);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 