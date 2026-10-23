import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { palette } from "@/constants/commander";
import {
  assessDamagedDevice,
  canExecuteRecoveryAction,
  createRecoveryServiceManifest,
  formatRecoveryManifestMarkdown,
  recordOwnerConfirmation,
  type DamagedDeviceProfile,
  type HardwareState,
  type LockState,
  type RecoveryAction,
  type RecoveryServiceManifest,
} from "@/lib/damaged-device-recovery";

const HARDWARE_OPTIONS: HardwareState[] = ["working", "failed", "unknown"];
const LOCK_OPTIONS: LockState[] = ["unlocked", "locked", "unknown"];

function CycleChip<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  return (
    <Pressable
      onPress={() => {
        const idx = options.indexOf(value);
        onChange(options[(idx + 1) % options.length]);
      }}
      style={styles.chip}
    >
      <Text style={styles.chipText}>{value.toUpperCase()}</Text>
    </Pressable>
  );
}

export default function RecoveryHandoffScreen() {
  const [targetId, setTargetId] = useState("lab-handset-damaged");
  const [operatorId, setOperatorId] = useState("");
  const [clientName, setClientName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [profile, setProfile] = useState<DamagedDeviceProfile>({
    targetId: "lab-handset-damaged",
    display: "failed",
    touch: "failed",
    physicalButtons: "working",
    fingerprint: "unknown",
    faceAuthentication: "unknown",
    lockState: "locked",
    usbHostAvailable: true,
    adbAuthorized: false,
    deviceOwnerManaged: false,
    enterpriseRecoveryConfigured: false,
  });

  const [manifest, setManifest] = useState<RecoveryServiceManifest | null>(null);
  const [selectedAction, setSelectedAction] = useState<RecoveryAction | null>(null);
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [destructiveConfirmed, setDestructiveConfirmed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const assessment = useMemo(
    () => assessDamagedDevice({ ...profile, targetId }),
    [profile, targetId],
  );

  const selectedOption = assessment.options.find((o) => o.action === selectedAction);

  function startManifest() {
    if (!operatorId.trim() || purpose.trim().length < 8) return;
    const m = createRecoveryServiceManifest({
      targetId,
      operatorId: operatorId.trim(),
      clientName: clientName.trim() || undefined,
      purpose: purpose.trim(),
      profile: { ...profile, targetId },
      assessment,
    });
    setManifest(m);
  }

  function openConfirm(action: RecoveryAction) {
    setSelectedAction(action);
    setOwnerConfirmed(false);
    setDestructiveConfirmed(false);
    setConfirmOpen(true);
  }

  function applyConfirmation() {
    if (!manifest || !selectedAction || !selectedOption) return;
    const gate = canExecuteRecoveryAction(assessment, selectedAction, {
      targetId,
      ownerConfirmed,
      destructiveConfirmed,
    });
    if (!gate.allowed) return;

    const updated = recordOwnerConfirmation(manifest, selectedAction, {
      ownerConfirmed,
      destructiveConfirmed,
    });
    setManifest(updated);
    setConfirmOpen(false);
  }

  async function shareManifest() {
    if (!manifest) return;
    const body = formatRecoveryManifestMarkdown(manifest);
    await Share.share({ message: body, title: "Damaged Device Service Manifest" });
  }

  return (
    <ScreenContainer containerClassName="bg-[#F5F3EE]" safeAreaClassName="bg-[#F5F3EE]">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Command Center</Text>
        </Pressable>

        <Text style={styles.kicker}>RECOVERY // OWNER-OPERATED</Text>
        <Text style={styles.title}>Damaged / malfunctioning device handoff</Text>
        <Text style={styles.subtitle}>
          Assessment and documentation only. Every path requires the owner to act on the device
          itself. This app never unlocks, enables ADB, extracts credentials, or performs factory
          reset.
        </Text>

        {/* Session identity */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>SERVICE SESSION</Text>
          <Text style={styles.inputLabel}>TARGET ID</Text>
          <TextInput
            value={targetId}
            onChangeText={(t) => {
              setTargetId(t);
              setProfile((p) => ({ ...p, targetId: t }));
            }}
            style={styles.input}
            placeholder="e.g. lab-handset-damaged"
            placeholderTextColor="#9AA5A7"
          />
          <Text style={styles.inputLabel}>OPERATOR ID</Text>
          <TextInput
            value={operatorId}
            onChangeText={setOperatorId}
            style={styles.input}
            placeholder="Your technician ID"
            placeholderTextColor="#9AA5A7"
          />
          <Text style={styles.inputLabel}>CLIENT NAME (optional)</Text>
          <TextInput
            value={clientName}
            onChangeText={setClientName}
            style={styles.input}
            placeholder="Client or ticket reference"
            placeholderTextColor="#9AA5A7"
          />
          <Text style={styles.inputLabel}>PURPOSE (required)</Text>
          <TextInput
            value={purpose}
            onChangeText={setPurpose}
            style={[styles.input, { minHeight: 64 }]}
            multiline
            placeholder="Why this recovery session exists"
            placeholderTextColor="#9AA5A7"
          />
        </View>

        {/* Hardware profile */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>OBSERVED HARDWARE STATE</Text>
          {(
            [
              ["display", "Display"],
              ["touch", "Touch"],
              ["physicalButtons", "Physical buttons"],
              ["fingerprint", "Fingerprint"],
              ["faceAuthentication", "Face authentication"],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <CycleChip
                value={profile[key]}
                options={HARDWARE_OPTIONS}
                onChange={(v) => setProfile((p) => ({ ...p, [key]: v }))}
              />
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Lock state</Text>
            <CycleChip
              value={profile.lockState}
              options={LOCK_OPTIONS}
              onChange={(v) => setProfile((p) => ({ ...p, lockState: v }))}
            />
          </View>
          {(
            [
              ["usbHostAvailable", "USB host available"],
              ["adbAuthorized", "ADB already authorized"],
              ["deviceOwnerManaged", "Device-owner managed"],
              ["enterpriseRecoveryConfigured", "Enterprise recovery configured"],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Switch
                value={profile[key]}
                onValueChange={(v) => setProfile((p) => ({ ...p, [key]: v }))}
                trackColor={{ true: palette.orange, false: "#D0D7D5" }}
              />
            </View>
          ))}
        </View>

        {/* Assessment */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>SAFE OPTIONS (PLANNER)</Text>
          {assessment.blockedReasons.length > 0 && (
            <View style={styles.blockedBox}>
              {assessment.blockedReasons.map((r) => (
                <Text key={r} style={styles.blockedText}>
                  • {r}
                </Text>
              ))}
            </View>
          )}
          {assessment.options.map((opt) => (
            <View
              key={opt.action}
              style={[styles.optionCard, !opt.available && styles.optionDisabled]}
            >
              <View style={styles.optionTop}>
                <Text style={styles.optionTitle}>{opt.manifestLabel}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: opt.available ? palette.greenSoft : "#EEF1F1" },
                  ]}
                >
                  <Text
                    style={{
                      color: opt.available ? palette.green : palette.muted,
                      fontSize: 8,
                      fontWeight: "900",
                    }}
                  >
                    {opt.available ? "AVAILABLE" : "UNAVAILABLE"}
                  </Text>
                </View>
              </View>
              <Text style={styles.optionReason}>{opt.reason}</Text>
              <Text style={styles.handoffLabel}>OWNER HANDOFF</Text>
              <Text style={styles.handoffText}>{opt.ownerHandoff}</Text>
              {opt.available && (
                <Pressable
                  onPress={() => openConfirm(opt.action)}
                  style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.confirmBtnText}>
                    {opt.destructive ? "Record destructive handoff…" : "Record owner confirmation…"}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {/* Manifest controls */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>SERVICE MANIFEST</Text>
          {!manifest ? (
            <Pressable
              onPress={startManifest}
              disabled={!operatorId.trim() || purpose.trim().length < 8}
              style={({ pressed }) => [
                styles.primaryBtn,
                (!operatorId.trim() || purpose.trim().length < 8) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>Open service manifest</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.manifestMeta}>ID · {manifest.manifestId}</Text>
              <Text style={styles.manifestMeta}>
                Confirmations · {manifest.entries.filter((e) => e.ownerConfirmed).length} /{" "}
                {manifest.entries.length}
              </Text>
              <Pressable
                onPress={shareManifest}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryBtnText}>Share / export manifest</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={styles.footer}>
          Authentication bypass available: never. All actions are owner-operated handoffs only.
        </Text>
      </ScrollView>

      {/* Confirmation modal */}
      <Modal visible={confirmOpen} transparent animationType="slide" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.handle} />
            <Text style={styles.kicker}>OWNER CONFIRMATION</Text>
            <Text style={styles.modalTitle}>{selectedOption?.manifestLabel}</Text>
            <Text style={styles.modalBody}>{selectedOption?.ownerHandoff}</Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Owner is present and confirms this handoff</Text>
              <Switch
                value={ownerConfirmed}
                onValueChange={setOwnerConfirmed}
                trackColor={{ true: palette.orange, false: "#D0D7D5" }}
              />
            </View>

            {selectedOption?.destructive && (
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: palette.red }]}>
                  I understand this destroys user data and is irreversible
                </Text>
                <Switch
                  value={destructiveConfirmed}
                  onValueChange={setDestructiveConfirmed}
                  trackColor={{ true: palette.red, false: "#D0D7D5" }}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setConfirmOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={
                  !ownerConfirmed ||
                  (selectedOption?.destructive && !destructiveConfirmed) ||
                  !manifest
                }
                onPress={applyConfirmation}
                style={[
                  styles.modalPrimary,
                  (!ownerConfirmed ||
                    (selectedOption?.destructive && !destructiveConfirmed) ||
                    !manifest) &&
                    styles.disabled,
                ]}
              >
                <Text style={styles.modalPrimaryText}>Record in manifest</Text>
              </Pressable>
            </View>
            {!manifest && (
              <Text style={styles.hint}>Open a service manifest first so the confirmation is documented.</Text>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  back: { marginBottom: 12 },
  backText: { color: palette.orange, fontWeight: "800", fontSize: 13 },
  kicker: { color: palette.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: palette.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.8, marginTop: 6 },
  subtitle: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 18 },
  card: {
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionLabel: { color: palette.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1, marginBottom: 12 },
  inputLabel: { color: palette.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.8, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: palette.ink,
    fontSize: 14,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  rowLabel: { color: palette.ink, fontSize: 13, fontWeight: "700", flex: 1 },
  chip: { backgroundColor: palette.orangeSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: palette.orange, fontSize: 10, fontWeight: "900" },
  blockedBox: { backgroundColor: "#FCECEB", borderRadius: 10, padding: 10, marginBottom: 12 },
  blockedText: { color: palette.red, fontSize: 12, lineHeight: 17 },
  optionCard: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  optionDisabled: { opacity: 0.55 },
  optionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionTitle: { color: palette.ink, fontSize: 13, fontWeight: "800", flex: 1, paddingRight: 8 },
  statusPill: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  optionReason: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 8 },
  handoffLabel: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 0.8, marginTop: 10 },
  handoffText: { color: palette.ink, fontSize: 12, lineHeight: 17, marginTop: 4 },
  confirmBtn: {
    marginTop: 12,
    backgroundColor: palette.navy,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  confirmBtnText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  primaryBtn: {
    backgroundColor: palette.orange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#FFF", fontSize: 14, fontWeight: "900" },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: palette.orange, fontSize: 13, fontWeight: "900" },
  manifestMeta: { color: palette.muted, fontSize: 12, marginBottom: 4 },
  footer: { color: palette.muted, fontSize: 10, textAlign: "center", marginTop: 8 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.82 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(16,42,59,0.5)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: palette.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  handle: { width: 40, height: 4, borderRadius: 3, backgroundColor: "#C6CFCC", alignSelf: "center", marginBottom: 18 },
  modalTitle: { color: palette.ink, fontSize: 22, fontWeight: "800", marginTop: 6 },
  modalBody: { color: palette.muted, fontSize: 13, lineHeight: 18, marginTop: 8, marginBottom: 16 },
  switchRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  switchLabel: { flex: 1, color: palette.ink, fontSize: 13, fontWeight: "700", paddingRight: 12 },
  modalActions: { flexDirection: "row", marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 11,
    alignItems: "center",
    paddingVertical: 12,
    marginRight: 8,
  },
  cancelText: { color: palette.muted, fontWeight: "900" },
  modalPrimary: {
    flex: 1,
    backgroundColor: palette.orange,
    borderRadius: 11,
    alignItems: "center",
    paddingVertical: 12,
  },
  modalPrimaryText: { color: "#FFF", fontWeight: "900" },
  hint: { color: palette.muted, fontSize: 11, marginTop: 10, textAlign: "center" },
});
