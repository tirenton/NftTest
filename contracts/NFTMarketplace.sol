// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Custom Errors
error NotOwner();
error PriceMustBeAboveZero();
error NotApprovedForMarketplace();

contract NFTMarketplace is ReentrancyGuard, Ownable {
    // State variables
    struct Listing {
        uint256 price;
        address seller;
        bool active;
    }
    mapping(address => mapping(uint256 => Listing)) private s_listings; // nft address -> token id -> listing
    mapping(address => uint256) private s_proceeds; // seller address -> amount earned
    uint256 public listingFee = 0.025 ether;

    // Events
    event ItemListed(
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        address indexed seller
    );

    event ItemCanceled(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed seller
    );

    event ItemBought(
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        address seller,
        address indexed buyer
    );

    // Modifiers
    modifier notListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        require(!listing.active, "Item already listed");
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        require(listing.active, "Item not listed");
        _;
    }

    modifier isOwner(address nftAddress, uint256 tokenId) {
        IERC721 nft = IERC721(nftAddress);
        if (nft.ownerOf(tokenId) != msg.sender) {
            revert NotOwner();
        }
        _;
    }

    constructor() {}

    // Functions
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external payable 
        notListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId)
    {
        if (price <= 0) {
            revert PriceMustBeAboveZero();
        }
        require(msg.value == listingFee, "Must pay listing fee");

        IERC721 nft = IERC721(nftAddress);
        if (!nft.isApprovedForAll(msg.sender, address(this))) {
            revert NotApprovedForMarketplace();
        }

        s_listings[nftAddress][tokenId] = Listing({
            price: price,
            seller: msg.sender,
            active: true
        });

        emit ItemListed(nftAddress, tokenId, price, msg.sender);
    }

    function cancelListing(address nftAddress, uint256 tokenId) 
        external 
        isListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId)
    {
        delete s_listings[nftAddress][tokenId];
        emit ItemCanceled(nftAddress, tokenId, msg.sender);
    }

    function buyItem(address nftAddress, uint256 tokenId) 
        external 
        payable
        isListed(nftAddress, tokenId)
        nonReentrant
    {
        Listing memory listing = s_listings[nftAddress][tokenId];
        require(msg.value == listing.price, "Price not met");

        // Update proceeds for the seller
        s_proceeds[listing.seller] += msg.value;

        // Delete the listing
        delete s_listings[nftAddress][tokenId];

        // Transfer NFT to buyer
        IERC721(nftAddress).transferFrom(listing.seller, msg.sender, tokenId);

        emit ItemBought(
            nftAddress,
            tokenId,
            listing.price,
            listing.seller,
            msg.sender
        );
    }

    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender];
        require(proceeds > 0, "No proceeds to withdraw");

        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        require(success, "Transfer failed");
    }

    function updateListingFee(uint256 _listingFee) external onlyOwner {
        listingFee = _listingFee;
    }

    // View functions
    function getListing(address nftAddress, uint256 tokenId) 
        external 
        view 
        returns (Listing memory) 
    {
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }

    function getListingFee() external view returns (uint256) {
        return listingFee;
    }
} 