'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import config from '../../config.json';

const NFTABI = [
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function balanceOf(address owner) public view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)",
  "function setApprovalForAll(address operator, bool approved) public",
  "function isApprovedForAll(address owner, address operator) public view returns (bool)"
];

const NFTMarketplaceABI = [
  "function getListingFee() public view returns (uint256)",
  "function listItem(address nftContract, uint256 tokenId, uint256 price) public payable",
  "function getListing(address nftAddress, uint256 tokenId) public view returns (address seller, uint256 price, bool active)"
];

interface NFT {
  tokenId: number;
  name: string;
  image: string;
  isListed: boolean;
}

export default function Inventory() {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loadingState, setLoadingState] = useState('not-loaded');
  const [listingPrice, setListingPrice] = useState('');
  const [selectedNFT, setSelectedNFT] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNFTs();
  }, []);

  async function loadNFTs() {
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      const nftContract = new ethers.Contract(config.nftAddress, NFTABI, provider);
      const marketplaceContract = new ethers.Contract(config.marketplaceAddress, NFTMarketplaceABI, provider);

      const balance = await nftContract.balanceOf(address);
      const items: NFT[] = [];

      for (let i = 0; i < balance; i++) {
        const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
        const tokenURI = await nftContract.tokenURI(tokenId);
        
        // Parse base64 metadata
        const json = atob(tokenURI.substring(29));
        const data = JSON.parse(json);

        // Check if NFT is listed
        const listing = await marketplaceContract.getListing(config.nftAddress, tokenId);

        items.push({
          tokenId: tokenId.toNumber(),
          name: data.name,
          image: data.image,
          isListed: listing.active
        });
      }

      setNfts(items);
      setLoadingState('loaded');
    } catch (error) {
      console.log('Error loading NFTs:', error);
      setLoadingState('error');
    }
  }

  async function listNFT(tokenId: number) {
    if (!listingPrice) return;

    try {
      setLoading(true);
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();

      const nftContract = new ethers.Contract(config.nftAddress, NFTABI, signer);
      const marketplaceContract = new ethers.Contract(config.marketplaceAddress, NFTMarketplaceABI, signer);

      // Get listing fee
      const listingFee = await marketplaceContract.getListingFee();

      // Approve marketplace
      await nftContract.setApprovalForAll(config.marketplaceAddress, true);

      // List NFT
      const priceInWei = ethers.utils.parseUnits(listingPrice, 'ether');
      await marketplaceContract.listItem(config.nftAddress, tokenId, priceInWei, {
        value: listingFee
      });

      // Refresh NFTs
      loadNFTs();
      setSelectedNFT(null);
      setListingPrice('');
    } catch (error) {
      console.log('Error listing NFT:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loadingState === 'not-loaded') {
    return <div className="flex justify-center items-center h-screen bg-gray-900 text-white">Loading...</div>;
  }

  if (loadingState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
        <div className="text-red-500 mb-4">Error loading NFTs</div>
        <button
          onClick={loadNFTs}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-lg p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-white">My NFT Inventory</h1>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {nfts.length === 0 ? (
          <div className="text-center text-2xl font-bold text-gray-300">
            No NFTs in your inventory
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {nfts.map((nft) => (
              <div key={nft.tokenId} className="border border-gray-700 bg-gray-800 shadow rounded-xl overflow-hidden">
                <img src={nft.image} className="w-full h-64 object-cover" alt={nft.name} />
                <div className="p-4">
                  <p className="text-2xl font-bold text-white">{nft.name}</p>
                  <p className="text-gray-400">Token ID: {nft.tokenId}</p>
                  {nft.isListed ? (
                    <p className="text-green-500 mt-2">Listed for sale</p>
                  ) : selectedNFT === nft.tokenId ? (
                    <div className="mt-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price in ETH"
                        className="w-full p-2 border border-gray-700 bg-gray-800 text-white rounded focus:outline-none focus:border-pink-500"
                        value={listingPrice}
                        onChange={(e) => setListingPrice(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => listNFT(nft.tokenId)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                          disabled={loading}
                        >
                          {loading ? 'Listing...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedNFT(null);
                            setListingPrice('');
                          }}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedNFT(nft.tokenId)}
                      className="w-full mt-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded"
                    >
                      List for Sale
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 