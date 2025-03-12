const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT Marketplace", function () {
  let NFT;
  let nft;
  let Marketplace;
  let marketplace;
  let listingFee;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Get contract factories
    Marketplace = await ethers.getContractFactory("NFTMarketplace");
    NFT = await ethers.getContractFactory("NFT");

    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy marketplace
    marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();

    // Deploy NFT contract
    nft = await NFT.deploy(await marketplace.getAddress());
    await nft.waitForDeployment();

    // Get listing fee
    listingFee = await marketplace.getListingFee();
  });

  describe("Minting NFTs", function () {
    it("Should create and mint an NFT", async function () {
      await nft.createToken("https://some-token.uri");
      expect(await nft.ownerOf(1)).to.equal(owner.address);
    });
  });

  describe("Creating market items", function () {
    it("Should create a market item", async function () {
      // Mint NFT
      await nft.createToken("https://some-token.uri");
      const price = ethers.parseEther("1");

      // Create market item
      await marketplace.createMarketItem(
        await nft.getAddress(),
        1,
        price,
        { value: listingFee }
      );

      const items = await marketplace.fetchMarketItems();
      expect(items.length).to.equal(1);
      expect(items[0].price).to.equal(price);
    });
  });

  describe("Market sales", function () {
    it("Should execute market sales", async function () {
      // Mint and list NFT
      await nft.createToken("https://some-token.uri");
      const price = ethers.parseEther("1");
      
      await marketplace.createMarketItem(
        await nft.getAddress(),
        1,
        price,
        { value: listingFee }
      );

      // addr1 purchases item
      await marketplace.connect(addr1).createMarketSale(
        await nft.getAddress(),
        1,
        { value: price }
      );

      const items = await marketplace.fetchMarketItems();
      expect(items.length).to.equal(0); // Should be sold
      
      const myNfts = await marketplace.connect(addr1).fetchMyNFTs();
      expect(myNfts.length).to.equal(1);
    });
  });
}); 