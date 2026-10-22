
export function formatDateTime(date) {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Blantyre",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}
