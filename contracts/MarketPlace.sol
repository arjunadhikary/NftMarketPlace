// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.7;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
error MarketPlace__PriceMustBeAboveZero();
error MarketPlace__NotOwner();
error MarketPlace__NotApprovedForTransaction();
error MarketPlace__AlreadyListed(address nftAddress, uint256 tokenId);
error MarketPlace__NotListed();
error MarketPlace__PriceDoesnotMatch();
error MarketPlace__AmountMustBeAboveZero();
error MarketPlace__TransctionFailed();

contract MarketPlace is ReentrancyGuard {
    /** Struct */
    struct Listing {
        address owner;
        uint256 price;
    }

    /** Mapping */
    mapping(address => mapping(uint256 => Listing)) private s_listing;
    mapping(address => uint256) private addressToAmount;

    /** Modifiers */
    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address nftOwner
    ) {
        IERC721 token = IERC721(nftAddress);
        address onwer = token.ownerOf(tokenId);
        if (onwer != nftOwner) revert MarketPlace__NotOwner();
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listing[nftAddress][tokenId];
        if (listing.price <= 0) revert MarketPlace__NotListed();

        _;
    }
    modifier NotListed(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) {
        Listing memory list = s_listing[nftAddress][tokenId];
        if (list.price > 0)
            revert MarketPlace__AlreadyListed(nftAddress, tokenId);
        _;
    }

    /** Events */
    event NFTListedInMarketPlace(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed owner,
        uint256 price
    );
    event ItemBought(
        address indexed owner,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemCanceled(
        address indexed owner,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    constructor() {}

    function listNFT(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    )
        external
        NotListed(nftAddress, tokenId, price)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        if (price <= 0) revert MarketPlace__PriceMustBeAboveZero();
        IERC721 nft = IERC721(nftAddress);
        // check isApproved on behlf of user
        if (nft.getApproved(tokenId) != address(this))
            revert MarketPlace__NotApprovedForTransaction();
        s_listing[nftAddress][tokenId] = Listing(msg.sender, price);
        emit NFTListedInMarketPlace(nftAddress, tokenId, msg.sender, price);
    }

    function buyNFT(address nftAddress, uint256 tokenId)
        external
        payable
        isListed(nftAddress, tokenId)
        nonReentrant
    {
        //make sure to never send money during transcation instead have a way to store user's money and provide withdraw function to withdraw
        // their amount instead ie create a mapping of user'sAddress -> amount and update the amount accordingly

        /** first transfer the token from one user's to another */
        Listing memory list = s_listing[nftAddress][tokenId];
        if (msg.value < list.price) revert MarketPlace__PriceDoesnotMatch();
        //update users amount
        addressToAmount[list.owner] += msg.value;
        delete s_listing[nftAddress][tokenId];
        // then transfer
        IERC721(nftAddress).safeTransferFrom(list.owner, msg.sender, tokenId);
        emit ItemBought(msg.sender, nftAddress, tokenId, list.price);
    }

    function cancleListing(address nftAddress, uint256 tokenId)
        external
        isListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        delete (s_listing[nftAddress][tokenId]);
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    )
        external
        isListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        Listing memory item = (s_listing[nftAddress][tokenId]);
        item.price = newPrice;
        emit NFTListedInMarketPlace(nftAddress, tokenId, msg.sender, newPrice);
    }

    function withDrawProceeds() external {
        uint256 proceeds = addressToAmount[msg.sender];
        if (proceeds <= 0) {
            revert MarketPlace__AmountMustBeAboveZero();
        }
        addressToAmount[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        require(success, "Transfer failed");
    }

    /** getters */
    function getProceeds(address sender) public view returns (uint256) {
        return addressToAmount[sender];
    }

    function getLisiting(address nftAddress, uint256 tokenId)
        public
        view
        returns (Listing memory)
    {
        return s_listing[nftAddress][tokenId];
    }
}
