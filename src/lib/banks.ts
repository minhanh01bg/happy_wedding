// Public bank directory verified against https://api.vietqr.io/v2/banks on 2026-10-03.
export const BANKS = [
  {
    bin: "970425",
    name: "ABBANK",
  },
  {
    bin: "970416",
    name: "ACB",
  },
  {
    bin: "970405",
    name: "Agribank",
  },
  {
    bin: "970409",
    name: "BacABank",
  },
  {
    bin: "970438",
    name: "BaoVietBank",
  },
  {
    bin: "970418",
    name: "BIDV",
  },
  {
    bin: "546034",
    name: "CAKE",
  },
  {
    bin: "422589",
    name: "CIMB",
  },
  {
    bin: "970446",
    name: "COOPBANK",
  },
  {
    bin: "970431",
    name: "Eximbank",
  },
  {
    bin: "970437",
    name: "HDBank",
  },
  {
    bin: "668888",
    name: "KBank",
  },
  {
    bin: "970452",
    name: "KienLongBank",
  },
  {
    bin: "970449",
    name: "LPBank",
  },
  {
    bin: "970422",
    name: "MBBank",
  },
  {
    bin: "970414",
    name: "MBV",
  },
  {
    bin: "971025",
    name: "MoMo",
  },
  {
    bin: "970426",
    name: "MSB",
  },
  {
    bin: "970428",
    name: "NamABank",
  },
  {
    bin: "970419",
    name: "NCB",
  },
  {
    bin: "970448",
    name: "OCB",
  },
  {
    bin: "970430",
    name: "PGBank",
  },
  {
    bin: "970412",
    name: "PVcomBank",
  },
  {
    bin: "971133",
    name: "PVcomBank Pay",
  },
  {
    bin: "970403",
    name: "Sacombank",
  },
  {
    bin: "970400",
    name: "SaigonBank",
  },
  {
    bin: "970429",
    name: "SCB",
  },
  {
    bin: "970440",
    name: "SeABank",
  },
  {
    bin: "970443",
    name: "SHB",
  },
  {
    bin: "970424",
    name: "ShinhanBank",
  },
  {
    bin: "970407",
    name: "Techcombank",
  },
  {
    bin: "963388",
    name: "Timo",
  },
  {
    bin: "970423",
    name: "TPBank",
  },
  {
    bin: "546035",
    name: "Ubank",
  },
  {
    bin: "970441",
    name: "VIB",
  },
  {
    bin: "970427",
    name: "VietABank",
  },
  {
    bin: "970433",
    name: "VietBank",
  },
  {
    bin: "970454",
    name: "VietCapitalBank",
  },
  {
    bin: "970436",
    name: "Vietcombank",
  },
  {
    bin: "970415",
    name: "VietinBank",
  },
  {
    bin: "970432",
    name: "VPBank",
  },
  {
    bin: "970457",
    name: "Woori",
  },
] as const;
export function bankName(bin: string) {
  return BANKS.find((bank) => bank.bin === bin)?.name ?? `Ngân hàng ${bin}`;
}
