/**
 * Dedicated Preset Coordinates Registry for BMR and BPR Documents
 * Allows separate coordinate tuning for BMR and BPR templates without mutual interference.
 */

export const BMR_PRESET_FIELDS = [
  { id: "f_b0", pageIndex: 0, fieldName: "batch_number", label: "BATCH NO", x: 158, y: 134, width: 130, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_m1", pageIndex: 0, fieldName: "mfg_date", label: "MFG DATE", x: 104, y: 226, width: 110, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_e1", pageIndex: 0, fieldName: "expiry_date", label: "EXP DATE", x: 247, y: 227, width: 110, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_i1", pageIndex: 0, fieldName: "issued_by", label: "ISSUED BY", x: 289, y: 389, width: 160, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_d1", pageIndex: 0, fieldName: "issued_date", label: "ISSUED DATE", x: 462, y: 390, width: 100, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_r1", pageIndex: 0, fieldName: "received_by", label: "RECEIVED BY", x: 288, y: 410, width: 160, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_rd1", pageIndex: 0, fieldName: "issued_date", label: "RECEIVED DATE", x: 460, y: 410, width: 100, height: 20, fontSize: 11, isBold: false, color: "#000000" }
];

export const BPR_PRESET_FIELDS = [
  { id: "f_b0", pageIndex: 0, fieldName: "batch_number", label: "BATCH NO", x: 188, y: 134, width: 130, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_m1", pageIndex: 0, fieldName: "mfg_date", label: "MFG DATE", x: 115, y: 245, width: 110, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_e1", pageIndex: 0, fieldName: "expiry_date", label: "EXP DATE", x: 270, y: 245, width: 110, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_i1", pageIndex: 0, fieldName: "issued_by", label: "ISSUED BY", x: 254, y: 406, width: 160, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_d1", pageIndex: 0, fieldName: "issued_date", label: "ISSUED DATE", x: 460, y: 406, width: 100, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_r1", pageIndex: 0, fieldName: "received_by", label: "RECEIVED BY", x: 254, y: 426, width: 160, height: 20, fontSize: 11, isBold: false, color: "#000000" },
  { id: "f_rd1", pageIndex: 0, fieldName: "issued_date", label: "RECEIVED DATE", x: 458, y: 426, width: 100, height: 20, fontSize: 11, isBold: false, color: "#000000" }
];

export function getPresetFields(docType = "BMR") {
  const type = (docType || "BMR").toUpperCase();
  return type === "BPR" ? [...BPR_PRESET_FIELDS] : [...BMR_PRESET_FIELDS];
}
