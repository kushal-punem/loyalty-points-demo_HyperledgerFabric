/*
 * Hyperledger Fabric Loyalty Points Demo
 * Author: You 😊
 * Description: Demonstrates a programmable ERC-20 style token on Fabric (Loyalty Points System)
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

async function main() {
    try {
        console.log('\n🚀 Starting Loyalty Points Demo...\n');

        // 1️⃣ Load network configuration (connection profile)
        const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 2️⃣ Setup wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // 3️⃣ Enroll Admin if not already enrolled
        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const ca = new FabricCAServices(caURL);
        let adminIdentity = await wallet.get('admin');

        if (!adminIdentity) {
            console.log('Enrolling admin user...');
            const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
            const identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes()
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };
            await wallet.put('admin', identity);
            console.log('✅ Admin enrolled and added to wallet');
        }

        // 4️⃣ Connect as admin (store owner)
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'admin',
            discovery: { enabled: true, asLocalhost: true },
        });
        const network = await gateway.getNetwork('loyaltychannel');
        const contract = network.getContract('loyaltypoints');

        console.log('\n--> 💰 Loyalty Points Contract Demo Started');

        // 5️⃣ Check if contract is initialized
        let isInitialized = false;
        try {
            const name = await contract.evaluateTransaction('TokenName');
            if (name && name.toString()) {
                isInitialized = true;
                console.log(`✅ Contract already initialized with name: ${name.toString()}`);
            }
        } catch (error) {
            console.log('ℹ️ Contract not yet initialized:', error.message);
        }

        // 6️⃣ Initialize contract if needed
        if (!isInitialized) {
            console.log('🔧 Initializing contract...');
            await contract.submitTransaction('Initialize', 'LoyaltyPoints', 'LPT', '2');
            console.log('✅ Contract initialized with name: LoyaltyPoints, symbol: LPT, decimals: 2');
        }

        // 7️⃣ Mint points for store owner (admin)
        console.log('\n🏦 Minting 1000 Loyalty Points for store owner...');
        await contract.submitTransaction('Mint', '1000');
        console.log('✅ Minted 1000 points.');

        const totalSupply = await contract.evaluateTransaction('TotalSupply');
        const storeAccountId = await contract.evaluateTransaction('ClientAccountID');
        const storeBalance = await contract.evaluateTransaction('ClientAccountBalance');

        console.log(`💎 Total Supply: ${totalSupply.toString()}`);
        console.log(`🏪 Store Account ID: ${storeAccountId.toString()}`);
        console.log(`🏪 Store Balance: ${storeBalance.toString()}`);

        // 8️⃣ Register and enroll Customer1 and Customer2 safely
        const customers = ['customer1', 'customer2'];
        for (let cust of customers) {
            let identity = await wallet.get(cust);
            if (!identity) {
                console.log(`\n👤 Registering and enrolling ${cust}...`);
                const adminUser = await wallet.get('admin');
                const provider = wallet.getProviderRegistry().getProvider(adminUser.type);
                const adminUserContext = await provider.getUserContext(adminUser, 'admin');

                try {
                    const secret = await ca.register(
                        { affiliation: 'org1.department1', enrollmentID: cust, role: 'client' },
                        adminUserContext
                    );

                    const enrollment = await ca.enroll({ enrollmentID: cust, enrollmentSecret: secret });
                    identity = {
                        credentials: {
                            certificate: enrollment.certificate,
                            privateKey: enrollment.key.toBytes()
                        },
                        mspId: 'Org1MSP',
                        type: 'X.509',
                    };
                    await wallet.put(cust, identity);
                    console.log(`✅ ${cust} enrolled and added to wallet`);
                } catch (error) {
                    if (error.toString().includes('is already registered')) {
                        console.log(`ℹ️ ${cust} is already registered. Skipping registration.`);
                    } else {
                        throw error;
                    }
                }
            } else {
                console.log(`ℹ️ ${cust} identity already exists in wallet, skipping enrollment.`);
            }
        }

        // 9️⃣ Transfer points from store to customers
        for (let cust of customers) {
            await gateway.disconnect();
            await gateway.connect(ccp, {
                wallet,
                identity: 'admin',
                discovery: { enabled: true, asLocalhost: true },
            });
            const ownerNetwork = await gateway.getNetwork('loyaltychannel');
            const ownerContract = ownerNetwork.getContract('loyaltypoints');

            // Get customer account ID
            await gateway.disconnect();
            await gateway.connect(ccp, { wallet, identity: cust, discovery: { enabled: true, asLocalhost: true } });
            const customerNetwork = await gateway.getNetwork('loyaltychannel');
            const customerContract = customerNetwork.getContract('loyaltypoints');
            const customerAccountId = await customerContract.evaluateTransaction('ClientAccountID');

            // Reconnect as admin to transfer
            await gateway.disconnect();
            await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });
            const adminNetwork = await gateway.getNetwork('loyaltychannel');
            const adminContract = adminNetwork.getContract('loyaltypoints');

            console.log(`\n💸 Transferring 500 points to ${cust}...`);
            await adminContract.submitTransaction('Transfer', customerAccountId.toString(), '500');
            console.log(`✅ Transferred 500 points to ${cust}.`);

            // Show balances
            const finalStoreBalance = await adminContract.evaluateTransaction('ClientAccountBalance');
            const finalCustomerBalance = await adminContract.evaluateTransaction('BalanceOf', customerAccountId.toString());
            console.log(`🏪 Store Balance (after transfer): ${finalStoreBalance}`);
            console.log(`👛 ${cust} Balance: ${finalCustomerBalance}`);
        }

        // 10️⃣ Approval & TransferFrom demo (Customer1 approves store to spend 200 points)
        const cust1 = 'customer1';
        await gateway.disconnect();
        await gateway.connect(ccp, { wallet, identity: cust1, discovery: { enabled: true, asLocalhost: true } });
        const customer1Network = await gateway.getNetwork('loyaltychannel');
        const customer1Contract = customer1Network.getContract('loyaltypoints');
        const cust1AccountId = await customer1Contract.evaluateTransaction('ClientAccountID');

        console.log(`\n🔏 ${cust1} approving store to spend 200 points...`);
        await customer1Contract.submitTransaction('Approve', storeAccountId.toString(), '200');
        console.log('✅ Approval successful.');

        // Store executes TransferFrom
        await gateway.disconnect();
        await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });
        const adminFinalNetwork = await gateway.getNetwork('loyaltychannel');
        const adminFinalContract = adminFinalNetwork.getContract('loyaltypoints');

        await adminFinalContract.submitTransaction('TransferFrom', cust1AccountId.toString(), storeAccountId.toString(), '200');
        console.log('✅ Store deducted 200 points from Customer1 via approval.');

        // Final balances
        const storeFinalBalance = await adminFinalContract.evaluateTransaction('BalanceOf', storeAccountId.toString());
        const customer1FinalBalance = await adminFinalContract.evaluateTransaction('BalanceOf', cust1AccountId.toString());

        console.log(`\n🏁 FINAL STORE BALANCE: ${storeFinalBalance}`);
        console.log(`🏁 FINAL CUSTOMER1 BALANCE: ${customer1FinalBalance}`);

        await gateway.disconnect();
        console.log('\n🎉 Loyalty Points Demo Complete!\n');

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (error.endorsements) console.error('Endorsement errors:', error.endorsements);
        if (error.stack) console.error('Stack:', error.stack);
        process.exit(1);
    }
}

main();
