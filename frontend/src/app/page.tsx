'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import config from '../config.json';

// Contract ABIs
const NFTMarketplaceABI = [
  "function listItem(address nftAddress, uint256 tokenId, uint256 price) external payable",
  "function getListing(address nftAddress, uint256 tokenId) external view returns (tuple(uint256 price, address seller, bool active))",
  "function buyItem(address nftAddress, uint256 tokenId) external payable",
  "function getListingFee() external view returns (uint256)",
  "function withdrawProceeds() external",
  "function getProceeds(address seller) external view returns (uint256)"
];

const NFTABI = [
  "function createToken(string memory tokenURI) public returns (uint)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function setApprovalForAll(address operator, bool approved) public",
  "function isApprovedForAll(address owner, address operator) public view returns (bool)"
];

// Contract addresses from your deployment
const NFTMarketplaceAddress = config.marketplaceAddress;
const NFTAddress = config.nftAddress;

interface NFT {
  tokenId: number;
  seller: string;
  price: string;
  tokenURI: string;
  name: string;
  image: string;
}

export default function Home() {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loadingState, setLoadingState] = useState('not-loaded');
  const [account, setAccount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadNFTs();
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const web3Modal = new Web3Modal({
        cacheProvider: false,
        providerOptions: {}  // This will only show MetaMask
      });
      
      if (web3Modal.cachedProvider) {
        await disconnectWallet();
      }
    } catch (error) {
      console.log('Error checking connection:', error);
    }
  }

  async function connectWallet() {
    try {
      setIsLoading(true);
      const web3Modal = new Web3Modal({
        cacheProvider: false,
        providerOptions: {}  // This will only show MetaMask
      });
      
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      
      connection.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      });
      
      setIsLoading(false);
    } catch (error) {
      console.log('Error connecting wallet:', error);
      setIsLoading(false);
    }
  }

  async function disconnectWallet() {
    try {
      const web3Modal = new Web3Modal();
      web3Modal.clearCachedProvider();
      setAccount('');
      
      window.location.reload();
    } catch (error) {
      console.log('Error disconnecting wallet:', error);
    }
  }

  async function loadNFTs() {
    try {
      const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
      const marketplaceContract = new ethers.Contract(
        NFTMarketplaceAddress,
        NFTMarketplaceABI,
        provider
      );

      const nftContract = new ethers.Contract(
        NFTAddress,
        NFTABI,
        provider
      );

      const items: NFT[] = [];
      // Check first 10 token IDs
      for (let i = 1; i <= 10; i++) {
        try {
          const listing = await marketplaceContract.getListing(NFTAddress, i);
          if (listing.active) {
            // Get token URI and metadata
            let tokenURI = '';
            let name = '';
            let image = '';
            try {
              tokenURI = await nftContract.tokenURI(i);
              // Parse base64 metadata
              const json = atob(tokenURI.substring(29));
              const data = JSON.parse(json);
              name = data.name;
              image = data.image;
            } catch (error) {
              console.log(`Error getting token URI for token ${i}:`, error);
            }

            items.push({
              tokenId: i,
              seller: listing.seller,
              price: ethers.utils.formatEther(listing.price),
              tokenURI,
              name,
              image
            });
          }
        } catch (error) {
          console.log(`Error fetching listing ${i}:`, error);
        }
      }

      console.log('Loaded items:', items);
      setNfts(items);
      setLoadingState('loaded');
    } catch (error) {
      console.log('Error loading NFTs:', error);
      setLoadingState('error');
    }
  }

  async function buyNFT(tokenId: number, price: string) {
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      
      const marketplaceContract = new ethers.Contract(
        NFTMarketplaceAddress,
        NFTMarketplaceABI,
        signer
      );

      const transaction = await marketplaceContract.buyItem(NFTAddress, tokenId, {
        value: ethers.utils.parseEther(price)
      });
      await transaction.wait();
      
      loadNFTs();
    } catch (error) {
      console.log('Error buying NFT:', error);
      alert('Error buying NFT. Check console for details.');
    }
  }

  if (loadingState === 'not-loaded') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (loadingState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 mb-4">Error loading NFTs</div>
        <button
          onClick={loadNFTs}
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-lg p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">NFT Marketplace</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={loadNFTs}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Refresh
            </button>
            <a
              href="/inventory"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              My Inventory
            </a>
            <a
              href="/create"
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded"
            >
              Create NFT
            </a>
            {account ? (
              <div className="flex items-center gap-2">
                <span className="text-white">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
                <button
                  onClick={disconnectWallet}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {nfts.length === 0 ? (
          <div className="text-center text-2xl font-bold text-gray-300">
            No NFTs listed
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {nfts.map((nft) => (
              <div key={nft.tokenId} className="border border-gray-700 bg-gray-800 shadow rounded-xl overflow-hidden">
                {nft.image && (
                  <img src={nft.image} className="w-full h-64 object-cover" alt={nft.name || `NFT ${nft.tokenId}`} />
                )}
                <div className="p-4">
                  {nft.name && (
                    <p className="text-2xl font-bold text-white mb-2">{nft.name}</p>
                  )}
                  <p className="text-xl font-bold text-white">Token ID: {nft.tokenId}</p>
                  <p className="text-gray-400">Seller: {nft.seller.slice(0, 6)}...{nft.seller.slice(-4)}</p>
                  <p className="text-xl font-semibold mt-4 text-white">{nft.price} ETH</p>
                </div>
                <div className="p-4 bg-gray-900">
                  <button
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-12 rounded"
                    onClick={() => buyNFT(nft.tokenId, nft.price)}
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
