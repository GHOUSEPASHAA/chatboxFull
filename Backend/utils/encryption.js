const forge = require('node-forge');

function generateKeys() {
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    return {
        publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
        privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
    };
}

const encryptMessage = (content, publicKeyPem) => {
    try {
        const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
        const encrypted = publicKey.encrypt(forge.util.encodeUtf8(content), 'RSA-OAEP');
        return forge.util.encode64(encrypted);
    } catch (error) {
        console.error('Encryption error:', error.message);
        throw error;
    }
};

module.exports = { generateKeys, encryptMessage };