'use client';

import { useState, useRef } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import { useRouter } from 'next/navigation';
import config from '../../config.json';

const NFTABI = [
  "function createToken(string memory tokenURI) public returns (uint)",
  "function setApprovalForAll(address operator, bool approved) public",
  "function isApprovedForAll(address owner, address operator) public view returns (bool)"
];

const NFTMarketplaceABI = [
  "function listItem(address nftAddress, uint256 tokenId, uint256 price) external payable",
  "function getListingFee() external view returns (uint256)"
];

export default function CreateNFT() {
  const [fileUrl, setFileUrl] = useState('');
  const [formInput, setFormInput] = useState({ name: '', price: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadToIPFS() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a file');
      return;
    }
    
    try {
      // For now, we'll just create a local URL
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setError('');
      return url;
    } catch (error) {
      console.log('Error uploading file: ', error);
      setError('Error uploading file');
    }
  }

  async function createNFT() {
    const { name, price } = formInput;
    if (!name || !fileUrl) {
      setError('Please fill in all fields and upload an image');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Create metadata
      const data = {
        name,
        image: fileUrl,
        description: `${name} NFT`
      };

      // Create metadata URL
      const metadataUrl = `data:application/json;base64,${btoa(JSON.stringify(data))}`;
      console.log('Metadata URL:', metadataUrl);

      // Connect wallet
      const web3Modal = new Web3Modal({
        cacheProvider: false,
        providerOptions: {}
      });
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();

      // Create NFT contract instance
      const nftContract = new ethers.Contract(config.nftAddress, NFTABI, signer);
      console.log('Creating token with metadata:', metadataUrl);

      // Mint NFT
      const transaction = await nftContract.createToken(metadataUrl);
      console.log('Waiting for transaction:', transaction.hash);
      const tx = await transaction.wait();
      console.log('Transaction confirmed:', tx.transactionHash);

      // Get token ID from event
      const event = tx.events[0];
      const tokenId = event.args[2].toNumber();
      console.log('Token created:', tokenId);

      if (price) {
        const marketplaceContract = new ethers.Contract(config.marketplaceAddress, NFTMarketplaceABI, signer);
        const listingFee = await marketplaceContract.getListingFee();
        const priceInWei = ethers.utils.parseEther(price);
        
        // Approve marketplace
        await nftContract.setApprovalForAll(config.marketplaceAddress, true);
        
        // List item
        const listingTx = await marketplaceContract.listItem(
          config.nftAddress,
          tokenId,
          priceInWei,
          { value: listingFee }
        );
        await listingTx.wait();
      }
      
      router.push('/inventory');
    } catch (error) {
      console.log('Error creating NFT:', error);
      setError('Error creating NFT. Check console for details.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          placeholder="NFT Name"
          className="mt-8 border rounded p-4"
          onChange={e => setFormInput({ ...formInput, name: e.target.value })}
        />
        <input
          placeholder="NFT Price in ETH (optional)"
          className="mt-2 border rounded p-4"
          type="number"
          step="0.01"
          onChange={e => setFormInput({ ...formInput, price: e.target.value })}
        />
        <input
          type="file"
          name="Asset"
          className="my-4"
          ref={fileInputRef}
          onChange={uploadToIPFS}
        />
        {fileUrl && (
          <img className="rounded mt-4" width="350" src={fileUrl} alt="NFT Preview" />
        )}
        {error && (
          <p className="text-red-500 text-center mt-4">{error}</p>
        )}
        <button
          onClick={createNFT}
          disabled={loading}
          className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create NFT'}
        </button>
      </div>
    </div>
  );
} 