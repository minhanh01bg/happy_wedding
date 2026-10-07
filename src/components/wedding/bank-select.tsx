"use client";
import type { ComponentProps } from "react";
import { BANKS } from "@/lib/banks";
import { DropdownField } from "@/components/kit/dropdown-field";

type BankSelectProps = Omit<ComponentProps<typeof DropdownField>, "options">;
export function BankSelect(props: BankSelectProps) {
  const selected = props.value ?? props.defaultValue ?? "";
  return (
    <DropdownField
      placeholder="Không hiển thị tài khoản"
      {...props}
      options={[
        { value: "", label: "Không hiển thị tài khoản" },
        ...(selected && !BANKS.some((bank) => bank.bin === selected)
          ? [{ value: selected, label: `Ngân hàng đã lưu (${selected})` }]
          : []),
        ...BANKS.map((bank) => ({ value: bank.bin, label: bank.name })),
      ]}
    />
  );
}
