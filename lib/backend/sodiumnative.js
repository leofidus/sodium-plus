let loaded = false;
let _sodium;
try {
    _sodium = require('sodium-native');
    loaded = true;
} catch (e) {
    _sodium = {};
}
const Backend = require('../backend');
const CryptographyKey = require('../cryptography-key');
const SodiumError = require('../sodium-error');
const Util = require('../util');
const toBuffer = require('typedarray-to-buffer');

module.exports = class SodiumNativeBackend extends Backend {
    constructor(lib) {
        super(lib);
        this.sodium = lib;
        this.backendName = 'SodiumNativeBackend';
    }

    static async init() {
        if (!loaded) {
            throw new SodiumError('sodium-native not installed');
        }
        return new SodiumNativeBackend(_sodium);
    }

    /**
     *
     * @param {String|Buffer} ciphertext
     * @param {String|Buffer} assocData
     * @param {String|Buffer} nonce
     * @param {CryptographyKey} key
     * @return {Promise<Buffer>}
     */
    async crypto_aead_xchacha20poly1305_ietf_decrypt(ciphertext, assocData, nonce, key) {
        let plaintext = Buffer.alloc(ciphertext.length - 16, 0);
        this.sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
            plaintext,
            null,
            await Util.toBuffer(ciphertext),
            await Util.toBuffer(assocData),
            await Util.toBuffer(nonce),
            key.getBuffer()
        );
        return plaintext;
    }

    /**
     *
     * @param {String|Buffer} plaintext
     * @param {String|Buffer} assocData
     * @param {String|Buffer} nonce
     * @param {CryptographyKey} key
     * @return {Promise<Buffer>}
     */
    async crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, assocData, nonce, key) {
        let ciphertext = Buffer.alloc(plaintext.length + 16, 0);
        let kbuf = key.getBuffer();
        this.sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
            ciphertext,
            await Util.toBuffer(plaintext),
            await Util.toBuffer(assocData),
            null,
            await Util.toBuffer(nonce),
            kbuf
        );
        return ciphertext;
    }

    /**
     * @param {String|Buffer} message
     * @param {CryptographyKey} key
     * @return {Promise<buffer>}
     */
    async crypto_auth(message, key) {
        let output = Buffer.alloc(32);
        this.sodium.crypto_auth(
            output,
            await Util.toBuffer(message),
            key.getBuffer()
        );
        return toBuffer(output);
    }

    /**
     * @param {Buffer} mac
     * @param {String|Buffer} message
     * @param {CryptographyKey} key
     * @return {Promise<boolean>}
     */
    async crypto_auth_verify(mac, message, key) {
        return this.sodium.crypto_auth_verify(
            mac,
            await Util.toBuffer(message),
            key.getBuffer()
        );
    }

    /**
     * @param {string|Buffer} plaintext
     * @param {Buffer} nonce
     * @param {CryptographyKey} sk
     * @param {CryptographyKey} pk
     * @return {Promise<Buffer>}
     *
     */
    async crypto_box(plaintext, nonce, sk, pk) {
        let ciphertext = Buffer.alloc(plaintext.length + 16);
        this.sodium.crypto_box_easy(
            ciphertext,
            await Util.toBuffer(plaintext),
            nonce,
            pk.getBuffer(),
            sk.getBuffer()
        );
        return Util.toBuffer(ciphertext);
    }

    /**
     * @param {Buffer} ciphertext
     * @param {Buffer} nonce
     * @param {CryptographyKey} sk
     * @param {CryptographyKey} pk
     * @return {Promise<Buffer>}
     */
    async crypto_box_open(ciphertext, nonce, sk, pk) {
        let plaintext = Buffer.alloc(ciphertext.length - 16);
        let success = this.sodium.crypto_box_open_easy(
            plaintext,
            ciphertext,
            nonce,
            pk.getBuffer(),
            sk.getBuffer()
        );
        if (!success) {
            throw new SodiumError('Decryption failed');
        }
        return Util.toBuffer(plaintext);
    }

    /**
     * @param {string|Buffer} plaintext
     * @param {CryptographyKey} pk
     * @return {Promise<Buffer>}
     *
     */
    async crypto_box_seal(plaintext, pk) {
        let ciphertext = Buffer.alloc(plaintext.length + 48);
        this.sodium.crypto_box_seal(
            ciphertext,
            await Util.toBuffer(plaintext),
            pk.getBuffer()
        );
        return Util.toBuffer(ciphertext);
    }

    /**
     * @param {Buffer} ciphertext
     * @param {CryptographyKey} pk
     * @param {CryptographyKey} sk
     * @return {Promise<Buffer>}
     */
    async crypto_box_seal_open(ciphertext, pk, sk) {
        let plaintext = Buffer.alloc(ciphertext.length - 48);
        let success = this.sodium.crypto_box_seal_open(
            plaintext,
            await Util.toBuffer(ciphertext),
            pk.getBuffer(),
            sk.getBuffer()
        );
        if (!success) {
            throw new SodiumError('Decryption failed');
        }
        return Util.toBuffer(plaintext);
    }

    /**
     * @return {Promise<CryptographyKey>}
     */
    async crypto_box_keypair() {
        let sK = Buffer.alloc(32, 0);
        let pK = Buffer.alloc(32, 0);
        this.sodium.crypto_box_keypair(sK, pK);
        return new CryptographyKey(
            Buffer.concat([pK, sK])
        );
    }

    /**
     * @param {string|Buffer} message
     * @param {CryptographyKey|null} key
     * @param {number} outputLength
     * @return {Promise<Buffer>}
     */
    async crypto_generichash(message, key = null, outputLength = 32) {
        let hash = Buffer.alloc(outputLength, 32);
        if (key) {
            this.sodium.crypto_generichash(hash, await Util.toBuffer(message), key.getBuffer());
        } else {
            this.sodium.crypto_generichash(hash, await Util.toBuffer(message));
        }
        return hash;
    }

    /**
     * @param {CryptographyKey|null} key
     * @param {number} outputLength
     * @return {Promise<Buffer>}
     */
    async crypto_generichash_init(key = null, outputLength = 32) {
        if (key) {
            return this.sodium.crypto_generichash_instance(key.getBuffer(), outputLength);
        }
        return this.sodium.crypto_generichash_instance(null, outputLength);
    }

    /**
     * @param {*} state
     * @param {string|Buffer} message
     * @return {Promise<*>}
     */
    async crypto_generichash_update(state, message) {
        state.update(await Util.toBuffer(message));
        return state;
    }

    /**
     * @param {*} state
     * @param {number} outputLength
     * @return {Promise<Buffer>}
     */
    async crypto_generichash_final(state, outputLength = 32) {
        let output = Buffer.alloc(outputLength);
        state.final(output);
        return output;
    }

    /**
     * @param {number} length
     * @param {number} subKeyId
     * @param {string|Buffer} context
     * @param {CryptographyKey} key
     * @return {Promise<CryptographyKey>}
     */
    async crypto_kdf_derive_from_key(length, subKeyId, context, key) {
        let subkey = Buffer.alloc(length, 0);
        this.sodium.crypto_kdf_derive_from_key(
            subkey,
            subKeyId | 0,
            await Util.toBuffer(context),
            key.getBuffer()
        );
        return new CryptographyKey(subkey);
    }

    /**
     * @param {X25519PublicKey} clientPublicKey
     * @param {X25519SecretKey} clientSecretKey
     * @param {X25519PublicKey} serverPublicKey
     * @return {Promise<CryptographyKey[]>}
     */
    async crypto_kx_client_session_keys(clientPublicKey, clientSecretKey, serverPublicKey) {
        let rx = Buffer.alloc(this.CRYPTO_KX_SESSIONKEYBYTES);
        let tx = Buffer.alloc(this.CRYPTO_KX_SESSIONKEYBYTES);
        this.sodium.crypto_kx_client_session_keys(
            rx,
            tx,
            clientPublicKey.getBuffer(),
            clientSecretKey.getBuffer(),
            serverPublicKey.getBuffer(),
        );
        return [
            new CryptographyKey(rx),
            new CryptographyKey(tx)
        ];
    }

    /**
     * @param {X25519PublicKey} serverPublicKey
     * @param {X25519SecretKey} serverSecretKey
     * @param {X25519PublicKey} clientPublicKey
     * @return {Promise<CryptographyKey[]>}
     */
    async crypto_kx_server_session_keys(serverPublicKey, serverSecretKey, clientPublicKey) {
        let rx = Buffer.alloc(this.CRYPTO_KX_SESSIONKEYBYTES);
        let tx = Buffer.alloc(this.CRYPTO_KX_SESSIONKEYBYTES);
        this.sodium.crypto_kx_server_session_keys(
            rx,
            tx,
            serverPublicKey.getBuffer(),
            serverSecretKey.getBuffer(),
            clientPublicKey.getBuffer(),
        );
        return [
            new CryptographyKey(rx),
            new CryptographyKey(tx)
        ];
    }

    /**
     * @param {string|Buffer} message
     * @param {CryptographyKey} key
     * @return {Promise<Buffer>}
     */
    async crypto_onetimeauth(message, key) {
        let output = Buffer.alloc(16);
        this.sodium.crypto_onetimeauth(
            output,
            await Util.toBuffer(message),
            key.getBuffer()
        );
        return output;
    }

    /**
     * @param {string|Buffer} message
     * @param {CryptographyKey} key
     * @param {Buffer} tag
     * @return {Promise<boolean>}
     */
    async crypto_onetimeauth_verify(message, key, tag) {
        return this.sodium.crypto_onetimeauth_verify(
            tag,
            await Util.toBuffer(message),
            key.getBuffer()
        );
    }

    /**
     * @param {number} length
     * @param {string|Buffer} password
     * @param {Buffer} salt
     * @param {number} opslimit
     * @param {number} memlimit
     * @param {number} algorithm
     * @return {Promise<Buffer>}
     */
    async crypto_pwhash(length, password, salt, opslimit, memlimit, algorithm) {
        let hashed = Buffer.alloc(length, 0);
        this.sodium.crypto_pwhash(
            hashed,
            await Util.toBuffer(password),
            await Util.toBuffer(salt),
            opslimit,
            memlimit,
            algorithm
        );
        return hashed;
    }

    /**
     * @param {string|Buffer} password
     * @param {number} opslimit
     * @param {number} memlimit
     * @param {number} algorithm
     * @return {Promise<string>}
     */
    async crypto_pwhash_str(password, opslimit, memlimit, algorithm) {
        let hashed = Buffer.alloc(128, 0);
        this.sodium.crypto_pwhash_str(
            hashed,
            await Util.toBuffer(password),
            opslimit,
            memlimit,
            algorithm
        );
        return hashed.toString();

    }

    /**
     * @param {string|Buffer} password
     * @param {string|Buffer} hash
     * @return {Promise<boolean>}
     */
    async crypto_pwhash_str_verify(password, hash) {
        return this.sodium.crypto_pwhash_str_verify(
            await Util.toBuffer(hash),
            await Util.toBuffer(password)
        );
    }

    /**
     * @param {string|Buffer} hash
     * @param {number} opslimit
     * @param {number} memlimit
     * @return {Promise<boolean>}
     */
    async crypto_pwhash_str_needs_rehash(hash, opslimit, memlimit) {
        return this.sodium.crypto_pwhash_str_needs_rehash(
            await Util.toBuffer(hash),
            opslimit,
            memlimit
        );
    }

    /**
     * @param {X25519SecretKey} secretKey
     * @param {X25519PublicKey} publicKey
     * @return {Promise<CryptographyKey>}
     */
    async crypto_scalarmult(secretKey, publicKey) {
        let shared = Buffer.alloc(32);
        this.sodium.crypto_scalarmult(shared, secretKey.getBuffer(), publicKey.getBuffer());
        return new CryptographyKey(
            await Util.toBuffer(shared)
        );
    }

    /**
     *
     * @param {CryptographyKey} secretKey
     * @return {Promise<Buffer>}
     */
    async crypto_scalarmult_base(secretKey) {
        let buf = Buffer.alloc(32);
        this.sodium.crypto_scalarmult_base(buf, secretKey.getBuffer());
        return buf;
    }


    /**
     * @param {string|Buffer} plaintext
     * @param {Buffer} nonce
     * @param {CryptographyKey} key
     * @return {Promise<Buffer>}
     */
    async crypto_secretbox(plaintext, nonce, key) {
        let encrypted = Buffer.alloc(plaintext.length + 16);
        this.sodium.crypto_secretbox_easy(
            encrypted,
            await Util.toBuffer(plaintext),
            nonce,
            key.getBuffer()
        );
        return encrypted;
    }

    /**
     * @param {string|Buffer} message
     * @param {CryptographyKey} key
     * @return {Promise<Buffer>}
     */
    async crypto_shorthash(message, key) {
        let output = Buffer.alloc(8);
        this.sodium.crypto_shorthash(
            output,
            await Util.toBuffer(message),
            key.getBuffer()
        );
        return output;
    }

    /**
     * @param {Buffer} ciphertext
     * @param {Buffer} nonce
     * @param {CryptographyKey} key
     * @return {Promise<Buffer>}
     */
    async crypto_secretbox_open(ciphertext, nonce, key) {
        let decrypted = Buffer.alloc(ciphertext.length - 16);
        if (!this.sodium.crypto_secretbox_open_easy(
            decrypted,
            ciphertext,
            nonce,
            key.getBuffer()
        )) {
            throw new SodiumError('Decryption failure');
        }
        return decrypted;
    }

    /**
     * @param {CryptographyKey} key
     * @return {Promise<array>} [state, header]
     */
    async crypto_secretstream_xchacha20poly1305_init_push(key) {
        let state = this.sodium.crypto_secretstream_xchacha20poly1305_state_new();
        let header = Buffer.alloc(this.CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_HEADERBYTES);
        this.sodium.randombytes_buf(header);
        this.sodium.crypto_secretstream_xchacha20poly1305_init_push(state, header, key.getBuffer());
        return [state, header];
    }

    /**
     * @param {Buffer} header
     * @param {CryptographyKey} key
     * @return {Promise<*>} Returns the opaque state object
     */
    async crypto_secretstream_xchacha20poly1305_init_pull(header, key) {
        if (header.length !== this.CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_HEADERBYTES) {
            throw new SodiumError(`Header must be ${this.CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_HEADERBYTES} bytes long`);
        }
        let state = this.sodium.crypto_secretstream_xchacha20poly1305_state_new();
        this.sodium.crypto_secretstream_xchacha20poly1305_init_pull(state, header, key.getBuffer());
        return state;
    }

    /**
     * @param {*} state
     * @param {string|Buffer} message
     * @param {string|Buffer} ad
     * @param {number} tag
     * @return {Promise<Buffer>}
     */
    async crypto_secretstream_xchacha20poly1305_push(state, message, ad = '', tag = 0) {
        let ciphertext = Buffer.alloc(message.length + this.CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_ABYTES);
        this.sodium.crypto_secretstream_xchacha20poly1305_push(
            state,
            ciphertext,
            await Util.toBuffer(message),
            ad.length > 0 ? (await Util.toBuffer(ad)) : null,
            Buffer.from([tag])
        );
        return ciphertext;
    }

    /**
     * @param {*} state
     * @param {Buffer} ciphertext
     * @param {string|Buffer} ad
     * @param {number} tag
     * @return {Promise<Buffer>}
     */
    async crypto_secretstream_xchacha20poly1305_pull(state, ciphertext, ad = '', tag = 0) {
        if (ciphertext.length < this.CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_ABYTES) {
            throw new SodiumError('Invalid ciphertext size');
        }
        let plaintext = Buffer.alloc(ciphertext.length - this.CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_ABYTES);
        this.sodium.crypto_secretstream_xchacha20poly1305_pull(
            state,
            plaintext,
            tag,
            ciphertext,
            ad.length > 0 ? (await Util.toBuffer(ad)) : null
        );
        return plaintext;
    }

    /**
     * @param {*} state
     * @return {Promise<void>}
     */
    async crypto_secretstream_xchacha20poly1305_rekey(state) {
        this.sodium.crypto_secretstream_xchacha20poly1305_rekey(state);
    }

    /**
     * @param {string|Buffer} message,
     * @param {Ed25519SecretKey} secretKey
     * @return {Promise<Buffer>}
     */
    async crypto_sign(message, secretKey) {
        let signed = Buffer.alloc(message.length + 64);
        this.sodium.crypto_sign(signed, await Util.toBuffer(message), secretKey.getBuffer());
        return signed;
    }

    /**
     * @param {Buffer} signedMessage,
     * @param {Ed25519PublicKey} publicKey
     * @return {Promise<Buffer>}
     */
    async crypto_sign_open(signedMessage, publicKey) {
        let original = Buffer.alloc(signedMessage.length - 64);
        this.sodium.crypto_sign_open(original, await Util.toBuffer(signedMessage), publicKey.getBuffer());
        return original;
    }

    /**
     * @param {string|Buffer} message,
     * @param {Ed25519SecretKey} secretKey
     * @return {Promise<Buffer>}
     */
    async crypto_sign_detached(message, secretKey) {
        let signature = Buffer.alloc(64);
        this.sodium.crypto_sign_detached(signature, await Util.toBuffer(message), secretKey.getBuffer());
        return signature;
    }

    /**
     * @param {string|Buffer} message,
     * @param {Ed25519PublicKey} publicKey
     * @param {Buffer} signature
     * @return {Promise<Buffer>}
     */
    async crypto_sign_verify_detached(message, publicKey, signature) {
        return this.sodium.crypto_sign_verify_detached(
            signature,
            await Util.toBuffer(message),
            publicKey.getBuffer()
        );
    }

    /**
     * @return {Promise<CryptographyKey>}
     */
    async crypto_sign_keypair() {
        let sK = Buffer.alloc(64, 0);
        let pK = Buffer.alloc(32, 0);
        this.sodium.crypto_sign_keypair(pK, sK);
        return new CryptographyKey(
            Buffer.concat([sK, pK])
        );
    }

    /**
     * @param {Ed25519SecretKey} sk
     * @return {Promise<Buffer>}
     */
    async crypto_sign_ed25519_sk_to_curve25519(sk) {
        let xsk = Buffer.alloc(32);
        this.sodium.crypto_sign_ed25519_sk_to_curve25519(xsk, sk.getBuffer());
        return xsk;
    }

    /**
     * @param {Ed25519PublicKey} pk
     * @return {Promise<Buffer>}
     */
    async crypto_sign_ed25519_pk_to_curve25519(pk) {
        let xpk = Buffer.alloc(32);
        this.sodium.crypto_sign_ed25519_pk_to_curve25519(xpk, pk.getBuffer());
        return xpk;
    }

    /**
     * @param {number} length
     * @param {Buffer} nonce
     * @param {CryptographyKey} key
     * @return {Promise<Buffer>}
     */
    async crypto_stream(length, nonce, key) {
        let output = Buffer.alloc(length);
        this.sodium.crypto_stream(
            output,
            await Util.toBuffer(nonce),
            key.getBuffer()
        );
        return output;
    }

    /**
     * @param {string|Buffer} plaintext
     * @param {Buffer} nonce
     * @param {CryptographyKey} key
     * @return {Promise<Buffer>}
     */
    async crypto_stream_xor(plaintext, nonce, key) {
        let output = Buffer.alloc(plaintext.length);
        this.sodium.crypto_stream_xor(
            output,
            await Util.toBuffer(plaintext),
            await Util.toBuffer(nonce),
            key.getBuffer()
        );
        return output;
    }

    /**
     * @param {number} number
     * @return {Promise<Buffer>}
     */
    async randombytes_buf(number) {
        let buf = Buffer.alloc(number);
        this.sodium.randombytes_buf(buf);
        return buf;
    }

    /**
     * @param {number} upperBound
     * @return {Promise<number>}
     */
    async randombytes_uniform(upperBound) {
        return this.sodium.randombytes_uniform(upperBound);
    }

    /**
     * @param {Uint8Array} val
     * @param {Uint8Array} addv
     * @return {Promise<Buffer>}
     */
    async sodium_add(val, addv) {
        let buf = await Util.cloneBuffer(val);
        this.sodium.sodium_add(buf, addv);
        return buf;
    }

    /**
     * @param {Buffer} b1
     * @param {Buffer} b2
     * @return {Promise<number>}
     */
    async sodium_compare(b1, b2) {
        return this.sodium.sodium_compare(b1, b2);
    }

    /**
     * @param {Buffer} buf
     * @return {Promise<Buffer>}
     */
    async sodium_increment(buf) {
        return this.sodium.sodium_increment(buf);
    }

    /**
     * @param {Buffer} buf
     * @param {number} len
     * @return {Promise<Buffer>}
     */
    async sodium_is_zero(buf, len) {
        return this.sodium.sodium_is_zero(buf, len);
    }

    /**
     * @param {Buffer} b1
     * @param {Buffer} b2
     * @return {Promise<boolean>}
     */
    async sodium_memcmp(b1, b2) {
        return this.sodium.sodium_memcmp(b1, b2);
    }

    /**
     * @param {Buffer} buf
     * @return {Promise<void>}
     */
    async sodium_memzero(buf) {
        this.sodium.sodium_memzero(buf);
    }

    /**
     * @param {string|Buffer} buf
     * @param {number} blockSize
     * @return {Promise<Buffer>}
     */
    async sodium_pad(buf, blockSize) {
        buf = await Util.toBuffer(buf);
        let length = buf.length + (buf.length % blockSize);
        if (length < blockSize) {
            length += blockSize;
        }
        let padded = Buffer.alloc(length + 100);
        buf.copy(padded, 0, 0);
        let sliceto = this.sodium.sodium_pad(padded, buf.length, blockSize);
        return padded.slice(0, sliceto);
    }

    /**
     *
     * @param {string|Buffer} buf
     * @param {number} blockSize
     * @return {Promise<Buffer>}
     */
    async sodium_unpad(buf, blockSize) {
        let outlen = this.sodium.sodium_unpad(buf, buf.length, blockSize);
        return buf.slice(0, outlen);
    }
};
