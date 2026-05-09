# backend-nest

## TicketsNFT branch content

This branch contains the MVP backend artifacts for admin-created NFT tournament tickets:

- `contracts/ArenaTicketNFT.sol`  
  ERC-721 contract with admin-only `mintTicket(...)`, plus ticket usage state.

- `scripts/deploy.ts`  
  Hardhat deploy script for the ticket contract.

- `src/tickets-nft/tickets-nft.service.ts`  
  NestJS service example for batch minting from admin workflows.

- `docs/nft-ticket-metadata.example.json`  
  JSON metadata structure ready for IPFS/backend hosting.