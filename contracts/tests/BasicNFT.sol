// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BasicNFT is ERC721 {
    string public constant TOKEN_URI =
        "ipfs://bafybeia2eyrmylz3qmzvan4qj637ov7ieb3pqakgazqwibcktfnlhlvxiq";
    uint256 private s_tokenCounter;
    event DogMinted(uint256 tokenId);

    constructor() ERC721("CODEKAVYA", "CK") {
        s_tokenCounter = 0;
    }

    function mintNFT() public {
        _safeMint(msg.sender, s_tokenCounter);
        emit DogMinted(s_tokenCounter);
        s_tokenCounter = s_tokenCounter + 1;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    function tokenURI(
        uint256 /**tokenId */
    ) public view override returns (string memory) {
        return TOKEN_URI;
    }
}
