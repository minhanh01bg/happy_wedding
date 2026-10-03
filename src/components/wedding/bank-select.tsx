import type { SelectHTMLAttributes } from "react";
import { BANKS } from "@/lib/banks";

export function BankSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const selected = String(props.value ?? props.defaultValue ?? "");
  return (
    <select {...props}>
      <option value="">Không hiển thị tài khoản</option>
      {selected && !BANKS.some((bank) => bank.bin === selected) && (
        <option value={selected}>Ngân hàng đã lưu ({selected})</option>
      )}
      {BANKS.map((bank) => (
        <option key={bank.bin} value={bank.bin}>
          {bank.name}
        </option>
      ))}
    </select>
  );
}
