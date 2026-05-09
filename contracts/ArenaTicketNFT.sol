// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ArenaTicketNFT is ERC721URIStorage, Ownable {
    struct TicketData {
        string tournamentId;
        string tournamentName;
        uint64 eventDate;
        string ticketType;
        bool valid;
        bool used;
    }

    uint256 private _nextTokenId = 1;
    mapping(uint256 => TicketData) private _ticketData;

    event TicketMinted(
        uint256 indexed tokenId,
        address indexed to,
        string tournamentId,
        string ticketType,
        string metadataURI
    );

    event TicketUsed(uint256 indexed tokenId);

    constructor(address initialOwner) ERC721("ArenaChain Ticket", "ARCTKT") Ownable(initialOwner) {}

    function mintTicket(
        address to,
        string calldata metadataURI,
        string calldata tournamentId,
        string calldata tournamentName,
        uint64 eventDate,
        string calldata ticketType
    ) external onlyOwner returns (uint256 tokenId) {
        require(to != address(0), "invalid recipient");
        require(bytes(metadataURI).length > 0, "metadata required");
        require(bytes(tournamentId).length > 0, "tournamentId required");
        require(bytes(ticketType).length > 0, "ticketType required");

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        _ticketData[tokenId] = TicketData({
            tournamentId: tournamentId,
            tournamentName: tournamentName,
            eventDate: eventDate,
            ticketType: ticketType,
            valid: true,
            used: false
        });

        emit TicketMinted(tokenId, to, tournamentId, ticketType, metadataURI);
    }

    function markUsed(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "token does not exist");
        TicketData storage ticket = _ticketData[tokenId];
        require(ticket.valid, "ticket invalid");
        require(!ticket.used, "ticket already used");
        ticket.used = true;
        ticket.valid = false;
        emit TicketUsed(tokenId);
    }

    function getTicketData(uint256 tokenId) external view returns (TicketData memory) {
        require(_ownerOf(tokenId) != address(0), "token does not exist");
        return _ticketData[tokenId];
    }
}
