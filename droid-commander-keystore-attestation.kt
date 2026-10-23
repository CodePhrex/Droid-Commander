package com.droidcommander.keystore

import android.content.Context
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.cert.X509Certificate
import java.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DroidCommanderKeystoreModule : Module() {
    private val KEY_ALIAS_BREAK_GLASS = "DroidCommander_BreakGlass_Key"
    private val KEY_ALIAS_LEDGER_SIGNER = "DroidCommander_LedgerSigner_Key"
    private val ANDROID_KEYSTORE = "AndroidKeyStore"

    override fun definition() = ModuleDefinition {
        Name("DroidCommanderKeystore")

        // Initialize and generate hardware-backed EC keypair
        AsyncFunction("generateHardwareKeyPair") { alias: String, requireStrongBox: Boolean ->
            generateECKeyPair(alias, requireStrongBox)
        }

        // Sign payload with hardware-backed key inside TEE / StrongBox
        AsyncFunction("signPayload") { alias: String, payloadBase64: String ->
            signPayloadWithKey(alias, payloadBase64)
        }

        // Get Attestation Certificate Chain for public key verification
        AsyncFunction("getAttestationCertificateChain") { alias: String ->
            getCertificateChain(alias)
        }

        // Check if StrongBox Keymaster is supported on hardware
        Function("isStrongBoxSupported") {
            isStrongBoxAvailable()
        }
    }

    private fun generateECKeyPair(alias: String, requireStrongBox: Boolean): Map<String, Any> {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        
        if (!keyStore.containsAlias(alias)) {
            val keyPairGenerator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC,
                ANDROID_KEYSTORE
            )

            val builder = KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
            )
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setAlgorithmParameterSpec(java.security.spec.ECGenParameterSpec("secp256r1"))
                .setUserAuthenticationRequired(false)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && requireStrongBox && isStrongBoxAvailable()) {
                builder.setIsStrongBoxBacked(true)
            }

            keyPairGenerator.initialize(builder.build())
            keyPairGenerator.generateKeyPair()
        }

        val cert = keyStore.getCertificate(alias) as? X509Certificate
        val publicKeyPem = Base64.getEncoder().encodeToString(cert?.publicKey?.encoded ?: byteArrayOf())

        return mapOf(
            "alias" to alias,
            "publicKeyBase64" to publicKeyPem,
            "isStrongBoxBacked" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && requireStrongBox && isStrongBoxAvailable())
        )
    }

    private fun signPayloadWithKey(alias: String, payloadBase64: String): String {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val privateKey = keyStore.getKey(alias, null) as? java.security.PrivateKey
            ?: throw IllegalStateException("Key alias $alias not found in Android Keystore")

        val dataToSign = Base64.getDecoder().decode(payloadBase64)
        val signature = Signature.getInstance("SHA256withECDSA").apply {
            initSign(privateKey)
            update(dataToSign)
        }

        return Base64.getEncoder().encodeToString(signature.sign())
    }

    private fun getCertificateChain(alias: String): List<String> {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val certChain = keyStore.getCertificateChain(alias)
            ?: throw IllegalStateException("No certificate chain found for alias $alias")

        return certChain.map { cert ->
            Base64.getEncoder().encodeToString(cert.encoded)
        }
    }

    private fun isStrongBoxAvailable(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            context.packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_STRONGBOX_KEYSTORE)
        } else {
            false
        }
    }

    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React Context unavailable")
}
