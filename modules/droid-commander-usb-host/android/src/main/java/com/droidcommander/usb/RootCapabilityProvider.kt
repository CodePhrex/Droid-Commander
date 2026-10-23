package com.droidcommander.usb

import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

/**
 * Root capability adapter. It detects an already-installed root manager and
 * requests a short-lived, scoped grant after the app's consent gate has run.
 * It never installs a root exploit and never accepts arbitrary shell text.
 */
class RootCapabilityProvider {
  private val allowedScopes = setOf(
    "read-protected-metadata",
    "approved-setting-change",
    "training-app-operation",
  )
  private val sessions = mutableMapOf<String, RootSession>()

  fun detect(): Map<String, Any?> {
    val suPath = findSuPath()
    return if (suPath == null) {
      mapOf(
        "availability" to "unavailable",
        "reason" to "No installed root-manager entry point was detected.",
      )
    } else {
      mapOf(
        "availability" to "manager-available",
        "manager" to "installed-root-manager",
        "suPath" to suPath,
        "reason" to "An installed root-manager entry point exists; user approval is still required.",
      )
    }
  }

  fun requestScopedSession(sessionId: String, targetId: String, scopes: List<String>, durationSeconds: Int): Map<String, Any?>? {
    if (sessionId.isBlank() || targetId.isBlank() || scopes.isEmpty() || scopes.any { it !in allowedScopes } || durationSeconds !in 1..900) return null
    val suPath = findSuPath() ?: return null
    val process = try {
      ProcessBuilder(suPath, "-c", "id").redirectErrorStream(true).start()
    } catch (_: Exception) {
      return null
    }
    val output = try {
      val completed = process.waitFor(4, TimeUnit.SECONDS)
      if (!completed) {
        process.destroyForcibly()
        return null
      }
      process.inputStream.bufferedReader().use { it.readText() }
    } catch (_: Exception) {
      return null
    }
    if (process.exitValue() != 0 || !output.contains("uid=0")) return null

    val expiresAt = System.currentTimeMillis() + durationSeconds * 1000L
    sessions[sessionId] = RootSession(targetId, scopes.toSet(), expiresAt)
    return mapOf(
      "sessionId" to sessionId,
      "targetId" to targetId,
      "scopes" to scopes,
      "expiresAt" to iso(expiresAt),
      "manager" to "installed-root-manager",
    )
  }

  fun closeSession(sessionId: String) {
    sessions.remove(sessionId)
  }

  fun executeApprovedOperation(sessionId: String, operationId: String, parameters: Map<String, String>): Map<String, Any?> {
    val session = sessions[sessionId] ?: return mapOf("ok" to false, "message" to "No active root session.")
    if (session.expiresAt <= System.currentTimeMillis()) {
      sessions.remove(sessionId)
      return mapOf("ok" to false, "message" to "Root session expired.")
    }
    if (operationId != "read-protected-metadata" || "read-protected-metadata" !in session.scopes) {
      return mapOf("ok" to false, "message" to "Operation is not bound to an implemented root scope.")
    }
    // Fixed command only. Parameters are intentionally ignored here; callers
    // cannot substitute command text or arguments through this boundary.
    val suPath = findSuPath() ?: return mapOf("ok" to false, "message" to "Root manager unavailable.")
    val process = try { ProcessBuilder(suPath, "-c", "getprop ro.boot.verifiedbootstate").redirectErrorStream(true).start() } catch (_: Exception) { return mapOf("ok" to false, "message" to "Unable to run the reviewed metadata operation.") }
    val completed = process.waitFor(4, TimeUnit.SECONDS)
    if (!completed) {
      process.destroyForcibly()
      return mapOf("ok" to false, "message" to "Reviewed metadata operation timed out.")
    }
    val output = process.inputStream.bufferedReader().use { it.readText().trim() }
    return mapOf("ok" to (process.exitValue() == 0), "message" to "Reviewed protected-metadata operation completed.", "value" to output)
  }

  private fun findSuPath(): String? {
    val candidates = listOf("/system/bin/su", "/system/xbin/su", "/sbin/su", "/product/bin/su")
    return candidates.firstOrNull { File(it).canExecute() }
  }

  private fun iso(epochMs: Long): String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
    timeZone = TimeZone.getTimeZone("UTC")
  }.format(Date(epochMs))

  private data class RootSession(val targetId: String, val scopes: Set<String>, val expiresAt: Long)
}
