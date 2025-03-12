# NFT Marketplace

A decentralized NFT marketplace built with Hardhat, Next.js, and Ethers.js.

## Features

- Create and mint NFTs
- List NFTs for sale
- Buy NFTs from other users
- View your NFT inventory
- Modern UI with Tailwind CSS

## Tech Stack

- Solidity (Smart Contracts)
- Hardhat (Development Environment)
- Next.js (Frontend Framework)
- Ethers.js (Blockchain Interaction)
- Tailwind CSS (Styling)
- Web3Modal (Wallet Connection)

## Getting Started

1. Clone the repository:
```bash
git clone <your-repo-url>
cd nft-marketplace
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

3. Start the local Hardhat node:
```bash
npx hardhat node
```

4. Deploy the contracts:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

5. Start the frontend:
```bash
cd frontend
npm run dev
```

6. Connect with MetaMask:
- Network Name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `1337`
- Currency Symbol: `ETH`

## Environment Setup

1. Create a `.env` file in the root directory:
```env
PRIVATE_KEY=your_private_key_here
```

2. Import the test account in MetaMask using the private key:
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## License

MIT
