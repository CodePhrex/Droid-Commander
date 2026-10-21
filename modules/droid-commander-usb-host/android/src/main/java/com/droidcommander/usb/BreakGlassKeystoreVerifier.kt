package com.droidcommander.usb

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.io.ByteArrayInputStream
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Signature
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec

/**
 * Verifies organization-signed recovery material and stores the verified envelope
 * encrypted with a key held by Android Keystore. It never contains a universal
 * password or a private organization signing key.
 */
class BreakGlassKeystoreVerifier(context: Context) {
  private val appContext = context.applicationContext
  private val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
  private val preferences: SharedPreferences = appContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

  fun provisionTrustAnchor(issuerId: String, keyId: String, certificateBase64: String): Boolean {
    if (issuerId.isBlank() || keyId.isBlank()) return false
    return try {
      val certificate = decodeCertificate(certificateBase64)
      if (certificate.publicKey.algorithm !in SUPPORTED_KEY_TYPES) return false
      keyStore.setCertificateEntry(trustAlias(issuerId, keyId), certificate)
      true
    } catch (_: Exception) {
      false
    }
  }

  fun verifyBreakGlassSignature(payload: String, signatureBase64: String, issuerId: String, keyId: String): Boolean {
    if (payload.isBlank() || signatureBase64.isBlank() || issuerId.isBlank() || keyId.isBlank()) return false
    return try {
      val certificate = keyStore.getCertificate(trustAlias(issuerId, keyId)) as? X509Certificate ?: return false
      val signature = Signature.getInstance(signatureAlgorithm(certificate))
      signature.initVerify(certificate.publicKey)
      signature.update(payload.toByteArray(StandardCharsets.UTF_8))
      signature.verify(Base64.decode(signatureBase64, Base64.DEFAULT))
    } catch (_: Exception) {
      false
    }
  }

  fun provisionBreakGlassCredential(credentialJson: String): Boolean {
    return try {
      val json = org.json.JSONObject(credentialJson)
      if (json.optString("credentialType") != "break-glass-admin") return false
      val payload = json.optString("signedPayload")
      val signature = json.optString("signature")
      val issuerId = json.optString("issuerId")
      val keyId = json.optString("trustKeyId")
      if (!verifyBreakGlassSignature(payload, signature, issuerId, keyId)) return false
      encryptedPreferences().edit().putString(CREDENTIAL_KEY, encrypt(credentialJson)).apply()
      true
    } catch (_: Exception) {
      false
    }
  }

  fun hasProvisionedBreakGlassCredential(): Boolean = encryptedPreferences().contains(CREDENTIAL_KEY)

  fun clearProvisionedBreakGlassCredential() {
    encryptedPreferences().edit().remove(CREDENTIAL_KEY).apply()
  }

  private fun encryptedPreferences(): SharedPreferences = preferences

  private fun encrypt(plaintext: String): String {
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, encryptionKey())
    val ciphertext = cipher.doFinal(plaintext.toByteArray(StandardCharsets.UTF_8))
    val combined = ByteArray(cipher.iv.size + ciphertext.size)
    System.arraycopy(cipher.iv, 0, combined, 0, cipher.iv.size)
    System.arraycopy(ciphertext, 0, combined, cipher.iv.size, ciphertext.size)
    return Base64.encodeToString(combined, Base64.NO_WRAP)
  }

  private fun encryptionKey(): java.security.Key {
    if (!keyStore.containsAlias(ENCRYPTION_ALIAS)) {
      val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
      generator.init(
        KeyGenParameterSpec.Builder(
          ENCRYPTION_ALIAS,
          KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
          .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
          .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
          .setRandomizedEncryptionRequired(true)
          .build(),
      )
      generator.generateKey()
    }
    return (keyStore.getEntry(ENCRYPTION_ALIAS, null) as KeyStore.SecretKeyEntry).secretKey
  }

  private fun decodeCertificate(certificateBase64: String): X509Certificate {
    val bytes = Base64.decode(certificateBase64, Base64.DEFAULT)
    return CertificateFactory.getInstance("X.509").generateCertificate(ByteArrayInputStream(bytes)) as X509Certificate
  }

  private fun signatureAlgorithm(certificate: X509Certificate): String = when (certificate.publicKey.algorithm) {
    KeyProperties.KEY_ALGORITHM_EC -> "SHA256withECDSA"
    KeyProperties.KEY_ALGORITHM_RSA -> "SHA256withRSA"
    else -> throw IllegalArgumentException("Unsupported trust-anchor key type")
  }

  private fun trustAlias(issuerId: String, keyId: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest("$issuerId:$keyId".toByteArray(StandardCharsets.UTF_8))
    return "droidcmd.trust." + digest.joinToString("") { byte -> "%02x".format(byte) }
  }

  companion object {
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val PREFERENCES = "droidcmd.breakglass.secure"
    private const val CREDENTIAL_KEY = "encryptedCredential"
    private const val ENCRYPTION_ALIAS = "droidcmd.breakglass.aes"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private val SUPPORTED_KEY_TYPES = setOf(KeyProperties.KEY_ALGORITHM_EC, KeyProperties.KEY_ALGORITHM_RSA)
  }
}
