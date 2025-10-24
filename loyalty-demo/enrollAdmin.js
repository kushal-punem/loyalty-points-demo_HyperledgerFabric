const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

async function enrollAdmin() {
    try {
        const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const adminIdentity = await wallet.get('admin');
        if (adminIdentity) {
            console.log('Admin identity already exists in wallet.');
            return;
        }

        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const ca = new FabricCAServices(caURL);
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const identity = {
            credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
            mspId: 'Org1MSP', type: 'X.509'
        };
        await wallet.put('admin', identity);
        console.log('Admin enrolled and stored in wallet.');
    } catch (error) {
        console.error('Error enrolling admin:', error.message);
        if (error.stack) console.error('Stack:', error.stack);
        process.exit(1);
    }
}

enrollAdmin();