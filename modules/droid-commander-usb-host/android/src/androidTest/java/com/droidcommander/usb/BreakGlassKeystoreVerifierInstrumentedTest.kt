package com.droidcommander.usb

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BreakGlassKeystoreVerifierInstrumentedTest {
  private lateinit var verifier: BreakGlassKeystoreVerifier

  @Before
  fun setUp() {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    verifier = BreakGlassKeystoreVerifier(context)
    verifier.clearProvisionedBreakGlassCredential()
  }

  @After
  fun tearDown() {
    verifier.clearProvisionedBreakGlassCredential()
  }

  @Test
  fun rejectsMalformedTrustAnchorAndCredentialBeforeVerification() {
    assertFalse(verifier.provisionTrustAnchor("", "", "not-a-certificate"))
    assertFalse(verifier.verifyBreakGlassSignature("payload", "signature", "issuer", "key"))
    assertFalse(verifier.provisionBreakGlassCredential("{\"credentialType\":\"break-glass-admin\"}"))
    assertFalse(verifier.hasProvisionedBreakGlassCredential())
  }

  @Test
  fun clearProvisionedCredentialIsIdempotent() {
    verifier.clearProvisionedBreakGlassCredential()
    verifier.clearProvisionedBreakGlassCredential()
    assertFalse(verifier.hasProvisionedBreakGlassCredential())
  }
}
