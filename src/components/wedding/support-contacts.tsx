import type { MerchantSettings } from "@/lib/wedding";

export function SupportContacts({
  settings,
}: {
  settings: Pick<MerchantSettings, "support" | "supportPhone" | "supportEmail">;
}) {
  return (
    <div className="support-contacts">
      {settings.support && <p>{settings.support}</p>}
      <div className="inline-actions">
        {settings.supportPhone && (
          <a className="text-link" href={`tel:${settings.supportPhone}`}>
            Gọi hỗ trợ: {settings.supportPhone}
          </a>
        )}
        {settings.supportEmail && (
          <a className="text-link" href={`mailto:${settings.supportEmail}`}>
            Email: {settings.supportEmail}
          </a>
        )}
      </div>
    </div>
  );
}
