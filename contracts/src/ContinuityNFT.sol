// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ContinuityNFT — non-transferable continuity credential for heir mode
/// @dev Minimal ERC-721-like mint/burn; full ERC721 optional later. Soulbound by default.
contract ContinuityNFT {
    address public owner;
    string public name = "HEIRLOCK Continuity";
    string public symbol = "HLCONT";

    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => string) public tokenURI;
    uint256 public nextId = 1;

    event Minted(uint256 indexed tokenId, address indexed to, string uri);
    event Burned(uint256 indexed tokenId, address indexed from);

    error NotOwner();
    error Soulbound();
    error NotTokenOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function mint(address to, string calldata uri) external onlyOwner returns (uint256 id) {
        id = nextId++;
        ownerOf[id] = to;
        balanceOf[to] += 1;
        tokenURI[id] = uri;
        emit Minted(id, to, uri);
    }

    function burn(uint256 tokenId) external {
        address from = ownerOf[tokenId];
        if (msg.sender != from && msg.sender != owner) revert NotTokenOwner();
        delete ownerOf[tokenId];
        delete tokenURI[tokenId];
        balanceOf[from] -= 1;
        emit Burned(tokenId, from);
    }

    /// @notice Soulbound — transfers disabled
    function transferFrom(address, address, uint256) external pure {
        revert Soulbound();
    }
}
