# Loyalty Points Demo

## Demo Project: Programmable Money Using Hyperledger Fabric ERC-20 Tokens
This sample implements a standard ERC-20 fungible token smart contract, which is ideal for demonstrating programmable money. Programmable money refers to digital currency whose behavior is controlled by code (e.g., rules for issuance, transfers, approvals, and conditions), enabling automation, conditional logic, and security beyond traditional money.
## Real-World Scenario
We'll use a loyalty points system for a retail store as the scenario. In this system:

- The store (as a "minter") issues loyalty points (tokens) to customers for purchases.
- Customers can transfer points to friends or family.
- Customers can approve the store (or a third-party service) to deduct points for redemptions (e.g., for discounts or products).
- Transfers can be programmed with basic rules (e.g., no transfers if balance is below a threshold, or automatic approvals for certain accounts).
- This showcases programmable features: automated issuance (minting), conditional transfers, delegated spending (approve/transferFrom), and queries for balances/supply.

This scenario highlights all ERC-20 features: minting, transferring, approving, checking allowances/balances, and total supply. We'll use the JavaScript implementation of the smart contract (as per your preference) and a Node.js client application to interact with it. The project will run on the Fabric test network to simulate a blockchain environment.
## Overview
This project is a Hyperledger Fabric-based application that implements a loyalty points system using the `token-erc-20` chaincode. It runs on the `fabric-samples` `test-network` with two organizations (Org1, Org2) and a channel (`loyaltychannel`). The Node.js client application (`app.js`) interacts with the `loyaltypoints` chaincode to perform operations like minting points, checking balances, and transferring points. The project showcases Fabric’s capabilities for managing digital assets in a permissioned blockchain network.

## Prerequisites
- **Hyperledger Fabric v2.5.12**: Clone `fabric-samples` and install binaries.
- **Node.js v16**: Use `nvm use 16` for compatibility.
- **Docker and Docker Compose**: Required to run the Fabric network.
- **Git**: For cloning repositories.

## Setup Instructions
Follow these steps to set up and run the demo:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/<username>/loyalty-points-demo.git
   cd loyalty-points-demo
   ```

2. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```
   This installs `fabric-network` and `fabric-ca-client` as specified in `package.json`.

3. **Set Up Hyperledger Fabric Network**:
   - Clone the `fabric-samples` repository:
     ```bash
     git clone https://github.com/hyperledger/fabric-samples.git
     cd fabric-samples
     curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- binary
     ```
   - If the chaincode is not included in this repository, ensure `fabric-samples/token-erc-20/chaincode-javascript` exists. Otherwise, copy it:
     ```bash
     cp -r ~/loyalty-points-demo/chaincode-javascript ~/fabric-samples/token-erc-20/chaincode-javascript
     ```
   - Start the network and deploy the chaincode:
     ```bash
     cd ~/fabric-samples/test-network
     ./network.sh up createChannel -c loyaltychannel -ca
     ./network.sh deployCC -ccn loyaltypoints -ccp ../token-erc-20/chaincode-javascript -ccl javascript -c loyaltychannel
     ```

4. **Enroll Admin and Run the Application**:
   ```bash
   cd ~/loyalty-points-demo
   node enrollAdmin.js
   node app.js
   ```

5. **Expected Output**:
   ```bash
   --> Programmable Money Demo: Loyalty Points System
   Contract already initialized with symbol: LPT
   Minted 1000 points to store owner.
   Total Supply: 1000
   Store Owner Account ID: <id>
   Store Owner Balance: 1000
   Customer1 enrolled.
   Issued 500 points to customer1.
   Customer1 Balance: 500
   Customer1 approved store to spend 200 points.
   Allowance for store: 200
   Store deducted 200 points from customer1 via approval.
   Final Store Balance: 1200
   Final Customer1 Balance: 300
   ```

## Project Structure
- `app.js`: Main Node.js application to interact with the `loyaltypoints` chaincode (mint, transfer, approve, etc.).
- `enrollAdmin.js`: Enrolls `admin` and `customer1` identities, storing credentials in `wallet/`.
- `package.json`: Specifies Node.js dependencies (`fabric-network`, `fabric-ca-client`) and Node.js v16.
- `connection-org1.json`: Connection profile for Org1 to connect to the Fabric network.
- `chaincode-javascript/` (optional): Source code for the `token-erc-20` chaincode, implementing ERC-20-like token functionality.

## Requirements
- **Hyperledger Fabric**: v2.5.12 (install via `fabric-samples` script).
- **Node.js**: v16 (`nvm install 16; nvm use 16`).
- **Docker**: For running the Fabric network (peers, orderers, CAs).
- **Operating System**: Tested on Linux (Ubuntu recommended).

## Notes
- **Excluded Files**:
  - `wallet/`: Dynamically created by `enrollAdmin.js`, contains sensitive credentials (excluded via `.gitignore`).
  - `node_modules/`: Generated by `npm install`, excluded to reduce repository size.
  - Temporary files (e.g., `*.tar.gz`): Generated during chaincode deployment, excluded.
- **Chaincode**: If `chaincode-javascript/` is not included, use `fabric-samples/token-erc-20/chaincode-javascript`. Run `npm install` in that directory before deployment.
- **Network Dependency**: The project relies on `fabric-samples/test-network` for the Fabric network setup.
- **Security**: Never push the `wallet/` directory to GitHub, as it contains private keys.

## Troubleshooting
- **Network Issues**: Ensure Docker containers are running (`docker ps -a`) and ports (7050, 7051, 7054, 9051) are open.
- **Chaincode Errors**: Verify chaincode installation:
  ```bash
  cd ~/fabric-samples/test-network
  export FABRIC_CFG_PATH=~/fabric-samples/test-network
  export CORE_PEER_LOCALMSPID=Org1MSP
  export CORE_PEER_MSPCONFIGPATH=~/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
  export CORE_PEER_ADDRESS=localhost:7051
  peer lifecycle chaincode queryinstalled
  peer lifecycle chaincode querycommitted --channelID loyaltychannel
  ```
- **Node.js Errors**: Ensure Node.js v16 (`nvm use 16`) and dependencies are installed (`npm install`).
